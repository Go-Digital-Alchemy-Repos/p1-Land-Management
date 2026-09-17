import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { pool } from "./database";
const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw Error("Disposable local server required");
after(() => pool.end());
test(
  "Sales history paginates beyond 200 with exact timestamps, literal filters and fresh authorization",
  { skip: !base },
  async () => {
    const actor = randomUUID(),
      token = randomUUID(),
      tag = randomUUID();
    await pool.query(
      'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
      [actor, "Owner " + tag, actor + "@example.test"],
    );
    await pool.query(
      "INSERT INTO staff_profile(user_id,role) VALUES($1,'member')",
      [actor],
    );
    await pool.query(
      "INSERT INTO business_account_access(user_id,capabilities) VALUES($1,ARRAY['revenue.sales'])",
      [actor],
    );
    await pool.query(
      'INSERT INTO session(id,token,"userId","expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')',
      [randomUUID(), token, actor],
    );
    const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
      .update(token)
      .digest("base64");
    const headers = {
      cookie:
        "p1-dashboard.session_token=" +
        encodeURIComponent(token + "." + signature),
    };
    const call = (params: Record<string, string> = {}) =>
      fetch(base + "/api/v1/sales/inquiries?" + new URLSearchParams(params), {
        headers,
      });
    await pool.query(
      `INSERT INTO lead(id,name,email,phone,location,description,created_at,inquiry_type,owner_id,status,next_action_due_at,reported_company_name)
 SELECT gen_random_uuid(), $1||' record '||n, 'contact-'||n||'@example.test', 'phone-'||n, 'site-'||n, 'Private description',
 '2030-01-01T00:00:00Z'::timestamptz + (n/2)*interval '1 microsecond',
 CASE WHEN n%2=0 THEN 'commercial_site_assessment' ELSE 'general' END,
 CASE WHEN n%2=0 THEN $2 ELSE NULL END,
 CASE WHEN n%3=0 THEN 'won' WHEN n%3=1 THEN 'lost' ELSE 'new' END,
 now()-interval '1 day','company-'||n FROM generate_series(1,235) n`,
      [tag, actor],
    );
    const expected = (
      await pool.query(
        "SELECT id FROM lead WHERE name LIKE $1 ORDER BY created_at DESC,id DESC",
        [tag + "%"],
      )
    ).rows.map((r) => r.id);
    const seen: string[] = [];
    let cursor: string | undefined,
      firstCursor = "";
    do {
      const r = await call({
        q: tag,
        limit: "17",
        ...(cursor ? { cursor } : {}),
      });
      assert.equal(r.status, 200);
      assert.equal(r.headers.get("cache-control"), "private, no-store");
      const page = (await r.json()) as any;
      seen.push(...page.items.map((r: any) => r.id));
      assert(
        page.items.every(
          (r: any) =>
            !("cursor_at" in r) && !("raw_payload" in r) && !("password" in r),
        ),
      );
      cursor = page.nextCursor;
      if (!firstCursor && cursor) {
        firstCursor = cursor;
        const payload = JSON.parse(Buffer.from(cursor, "base64url").toString());
        assert.match(payload.at, /\.\d{6}Z$/);
        assert(!JSON.stringify(payload).includes(tag));
        await pool.query(
          "UPDATE lead SET status='contacted',version=version+1 WHERE id=$1",
          [page.items[0].id],
        );
      }
    } while (cursor);
    assert.equal(seen.length, 235);
    assert.deepEqual(seen, expected);
    for (const params of [
      { q: tag, limit: "101" },
      { q: tag, cursor: "bad" },
      { q: "different", cursor: firstCursor },
      { q: tag, status: "invalid" },
      { q: tag, overdue: "false" },
      { q: tag, unknown: "x" },
    ] as Array<Record<string, string>>)
      assert.equal((await call(params)).status, 400);
    for (const kind of ["commercial", "general"]) {
      const page = (await (
        await call({ q: tag, kind, limit: "100" })
      ).json()) as any;
      assert(page.items.length > 0);
      assert(
        page.items.every(
          (r: any) =>
            (r.inquiry_type === "commercial_site_assessment") ===
            (kind === "commercial"),
        ),
      );
    }
    const overdue = (await (
      await call({ q: tag, overdue: "true", limit: "100" })
    ).json()) as any;
    assert(overdue.items.length > 0);
    assert(
      overdue.items.every((r: any) => !["won", "lost"].includes(r.status)),
    );
    const assigned = (await (
      await call({ q: tag, ownerId: actor, limit: "100" })
    ).json()) as any;
    assert(assigned.items.length > 0);
    assert(assigned.items.every((r: any) => r.owner_id === actor));
    const unassigned = (await (
      await call({ q: tag, ownerId: "unassigned", limit: "100" })
    ).json()) as any;
    assert(unassigned.items.length > 0);
    assert(unassigned.items.every((r: any) => r.owner_id === null));
    for (const q of [
      "contact-235@EXAMPLE.TEST",
      "phone-235",
      "site-235",
      "company-235",
    ]) {
      const page = (await (await call({ q })).json()) as any;
      assert.equal(page.items.length, 1);
    }
    const ownerSearch = (await (
      await call({ q: "Owner " + tag })
    ).json()) as any;
    assert(ownerSearch.items.length > 0);
    assert(ownerSearch.items.every((r: any) => r.owner_id === actor));
    const literal = tag + " %_\\";
    await pool.query(
      "INSERT INTO lead(id,name,email,location,description) VALUES(gen_random_uuid(),$1,'literal@example.test','test','test')",
      [literal],
    );
    assert.equal(
      ((await (await call({ q: literal })).json()) as any).items.length,
      1,
    );
    const stage = (await (await call({ q: tag, status: "won" })).json()) as any;
    assert(stage.items.every((r: any) => r.status === "won"));
    await pool.query(
      "UPDATE business_account_access SET capabilities=ARRAY['customers.clients'] WHERE user_id=$1",
      [actor],
    );
    assert.equal((await call()).status, 403);
    await pool.query("UPDATE staff_profile SET role='owner' WHERE user_id=$1", [
      actor,
    ]);
    assert.equal((await call({ q: tag })).status, 200);
    await pool.query("UPDATE staff_profile SET active=false WHERE user_id=$1", [
      actor,
    ]);
    assert.equal((await call()).status, 403);
  },
);
