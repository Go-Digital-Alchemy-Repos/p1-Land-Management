import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { pool } from "./database";
const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw new Error("Isolated test origin required");
after(() => pool.end());
test(
  "owner recovery status reflects enrollment and this session's assurance without weakening access",
  { skip: !base },
  async () => {
    const uid = randomUUID(),
      sid = randomUUID(),
      token = randomUUID();
    await pool.query(
      'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
      [uid, "Synthetic recovery", uid + "@example.test"],
    );
    await pool.query(
      "INSERT INTO staff_profile(user_id,role) VALUES($1,'owner')",
      [uid],
    );
    await pool.query(
      'INSERT INTO session(id,"expiresAt",token,"userId") VALUES($1,now()+interval \'1 hour\',$2,$3)',
      [sid, token, uid],
    );
    const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
      .update(token)
      .digest("base64");
    const headers = {
      cookie:
        "p1-dashboard.session_token=" +
        encodeURIComponent(token + "." + signature),
    };
    async function get(path: string) {
      return fetch(base + "/api/v1" + path, { headers });
    }
    async function required(value: boolean) {
      const r = await get("/me");
      assert.equal(r.status, 200);
      const status = (await r.json()) as { ownerMfaRequired: boolean };
    assert.equal(status.ownerMfaRequired, value);
    }
    try {
      await required(true);
      assert.equal((await get("/clients")).status, 403);
      await pool.query(
        'UPDATE "user" SET "twoFactorEnabled"=true WHERE id=$1',
        [uid],
      );
      await required(true);
      assert.equal((await get("/clients")).status, 403);
      await pool.query("INSERT INTO session_assurance(session_id) VALUES($1)", [
        sid,
      ]);
      await required(false);
      assert.equal((await get("/clients")).status, 200);
      await pool.query("DELETE FROM session_assurance WHERE session_id=$1", [
        sid,
      ]);
      await required(true);
      assert.equal((await get("/clients")).status, 403);
      await pool.query(
        "UPDATE staff_profile SET role='manager' WHERE user_id=$1",
        [uid],
      );
      await required(false);
      assert.equal((await get("/clients")).status, 200);
      await pool.query(
        "UPDATE session SET \"expiresAt\"=now()-interval '1 minute' WHERE id=$1",
        [sid],
      );
      assert.equal((await get("/me")).status, 401);
    } finally {
      await pool.query("DELETE FROM staff_profile WHERE user_id=$1", [uid]);
      await pool.query('DELETE FROM "user" WHERE id=$1', [uid]);
    }
  },
);
