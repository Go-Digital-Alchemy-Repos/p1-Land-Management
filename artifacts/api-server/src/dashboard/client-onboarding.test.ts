import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./database";

const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw new Error("Client onboarding tests require an isolated local server");
after(() => pool.end());

test(
  "client onboarding creates the business and primary contact atomically and supports versioned edits",
  { skip: !base },
  async () => {
    const userId = randomUUID();
    const sessionId = randomUUID();
    const token = randomUUID();
    const cookie =
      "p1-dashboard.session_token=" +
      encodeURIComponent(
        token +
          "." +
          createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
            .update(token)
            .digest("base64"),
      );
    const headers = {
      cookie,
      origin: base!,
      "content-type": "application/json",
    };
    let clientId = "";
    try {
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
        [userId, "Onboarding owner", userId + "@example.test"],
      );
      await pool.query(
        "INSERT INTO staff_profile(user_id,role) VALUES($1,'owner')",
        [userId],
      );
      await pool.query(
        'INSERT INTO session(id,token,"userId","expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')',
        [sessionId, token, userId],
      );
      const created = await fetch(base + "/api/v1/clients", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Pine Ridge Holdings",
          address: "123 Fieldstone Road, York, SC 29745",
          phone: "803-555-0199",
          primaryContact: {
            firstName: "Avery",
            lastName: "Morgan",
            email: "avery@pineridge.example",
            position: "Facilities Director",
            phone: "803-555-0110",
          },
        }),
      });
      assert.equal(created.status, 201);
      const result = (await created.json()) as {
        id: string;
        primaryContactId: string;
        version: number;
      };
      clientId = result.id;
      assert.equal(result.version, 1);
      const row = (
        await pool.query(
          "SELECT c.name,c.billing_address,c.phone,c.version,p.name AS contact_name,p.first_name,p.last_name,p.email,p.phone AS contact_phone,p.position,p.kind FROM client c JOIN contact p ON p.id=$1 WHERE c.id=$2",
          [result.primaryContactId, clientId],
        )
      ).rows[0];
      assert.deepEqual(row, {
        name: "Pine Ridge Holdings",
        billing_address: "123 Fieldstone Road, York, SC 29745",
        phone: "803-555-0199",
        version: 1,
        contact_name: "Avery Morgan",
        first_name: "Avery",
        last_name: "Morgan",
        email: "avery@pineridge.example",
        contact_phone: "803-555-0110",
        position: "Facilities Director",
        kind: "primary",
      });
      const clients = await fetch(base + "/api/v1/clients", { headers });
      assert.equal(clients.status, 200);
      const listed = ((await clients.json()) as Array<Record<string, unknown>>).find(
        (client) => client.id === clientId,
      );
      assert.equal(listed?.primary_contact_name, "Avery Morgan");
      assert.equal(listed?.primary_contact_position, "Facilities Director");

      const changed = await fetch(base + "/api/v1/clients/" + clientId, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Pine Ridge Holdings, LLC",
          address: "127 Fieldstone Road, York, SC 29745",
          phone: "803-555-0122",
          email: null,
          version: 1,
          primaryContact: {
            firstName: "Avery",
            lastName: "Morgan",
            email: "avery.morgan@pineridge.example",
            position: "Director of Operations",
            phone: "803-555-0123",
          },
        }),
      });
      if (changed.status !== 200) assert.fail(await changed.text());
      assert.equal(changed.status, 200);
      assert.equal(((await changed.json()) as { version: number }).version, 2);
      const stale = await fetch(base + "/api/v1/clients/" + clientId, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Stale write",
          address: "127 Fieldstone Road, York, SC 29745",
          phone: "803-555-0122",
          email: null,
          version: 1,
          primaryContact: {
            firstName: "Avery",
            lastName: "Morgan",
            email: "avery.morgan@pineridge.example",
            position: "Director of Operations",
            phone: "803-555-0123",
          },
        }),
      });
      assert.equal(stale.status, 409);
      const contacts = await fetch(
        base + "/api/v1/clients/" + clientId + "/contacts",
        { headers },
      );
      assert.equal(contacts.status, 200);
      assert.equal(
        ((await contacts.json()) as Array<{ position: string | null }>)[0]
          .position,
        "Director of Operations",
      );
    } finally {
      if (clientId) {
        await pool.query("DELETE FROM audit_event WHERE entity_id=$1", [clientId]);
        await pool.query(
          "DELETE FROM audit_event WHERE entity_id IN (SELECT id::text FROM contact WHERE client_id=$1)",
          [clientId],
        );
        await pool.query("DELETE FROM contact WHERE client_id=$1", [clientId]);
        await pool.query("DELETE FROM client WHERE id=$1", [clientId]);
      }
      await pool.query("DELETE FROM staff_profile WHERE user_id=$1", [userId]);
      await pool.query("DELETE FROM audit_event WHERE user_id=$1", [userId]);
      await pool.query('DELETE FROM "user" WHERE id=$1', [userId]);
    }
  },
);
