import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./database";
const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw Error("Isolated local server required");
after(() => pool.end());
test(
  "Sales notes enforce grants, preserve append-only history and safely replay concurrent writes",
  { skip: !base },
  async () => {
    const owner = randomUUID(),
      staff = randomUUID(),
      client = randomUUID(),
      lead = randomUUID(),
      otherLead = randomUUID();
    const headers = new Map<string, Record<string, string>>();
    for (const [id, role] of [
      [owner, "owner"],
      [staff, "member"],
      [client, "client"],
    ]) {
      const token = randomUUID();
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
        [id, role, id + "@example.test"],
      );
      await pool.query(
        "INSERT INTO staff_profile(user_id,role) VALUES($1,$2)",
        [id, role],
      );
      await pool.query(
        'INSERT INTO session(id,token,"userId","expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')',
        [randomUUID(), token, id],
      );
      const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
        .update(token)
        .digest("base64");
      headers.set(id, {
        cookie:
          "p1-dashboard.session_token=" +
          encodeURIComponent(token + "." + signature),
        origin: base!,
        "content-type": "application/json",
      });
    }
    await pool.query(
      "INSERT INTO lead(id,name,email,location,description) VALUES($1,'Test','lead@example.test','Test','Test'),($2,'Other','other@example.test','Test','Test')",
      [lead, otherLead],
    );
    const call = (
      who: string,
      method = "GET",
      body?: unknown,
      key = lead,
      query = "",
    ) =>
      fetch(`${base}/api/v1/leads/${key}/notes${query}`, {
        method,
        headers: headers.get(who),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    assert.equal((await call(client)).status, 403);
    assert.equal((await call(staff)).status, 403);
    await pool.query(
      "INSERT INTO business_account_access(user_id,capabilities) VALUES($1,$2)",
      [staff, ["revenue.sales"]],
    );
    const note = {
      id: randomUUID(),
      body: "  Literal <script>do not execute</script>\nFollow up  ",
    };
    const responses = await Promise.all([
      call(staff, "POST", note),
      call(staff, "POST", note),
    ]);
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 201]);
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM lead_note WHERE id=$1",
          [note.id],
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM audit_event WHERE entity_id=$1 AND action='lead_note.created'",
          [note.id],
        )
      ).rows[0].n,
      1,
    );
    assert.equal((await call(owner, "POST", note)).status, 409);
    assert.equal(
      (await call(staff, "POST", { ...note, body: "Changed" })).status,
      409,
    );
    assert.equal((await call(staff, "POST", note, otherLead)).status, 409);
    assert.equal(
      (
        await call(staff, "POST", {
          id: randomUUID(),
          body: "",
          authorId: owner,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call(staff, "POST", {
          id: randomUUID(),
          body: "fake provenance",
          source_note_id: "fake",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call(
          staff,
          "POST",
          { id: randomUUID(), body: "missing" },
          randomUUID(),
        )
      ).status,
      404,
    );
    await assert.rejects(
      pool.query("UPDATE lead_note SET body=$2 WHERE id=$1", [
        note.id,
        "mutated",
      ]),
      /append-only/,
    );
    await assert.rejects(
      pool.query("DELETE FROM lead_note WHERE id=$1", [note.id]),
      /append-only/,
    );
    await assert.rejects(
      pool.query("INSERT INTO lead_note(id,lead_id,body) VALUES($1,$2,$3)", [
        randomUUID(),
        lead,
        "No author/provenance",
      ]),
      /lead_note_origin/,
    );
    const historical = randomUUID();
    await pool.query(
      "INSERT INTO lead_note(id,lead_id,body,source_instance_id,source_note_id,source_author_id,created_at) VALUES($1,$2,'Historical note','synthetic-source','old-note','deleted-user','2020-01-01T00:00:00.000001Z')",
      [historical, lead],
    );
    await assert.rejects(
      pool.query(
        "INSERT INTO lead_note(id,lead_id,body,source_instance_id,source_note_id) VALUES($1,$2,'Duplicate','synthetic-source','old-note')",
        [randomUUID(), lead],
      ),
      /unique/,
    );
    // More than a full page within one millisecond: cursors must retain microseconds.
    for (let i = 1; i <= 105; i++)
      await pool.query(
        "INSERT INTO lead_note(id,lead_id,author_id,body,created_at) VALUES($1,$2,$3,$4,'2021-01-01T00:00:00Z'::timestamptz+$5*interval '1 microsecond')",
        [randomUUID(), lead, owner, "Note " + i, i],
      );
    const seen: string[] = [];
    let cursor: string | null = null,
      firstCursor = "";
    do {
      const response = await call(
        staff,
        "GET",
        undefined,
        lead,
        "?limit=30" + (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
      );
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      const page = (await response.json()) as {
        items: Array<{
          id: string;
          authorName: string | null;
          imported: boolean;
        }>;
        nextCursor: string | null;
      };
      seen.push(...page.items.map((n: { id: string }) => n.id));
      cursor = page.nextCursor;
      if (!firstCursor && cursor) firstCursor = cursor;
      const old = page.items.find((n: { id: string }) => n.id === historical);
      if (old) {
        assert.equal(old.authorName, null);
        assert.equal(old.imported, true);
        assert.equal("source_author_id" in old, false);
      }
    } while (cursor);
    assert.equal(seen.length, 107);
    assert.equal(new Set(seen).size, 107);
    assert.equal(
      (
        await call(
          staff,
          "GET",
          undefined,
          otherLead,
          "?cursor=" + encodeURIComponent(firstCursor),
        )
      ).status,
      400,
    );
    assert.equal(
      (await call(staff, "GET", undefined, lead, "?limit=101")).status,
      400,
    );
    await pool.query(
      "UPDATE business_account_access SET capabilities='{}' WHERE user_id=$1",
      [staff],
    );
    assert.equal((await call(staff)).status, 403);
    assert.equal((await call(staff, "POST", note)).status, 403);
  },
);
