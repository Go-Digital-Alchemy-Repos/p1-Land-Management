import { createHash, randomBytes } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { FederationError, createFederationClient, type Grant } from "./federation-client";
import {
  readBootstrapProofConfig,
  verifyBootstrapProof,
  type BootstrapProofConfig,
} from "./federation-bootstrap-proof";
export const opaque = () => randomBytes(32).toString("base64url");
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const validOpaque = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{43,128}$/.test(value);
function deny(status = 401, code = "federation_state_invalid"): never {
  throw new FederationError(status, code);
}
type Client = ReturnType<typeof createFederationClient>;
export function createFederationConsumer(
  pool: Pool,
  provider: Client,
  bootstrap: () => BootstrapProofConfig | null = () => readBootstrapProofConfig(process.env),
) {
  async function tx<T>(work: (c: PoolClient) => Promise<T>) {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const result = await work(c);
      await c.query("COMMIT");
      return result;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  async function audit(
    c: Pool | PoolClient,
    action: string,
    outcome: string,
    user?: string,
    subject?: string,
    link?: string,
  ) {
    await c.query(
      "INSERT INTO p1_federation_audit(action,outcome,core_user_id,canonical_user_id,link_id) VALUES($1,$2,$3,$4,$5)",
      [action, outcome, user ?? null, subject ?? null, link ?? null],
    );
  }
  async function history(user: string, c: Pool | PoolClient = pool) {
    return (await c.query("SELECT * FROM p1_identity_link WHERE core_user_id=$1", [user])).rows[0];
  }
  async function cleanup() {
    await pool.query("DELETE FROM p1_federation_state WHERE expires_at<=now()");
    await pool.query("DELETE FROM p1_federation_intent WHERE expires_at<=now()");
    await pool.query("DELETE FROM p1_federation_session WHERE expires_at<=now()");
  }
  async function makeIntent(
    kind: "bootstrap" | "link" | "confirm",
    payload: unknown,
    nonce: string,
  ) {
    const token = opaque();
    await pool.query(
      "INSERT INTO p1_federation_intent(token_hash,nonce_hash,kind,payload,expires_at) VALUES($1,$2,$3,$4,now()+interval '10 minutes')",
      [digest(token), digest(nonce), kind, payload],
    );
    return token;
  }
  async function consumeIntent(token: unknown, nonce: unknown, kind?: string) {
    if (!validOpaque(token) || !validOpaque(nonce)) deny();
    // DELETE consumes an issued intent even when a terminal validation fails.
    const row = (
      await pool.query("DELETE FROM p1_federation_intent WHERE token_hash=$1 RETURNING *", [
        digest(token),
      ])
    ).rows[0];
    if (
      !row ||
      row.nonce_hash !== digest(nonce) ||
      new Date(row.expires_at).getTime() <= Date.now() ||
      (kind && row.kind !== kind)
    )
      deny();
    return row;
  }
  async function session(c: PoolClient, link: any, grant: Grant) {
    const token = opaque();
    await c.query(
      "INSERT INTO p1_federation_session(token_hash,link_id,grant_id,expires_at) VALUES($1,$2,$3,$4)",
      [digest(token), link.id, grant.grantId, grant.expiresAt],
    );
    return token;
  }
  async function local(c: Pool | PoolClient, id: string) {
    const u = (await c.query("SELECT * FROM users WHERE id=$1", [id])).rows[0];
    if (!u || u.is_suspended || !["admin", "editor"].includes(u.role))
      deny(403, "federation_local_access_denied");
    return u;
  }
  async function linkedSession(grant: Grant) {
    return tx(async (c) => {
      const link = (
        await c.query("SELECT * FROM p1_identity_link WHERE canonical_user_id=$1 FOR UPDATE", [
          grant.subject,
        ])
      ).rows[0];
      if (!link || link.revoked_at) deny(403, "federation_link_required");
      await local(c, link.core_user_id);
      const token = await session(c, link, grant);
      await audit(c, "session.created", "accepted", link.core_user_id, grant.subject, link.id);
      return token;
    });
  }
  return {
    history,
    cleanup,
    async bootstrapIntent(proof: unknown, nonce: string) {
      let cfg: BootstrapProofConfig | null;
      try {
        cfg = bootstrap();
      } catch {
        deny(403, "bootstrap_unavailable");
      }
      if (!verifyBootstrapProof(cfg!, proof)) deny(403, "bootstrap_unavailable");
      if (
        (
          await pool.query(
            "SELECT 1 FROM users WHERE role='admin' UNION ALL SELECT 1 FROM p1_federation_bootstrap_consumption WHERE id=$1 LIMIT 1",
            [cfg!.id],
          )
        ).rowCount
      )
        deny(403, "bootstrap_unavailable");
      return makeIntent("bootstrap", { bootstrapId: cfg!.id, proofHash: cfg!.proofHash }, nonce);
    },
    async linkIntent(userId: string, nonce: string) {
      await local(pool, userId);
      if (await history(userId)) deny(403, "federation_link_exists");
      return makeIntent("link", { coreUserId: userId }, nonce);
    },
    async start(nonce: string, intent?: string) {
      await cleanup();
      const record = intent ? await consumeIntent(intent, nonce) : undefined;
      if (record && !["bootstrap", "link"].includes(record.kind)) deny();
      const state = opaque(),
        verifier = opaque();
      await pool.query(
        "INSERT INTO p1_federation_state(state_hash,nonce_hash,verifier,kind,payload,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '10 minutes')",
        [digest(state), digest(nonce), verifier, record?.kind || "login", record?.payload || {}],
      );
      return { state, challenge: createHash("sha256").update(verifier).digest("base64url") };
    },
    async callback(state: unknown, nonce: unknown, code: unknown) {
      if (!validOpaque(state)) deny();
      const row = (
        await pool.query("DELETE FROM p1_federation_state WHERE state_hash=$1 RETURNING *", [
          digest(state),
        ])
      ).rows[0];
      if (
        !row ||
        !validOpaque(nonce) ||
        row.nonce_hash !== digest(nonce) ||
        new Date(row.expires_at).getTime() <= Date.now() ||
        !validOpaque(code)
      )
        deny();
      const issued = await provider.exchange(code, row.verifier);
      const grant = await provider.introspect(issued.grantId, row.kind === "bootstrap");
      if (issued.subject !== grant.subject) deny(401, "federation_subject_mismatch");
      if (row.kind === "login") return { session: await linkedSession(grant) };
      if (row.kind === "link") {
        await local(pool, row.payload.coreUserId);
        if (await history(row.payload.coreUserId)) deny(403, "federation_link_exists");
        const confirmationNonce = opaque();
        return {
          nonce: confirmationNonce,
          confirmation: await makeIntent(
            "confirm",
            { coreUserId: row.payload.coreUserId, grant },
            confirmationNonce,
          ),
        };
      }
      return tx(async (c) => {
        await c.query("SELECT pg_advisory_xact_lock(194616,2)");
        let cfg: BootstrapProofConfig | null;
        try {
          cfg = bootstrap();
        } catch {
          deny(403, "bootstrap_unavailable");
        }
        if (
          !cfg! ||
          cfg!.expiresAt.getTime() <= Date.now() ||
          cfg!.id !== row.payload.bootstrapId ||
          cfg!.proofHash !== row.payload.proofHash
        )
          deny(403, "bootstrap_unavailable");
        if (
          (
            await c.query(
              "SELECT 1 FROM users WHERE role='admin' UNION ALL SELECT 1 FROM p1_federation_bootstrap_consumption WHERE id=$1 LIMIT 1",
              [cfg!.id],
            )
          ).rowCount
        )
          deny(409, "bootstrap_already_completed");
        // Attestation is refreshed under the serialization lock immediately before creation.
        const fresh = await provider.introspect(grant.grantId, true);
        if (fresh.subject !== grant.subject) deny();
        const user = (
          await c.query(
            "INSERT INTO users(email,password,first_name,last_name,role) VALUES($1,$2,$3,'','admin') RETURNING id",
            [fresh.email, opaque() + opaque(), fresh.name],
          )
        ).rows[0];
        const link = (
          await c.query(
            "INSERT INTO p1_identity_link(core_user_id,canonical_user_id,initial_grant_id) VALUES($1,$2,$3) RETURNING *",
            [user.id, fresh.subject, fresh.grantId],
          )
        ).rows[0];
        await c.query(
          "INSERT INTO p1_federation_bootstrap_consumption(id,proof_hash,core_user_id) VALUES($1,$2,$3)",
          [cfg!.id, cfg!.proofHash, user.id],
        );
        await audit(c, "bootstrap.completed", "accepted", user.id, fresh.subject, link.id);
        return { session: await session(c, link, fresh) };
      });
    },
    async confirmation(token: unknown, nonce: unknown) {
      if (!validOpaque(token) || !validOpaque(nonce)) deny();
      const row = (
        await pool.query(
          "SELECT * FROM p1_federation_intent WHERE token_hash=$1 AND nonce_hash=$2 AND kind='confirm' AND expires_at>now()",
          [digest(token), digest(nonce)],
        )
      ).rows[0];
      if (!row) deny();
      const u = await local(pool, row.payload.coreUserId);
      return { localEmail: u.email, canonicalEmail: row.payload.grant.email };
    },
    async confirm(token: unknown, nonce: unknown) {
      const row = await consumeIntent(token, nonce, "confirm"),
        grant = await provider.introspect(row.payload.grant.grantId);
      if (grant.subject !== row.payload.grant.subject) deny();
      return tx(async (c) => {
        await c.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [row.payload.coreUserId]);
        await local(c, row.payload.coreUserId);
        if (await history(row.payload.coreUserId, c)) deny(409, "federation_link_exists");
        const link = (
          await c.query(
            "INSERT INTO p1_identity_link(core_user_id,canonical_user_id,initial_grant_id) VALUES($1,$2,$3) RETURNING *",
            [row.payload.coreUserId, grant.subject, grant.grantId],
          )
        ).rows[0];
        // Invalidate all pre-link local JWTs and password-reset capabilities.
        await c.query("UPDATE users SET password=$2,updated_at=now() WHERE id=$1", [
          row.payload.coreUserId,
          opaque() + opaque(),
        ]);
        await audit(c, "link.created", "accepted", row.payload.coreUserId, grant.subject, link.id);
        return session(c, link, grant);
      });
    },
    async authenticate(token: unknown) {
      if (!validOpaque(token)) deny(401, "federation_session_inactive");
      const s = (
        await pool.query(
          "SELECT s.*,l.core_user_id,l.canonical_user_id,l.revoked_at FROM p1_federation_session s JOIN p1_identity_link l ON l.id=s.link_id WHERE token_hash=$1 AND expires_at>now()",
          [digest(token)],
        )
      ).rows[0];
      if (!s) deny(401, "federation_session_inactive");
      if (s.revoked_at) deny(403, "federation_local_access_denied");
      await local(pool, s.core_user_id);
      const grant = await provider.introspect(s.grant_id);
      if (grant.subject !== s.canonical_user_id) deny(401, "federation_subject_mismatch");
      return s.core_user_id as string;
    },
    async logout(token: unknown) {
      if (validOpaque(token))
        await pool.query("DELETE FROM p1_federation_session WHERE token_hash=$1", [digest(token)]);
    },
  };
}
