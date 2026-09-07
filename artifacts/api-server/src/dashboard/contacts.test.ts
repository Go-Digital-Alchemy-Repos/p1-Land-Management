import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { pool } from "./database";
import { listContacts, saveContact } from "./contacts";
const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw new Error("Contact tests require an isolated local server");
after(() => pool.end());
test(
  "contacts preserve history, isolate client writes and reject stale concurrent edits",
  { skip: !base },
  async () => {
    const userId = randomUUID(),
      clientId = randomUUID(),
      otherId = randomUUID();
    await pool.query('INSERT INTO "user"(id,name,email) VALUES($1,$2,$3)', [
      userId,
      "Contact test",
      "contact-" + userId + "@example.test",
    ]);
    await pool.query("INSERT INTO client(id,name) VALUES($1,$2),($3,$4)", [
      clientId,
      "Contact client",
      otherId,
      "Other client",
    ]);
    const input = {
      name: "Billing contact",
      kind: "billing" as const,
      email: null,
      phone: null,
    };
    const saved = await saveContact(userId, clientId, input);
    assert.equal(saved.version, 1);
    assert.equal(saved.email, null);
    assert.equal((await listContacts(clientId)).length, 1);
    assert.equal((await listContacts(otherId)).length, 0);
    await assert.rejects(
      () =>
        saveContact(userId, otherId, input, {
          id: saved.id,
          version: 1,
          archived: false,
        }),
      /Contact changed/,
    );
    const contenders = await Promise.allSettled(
      ["First edit", "Second edit"].map((name) =>
        saveContact(
          userId,
          clientId,
          { ...input, name },
          { id: saved.id, version: 1, archived: false },
        ),
      ),
    );
    assert.equal(contenders.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(contenders.filter((r) => r.status === "rejected").length, 1);
    const current = (await listContacts(clientId))[0];
    const archived = await saveContact(
      userId,
      clientId,
      { ...input, name: current.name },
      { id: saved.id, version: 2, archived: true },
    );
    assert.equal(archived.archived, true);
    assert.equal((await listContacts(clientId)).length, 1);
    assert.equal(
      (
        await pool.query(
          "SELECT count(*) FROM audit_event WHERE entity_id=$1",
          [saved.id],
        )
      ).rows[0].count,
      "3",
    );
    const anonymous = await fetch(
      base + "/api/v1/clients/" + clientId + "/contacts",
    );
    assert.equal(anonymous.status, 401);
    for (const role of ["crew", "client", "finance"] as const) {
      const identity = randomUUID(),
        token = randomUUID();
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
        [identity, role, identity + "@example.test"],
      );
      await pool.query(
        "INSERT INTO staff_profile(user_id,role) VALUES($1,$2)",
        [identity, role],
      );
      await pool.query(
        'INSERT INTO session(id,token,"userId","expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')',
        [randomUUID(), token, identity],
      );
      const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
        .update(token)
        .digest("base64");
      const cookie =
        "p1-dashboard.session_token=" +
        encodeURIComponent(token + "." + signature);
      const headers = {
        cookie,
        origin: base!,
        "Content-Type": "application/json",
      };
      assert.equal(
        (await fetch(base + "/api/v1/me", { headers })).status,
        200,
        "Synthetic fixture must be authenticated",
      );
      const read = await fetch(
        base + "/api/v1/clients/" + clientId + "/contacts",
        { headers },
      );
      const create = await fetch(
        base + "/api/v1/clients/" + clientId + "/contacts",
        { method: "POST", headers, body: JSON.stringify(input) },
      );
      const update = await fetch(
        base + "/api/v1/clients/" + clientId + "/contacts/" + saved.id,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ ...input, version: 3, archived: true }),
        },
      );
      assert.equal(read.status, role === "finance" ? 200 : 403);
      assert.equal(create.status, role === "finance" ? 201 : 403);
      assert.equal(update.status, role === "finance" ? 200 : 403);
    }
  },
);
