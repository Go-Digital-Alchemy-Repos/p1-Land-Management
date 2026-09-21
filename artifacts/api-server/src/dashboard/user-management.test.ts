import { validateAddedFormSubscriptions } from "./form-notification-selection";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { pool } from "./database";
import {
  invitationInput,
  accountUpdateInput,
} from "./user-management.contract";

const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw new Error("Isolated local test origin required");
after(() => pool.end());
test("user input rejects unknown grants, owner invitations and client staff access", () => {
  const input = {
    email: "fixture@example.test",
    firstName: "Test",
    lastName: "User",
    role: "member",
    capabilities: ["revenue.sales"],
  };
  assert.equal(invitationInput.safeParse(input).success, true);
  assert.equal(
    invitationInput.safeParse({ ...input, role: "crew" }).success,
    false,
  );
  assert.equal(
    invitationInput.safeParse({
      ...input,
      role: "crew",
      capabilities: [],
      formNotificationIds: [randomUUID()],
    }).success,
    false,
  );
  assert.equal(
    invitationInput.safeParse({ ...input, role: "crew", capabilities: [] })
      .success,
    true,
  );
  assert.equal(
    invitationInput.safeParse({ ...input, role: "owner" }).success,
    false,
  );
  assert.equal(
    invitationInput.safeParse({ ...input, capabilities: ["revenue.*"] })
      .success,
    false,
  );
  assert.equal(
    invitationInput.safeParse({
      ...input,
      capabilities: ["revenue.sales", "revenue.sales"],
    }).success,
    false,
  );
  assert.equal(
    invitationInput.safeParse({
      ...input,
      role: "client",
      clientId: randomUUID(),
    }).success,
    false,
  );
  assert.equal(
    invitationInput.safeParse({
      ...input,
      role: "client",
      clientId: randomUUID(),
      capabilities: [],
    }).success,
    true,
  );
  assert.equal(
    accountUpdateInput.safeParse({
      firstName: "Test",
      lastName: "User",
      version: 1,
      active: true,
      capabilities: [],
      formNotificationIds: [],
      role: "owner",
    }).success,
    false,
  );
});

test(
  "owner manages explicit grants; stale edits, owner changes and non-owner requests are rejected",
  { skip: !base },
  async () => {
    async function fixture(role: string) {
      const id = randomUUID(),
        session = randomUUID(),
        token = randomUUID();
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
        [id, `Synthetic ${role}`, `${id}@example.test`],
      );
      await pool.query(
        "INSERT INTO staff_profile(user_id,role) VALUES($1,$2)",
        [id, role],
      );
      await pool.query(
        "INSERT INTO business_account_access(user_id) VALUES($1)",
        [id],
      );
      await pool.query(
        'INSERT INTO session(id,"expiresAt",token,"userId") VALUES($1,now()+interval \'1 hour\',$2,$3)',
        [session, token, id],
      );
      const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
        .update(token)
        .digest("base64");
      const cookie = `p1-dashboard.session_token=${encodeURIComponent(`${token}.${signature}`)}`;
      return { id, session, cookie };
    }
    const owner = await fixture("owner"),
      member = await fixture("member"),
      manager = await fixture("manager");
    async function call(
      path: string,
      body?: unknown,
      method = "POST",
      cookie = owner.cookie,
    ) {
      return fetch(`${base}/api/v1${path}`, {
        method: body === undefined ? "GET" : method,
        headers: {
          cookie,
          Origin: base!,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    }
    const historyPath = `/user-management/users/${member.id}/history`;
    const historicalIds = Array.from({ length: 107 }, () => randomUUID());
    for (const [index, eventId] of historicalIds.entries())
      await pool.query(
        "INSERT INTO audit_event(id,user_id,action,entity_id,details,created_at) VALUES($1,$2,'account.fixture',$3,'{}','1990-01-01T00:00:00Z'::timestamptz + ($4::int % 3) * interval '1 microsecond')",
        [eventId, owner.id, member.id, index],
      );
    await pool.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'account.unrelated',$3,'{}')",
      [randomUUID(), owner.id, manager.id],
    );
    assert.equal(
      (await call(historyPath, undefined, "GET", manager.cookie)).status,
      403,
    );
    assert.equal((await call(historyPath + "?cursor=invalid")).status, 400);
    assert.equal((await call(historyPath + "?limit=101")).status, 400);
    const historySeen = new Set<string>();
    let historyCursor: string | null = null;
    do {
      const response = await call(
        historyPath +
          "?limit=7" +
          (historyCursor ? "&cursor=" + encodeURIComponent(historyCursor) : ""),
      );
      assert.equal(response.status, 200);
      const page = (await response.json()) as any;
      assert(page.items.length <= 7);
      if (!historySeen.size) {
        assert(page.nextCursor);
        assert.equal(
          (
            await call(
              `/user-management/users/${manager.id}/history?cursor=${encodeURIComponent(page.nextCursor)}`,
            )
          ).status,
          400,
        );
        await pool.query(
          "INSERT INTO audit_event(id,user_id,action,entity_id,details,created_at) VALUES($1,$2,'account.newer',$3,'{}','1991-01-01')",
          [randomUUID(), owner.id, member.id],
        );
      }
      for (const entry of page.items) {
        assert(!historySeen.has(entry.id));
        historySeen.add(entry.id);
        assert.equal(entry.action, "account.fixture");
        assert.equal("cursor_at" in entry, false);
      }
      historyCursor = page.nextCursor;
    } while (historyCursor);
    assert.deepEqual([...historySeen].sort(), historicalIds.sort());
    const refreshed = (await (
      await call(historyPath + "?limit=1")
    ).json()) as any;
    assert.equal(refreshed.items[0].action, "account.newer");
    const invitationIds = Array.from({ length: 205 }, () => randomUUID());
    await pool.query(
      `INSERT INTO invitation(id,email,role,token_hash,expires_at,created_at,accepted_at,revoked_at)
      SELECT entry,entry::text||'@example.test','member','synthetic:'||entry::text,'2000-01-01',
      '1990-01-01'::timestamptz+(ordinality%3)*interval '1 microsecond',
      CASE WHEN ordinality%3=0 THEN '1990-01-02'::timestamptz END,
      CASE WHEN ordinality%3=1 THEN '1990-01-02'::timestamptz END
      FROM unnest($1::uuid[]) WITH ORDINALITY AS t(entry,ordinality)`,
      [invitationIds],
    );
    assert.equal(
      (
        await call(
          "/user-management/invitations",
          undefined,
          "GET",
          member.cookie,
        )
      ).status,
      403,
    );
    assert.equal(
      (await call("/user-management/invitations?cursor=invalid")).status,
      400,
    );
    assert.equal(
      (await call("/user-management/invitations?limit=101")).status,
      400,
    );
    const invitationSeen = new Set<string>();
    let invitationCursor: string | null = null;
    do {
      const response = await call(
        "/user-management/invitations?limit=31" +
          (invitationCursor
            ? "&cursor=" + encodeURIComponent(invitationCursor)
            : ""),
      );
      assert.equal(response.status, 200);
      const page = (await response.json()) as any;
      assert(page.items.length <= 31);
      for (const entry of page.items) {
        assert(!invitationSeen.has(entry.id));
        invitationSeen.add(entry.id);
        assert.equal("token_hash" in entry, false);
        assert.equal("cursor_at" in entry, false);
      }
      invitationCursor = page.nextCursor;
    } while (invitationCursor);
    assert(
      invitationIds.every((id) => invitationSeen.has(id)),
      "All historical invitation states are reachable beyond the former 200-row cutoff",
    );
    const ownerPreferencePath = `/user-management/users/${owner.id}/owner-notifications`;
    const ownerForm = randomUUID();
    await pool.query(
      "UPDATE business_account_access SET form_notification_ids=$2 WHERE user_id=$1",
      [owner.id, [ownerForm]],
    );
    const ownerBefore = (
      await pool.query(
        'SELECT u.name,p.role,p.active,p.mfa_required,a.capabilities FROM "user" u JOIN staff_profile p ON p.user_id=u.id JOIN business_account_access a ON a.user_id=u.id WHERE u.id=$1',
        [owner.id],
      )
    ).rows[0];
    assert.equal(
      (
        await call(
          ownerPreferencePath,
          { version: 1, formNotificationIds: [] },
          "PATCH",
          manager.cookie,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          ownerPreferencePath,
          { version: 1, formNotificationIds: [], role: "member" },
          "PATCH",
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await call(
          `/user-management/users/${member.id}/owner-notifications`,
          { version: 1, formNotificationIds: [] },
          "PATCH",
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await call(
          ownerPreferencePath,
          { version: 1, formNotificationIds: [] },
          "PATCH",
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          ownerPreferencePath,
          { version: 1, formNotificationIds: [] },
          "PATCH",
        )
      ).status,
      409,
    );
    assert.deepEqual(
      (
        await pool.query(
          'SELECT u.name,p.role,p.active,p.mfa_required,a.capabilities FROM "user" u JOIN staff_profile p ON p.user_id=u.id JOIN business_account_access a ON a.user_id=u.id WHERE u.id=$1',
          [owner.id],
        )
      ).rows[0],
      ownerBefore,
    );
    assert.equal(
      (await pool.query("SELECT 1 FROM session WHERE id=$1", [owner.session]))
        .rowCount,
      1,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT 1 FROM audit_event WHERE entity_id=$1 AND action='account.form_notifications.updated'",
          [owner.id],
        )
      ).rowCount,
      1,
    );
    const crew = await fixture("crew");
    assert.equal(
      (
        await call(
          `/user-management/users/${crew.id}`,
          {
            firstName: "Crew",
            lastName: "Member",
            version: 1,
            active: true,
            capabilities: ["revenue.sales"],
            formNotificationIds: [],
          },
          "PATCH",
        )
      ).status,
      400,
    );
    await pool.query(
      "UPDATE business_account_access SET capabilities=$2 WHERE user_id=$1",
      [crew.id, ["revenue.sales"]],
    );
    const crewSession = await call("/me", undefined, "GET", crew.cookie);
    assert.equal(crewSession.status, 200);
    assert.deepEqual(
      ((await crewSession.json()) as { capabilities: string[] }).capabilities,
      [],
    );
    const notificationForm = randomUUID();
    await pool.query(
      "UPDATE business_account_access SET capabilities=$2,form_notification_ids=$3 WHERE user_id=$1",
      [member.id, ["marketing.content.forms"], [notificationForm]],
    );
    async function notificationCall(
      endpoint: string,
      extra: Record<string, string> = {},
    ) {
      return fetch(`${base}/api/integrations/core/v1/federation/${endpoint}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization:
            "Basic " +
            Buffer.from(
              `${process.env.CORE_FEDERATION_CLIENT_ID}:${process.env.CORE_FEDERATION_CLIENT_SECRET_CURRENT}`,
            ).toString("base64"),
        },
        body: JSON.stringify({
          purpose: "p1-core-cms-v1",
          form_id: notificationForm,
          ...extra,
        }),
      });
    }
    assert.deepEqual(
      await (await notificationCall("form-notification-subjects")).json(),
      { subjects: [member.id], nextCursor: null },
    );
    assert.deepEqual(
      await (
        await notificationCall("form-notification-recipient", {
          subject: member.id,
        })
      ).json(),
      { recipient: { subject: member.id, email: `${member.id}@example.test` } },
    );
    for (const change of [
      "UPDATE staff_profile SET active=false WHERE user_id=$1",
      "UPDATE staff_profile SET mfa_required=true WHERE user_id=$1",
      "UPDATE business_account_access SET capabilities='{}' WHERE user_id=$1",
      "UPDATE business_account_access SET form_notification_ids='{}' WHERE user_id=$1",
    ]) {
      await pool.query(change, [member.id]);
      assert.deepEqual(
        await (
          await notificationCall("form-notification-recipient", {
            subject: member.id,
          })
        ).json(),
        { recipient: null },
      );
      await pool.query(
        "UPDATE staff_profile SET active=true,mfa_required=false WHERE user_id=$1",
        [member.id],
      );
      await pool.query(
        "UPDATE business_account_access SET capabilities=$2,form_notification_ids=$3 WHERE user_id=$1",
        [member.id, ["marketing.content.forms"], [notificationForm]],
      );
    }
    await pool.query(
      "UPDATE business_account_access SET capabilities=$2,form_notification_ids=$3 WHERE user_id=$1",
      [crew.id, ["marketing.content.forms"], [notificationForm]],
    );
    assert.deepEqual(
      await (
        await notificationCall("form-notification-recipient", {
          subject: crew.id,
        })
      ).json(),
      { recipient: null },
    );
    for (let i = 0; i < 21; i++) {
      const extra = await fixture("member");
      await pool.query(
        "UPDATE business_account_access SET capabilities=$2,form_notification_ids=$3 WHERE user_id=$1",
        [extra.id, ["marketing.content.forms"], [notificationForm]],
      );
    }
    const firstSubjects = (await (
      await notificationCall("form-notification-subjects")
    ).json()) as { subjects: string[]; nextCursor: string };
    assert.equal(firstSubjects.subjects.length, 20);
    const secondSubjects = (await (
      await notificationCall("form-notification-subjects", {
        after: firstSubjects.nextCursor,
      })
    ).json()) as { subjects: string[]; nextCursor: null };
    assert.equal(secondSubjects.subjects.length, 2);
    assert.equal(secondSubjects.nextCursor, null);
    assert.equal(
      new Set([...firstSubjects.subjects, ...secondSubjects.subjects]).size,
      22,
    );
    const path = `/user-management/users/${member.id}`;
    const recoveryPath = `${path}/password-recovery`;
    assert.equal(
      (await call(recoveryPath, {}, "POST", manager.cookie)).status,
      403,
    );
    assert.equal(
      (await call("/user-management/users/missing/password-recovery", {}))
        .status,
      404,
    );
    await pool.query("UPDATE staff_profile SET active=false WHERE user_id=$1", [
      member.id,
    ]);
    assert.equal((await call(recoveryPath, {})).status, 409);
    await pool.query(
      "UPDATE staff_profile SET active=true,mfa_required=true WHERE user_id=$1",
      [member.id],
    );
    const recovery = await call(recoveryPath, {
      email: "ignored@example.test",
      redirectTo: "https://invalid.example.test",
    });
    assert.equal(recovery.status, 200);
    assert.deepEqual(await recovery.json(), { ok: true });
    const email = (
      await pool.query(
        "SELECT payload FROM outbox WHERE kind='email' AND payload->>'to'=$1 AND payload->>'subject'='Reset your P1 password'",
        [`${member.id}@example.test`],
      )
    ).rows;
    assert.equal(email.length, 1);
    const resetLink = new URL(email[0].payload.text);
    assert.equal(resetLink.origin, base);
    assert.equal(
      new URL(resetLink.searchParams.get("callbackURL")!).href,
      `${base}/?reset=1`,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT mfa_required FROM staff_profile WHERE user_id=$1",
          [member.id],
        )
      ).rows[0].mfa_required,
      true,
    );
    const recoveryAudit = (
      await pool.query(
        "SELECT user_id,details FROM audit_event WHERE entity_id=$1 AND action='account.password_recovery.requested'",
        [member.id],
      )
    ).rows;
    assert.equal(recoveryAudit.length, 1);
    assert.equal(recoveryAudit[0].user_id, owner.id);
    assert.deepEqual(recoveryAudit[0].details, {});
    assert.equal((await call(recoveryPath, {})).status, 429);
    await pool.query(
      "UPDATE audit_event SET created_at=now()-interval '2 minutes' WHERE entity_id=$1 AND action='account.password_recovery.requested'",
      [member.id],
    );
    const concurrentRecovery = await Promise.all([
      call(recoveryPath, {}),
      call(recoveryPath, {}),
    ]);
    assert.deepEqual(
      concurrentRecovery.map((response) => response.status).sort(),
      [200, 429],
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS count FROM outbox WHERE kind='email' AND payload->>'to'=$1 AND payload->>'subject'='Reset your P1 password'",
          [`${member.id}@example.test`],
        )
      ).rows[0].count,
      2,
    );

    await pool.query(
      "UPDATE staff_profile SET mfa_required=false WHERE user_id=$1",
      [member.id],
    );
    const update = {
      firstName: "Synthetic",
      lastName: "Member",
      version: 1,
      active: true,
      capabilities: ["marketing.analytics.view"],
      formNotificationIds: [],
    };
    assert.equal(
      (await call("/user-management/users", undefined, "GET", manager.cookie))
        .status,
      403,
    );
    assert.equal(
      (await call(path, update, "PATCH", member.cookie)).status,
      403,
    );
    assert.equal(
      (await call(`/user-management/users/${owner.id}`, update, "PATCH"))
        .status,
      409,
    );
    assert.equal((await call(path, update, "PATCH")).status, 200);
    const record = (
      await pool.query(
        "SELECT * FROM business_account_access WHERE user_id=$1",
        [member.id],
      )
    ).rows[0];
    assert.deepEqual(record.capabilities, ["marketing.analytics.view"]);
    assert.equal(record.version, 2);
    assert.equal(
      (
        await pool.query('SELECT id FROM session WHERE "userId"=$1', [
          member.id,
        ])
      ).rowCount,
      0,
    );
    assert.equal(
      (
        await call(
          path,
          { ...update, capabilities: ["revenue.billing"] },
          "PATCH",
        )
      ).status,
      409,
    );
    assert.deepEqual(
      (
        await pool.query(
          "SELECT capabilities FROM business_account_access WHERE user_id=$1",
          [member.id],
        )
      ).rows[0].capabilities,
      ["marketing.analytics.view"],
    );
    assert.equal(
      (await call(path, { ...update, version: 2, active: false }, "PATCH"))
        .status,
      200,
    );
    assert.equal(
      (
        await pool.query("SELECT active FROM staff_profile WHERE user_id=$1", [
          member.id,
        ])
      ).rows[0].active,
      false,
    );
    const history = (await (await call(`${path}/history`)).json()) as {
      items: { action: string }[];
    };
    assert.equal(
      history.items.filter((row) => row.action === "account.access.updated")
        .length,
      2,
    );

    const invitation = {
      firstName: "Invited",
      lastName: "Fixture",
      role: "member",
      email: `${randomUUID()}@example.test`,
      capabilities: ["revenue.sales"],
    };
    const created = await call("/user-management/invitations", invitation);
    assert.equal(created.status, 201);
    const invitationId = ((await created.json()) as { id: string }).id;
    assert.equal(
      (await call("/user-management/invitations", invitation)).status,
      409,
    );
    const before = (
      await pool.query("SELECT token_hash FROM invitation WHERE id=$1", [
        invitationId,
      ])
    ).rows[0].token_hash;
    assert.equal(
      (await call(`/user-management/invitations/${invitationId}/resend`, {}))
        .status,
      200,
    );
    const afterToken = (
      await pool.query("SELECT token_hash FROM invitation WHERE id=$1", [
        invitationId,
      ])
    ).rows[0].token_hash;
    assert.notEqual(before, afterToken);
    assert.equal(
      (await call(`/user-management/invitations/${invitationId}/revoke`, {}))
        .status,
      200,
    );
    assert.equal(
      (await call(`/user-management/invitations/${invitationId}/resend`, {}))
        .status,
      409,
    );
    const list = await (await call("/user-management/invitations")).text();
    assert.equal(list.includes(afterToken), false);
    // Entire suite uses a disposable database; retain fixtures for migration replay.
  },
);

test("notification selections validate only additions and require active known forms and Forms access", async () => {
  let calls = 0;
  const load = async () => {
    calls++;
    return [
      { id: "active", isActive: true },
      { id: "inactive", isActive: false },
    ];
  };
  await validateAddedFormSubscriptions(["legacy"], ["legacy"], [], load);
  await validateAddedFormSubscriptions(["legacy"], [], [], load);
  assert.equal(calls, 0);
  await assert.rejects(
    validateAddedFormSubscriptions([], ["active"], [], load),
    /Grant Forms access/,
  );
  assert.equal(calls, 0);
  await validateAddedFormSubscriptions(
    ["legacy"],
    ["legacy", "active"],
    ["marketing.content.forms"],
    load,
  );
  for (const id of ["inactive", "unknown"])
    await assert.rejects(
      validateAddedFormSubscriptions(
        [],
        [id],
        ["marketing.content.forms"],
        load,
      ),
      /Choose active forms/,
    );
  await assert.rejects(
    validateAddedFormSubscriptions(
      [],
      ["active"],
      ["marketing.content.forms"],
      async () => {
        throw new Error("unavailable");
      },
    ),
    /unavailable/,
  );
});

test(
  "retired inactive accounts preserve attribution but lose sessions, recovery, invitations and normal visibility",
  { skip: !base },
  async () => {
    const ownerId = randomUUID(), targetId = randomUUID(), ownerToken = randomUUID(), targetToken = randomUUID();
    const ownerCookie = `p1-dashboard.session_token=${encodeURIComponent(`${ownerToken}.${createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(ownerToken).digest("base64")}`)}`;
    const targetCookie = `p1-dashboard.session_token=${encodeURIComponent(`${targetToken}.${createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(targetToken).digest("base64")}`)}`;
    const targetEmail = `${targetId}@retirement.synthetic.test`;
    for (const [id, name, email, active] of [[ownerId, "Retirement owner", `${ownerId}@retirement.synthetic.test`, true], [targetId, "Retirement target", targetEmail, false]] as const) {
      await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,$4)', [id, name, email, id === ownerId]);
      await pool.query("INSERT INTO staff_profile(user_id,role,active) VALUES($1,$2,$3)", [id, id === ownerId ? "owner" : "member", active]);
      await pool.query("INSERT INTO business_account_access(user_id,capabilities,form_notification_ids) VALUES($1,$2,$3)", [id, ["revenue.sales"], [randomUUID()]]);
    }
    await pool.query('INSERT INTO session(id,"expiresAt",token,"userId") VALUES($1,now()+interval \'1 hour\',$2,$3),($4,now()+interval \'1 hour\',$5,$6)', [randomUUID(), ownerToken, ownerId, randomUUID(), targetToken, targetId]);
    await pool.query("INSERT INTO audit_event(id,user_id,action,entity_id) VALUES($1,$2,'account.historical',$2)", [randomUUID(), targetId]);
    await pool.query("INSERT INTO invitation(id,email,role,token_hash,expires_at) VALUES($1,$2,'member',$3,now()+interval '1 hour')", [randomUUID(), targetEmail, `pending:${targetId}`]);
    const resetToken = randomUUID();
    const unrelatedVerificationId = randomUUID();
    const unrelatedVerificationValue = randomUUID();
    await pool.query(
      'INSERT INTO verification(id,identifier,value,"expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\'),($4,$5,$6,now()+interval \'1 hour\')',
      [randomUUID(), `reset-password:${resetToken}`, targetId, unrelatedVerificationId, `reset-password:${randomUUID()}`, unrelatedVerificationValue],
    );
    const encodeJwtPart = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const issuedAt = Math.floor(Date.now() / 1000) - 5;
    const signedParts = `${encodeJwtPart({ alg: "HS256" })}.${encodeJwtPart({ email: targetEmail, iat: issuedAt, exp: issuedAt + 3600 })}`;
    const verificationToken = `${signedParts}.${createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(signedParts).digest("base64url")}`;
    const call = (path: string, cookie = ownerCookie, body?: unknown) => fetch(`${base}/api/v1${path}`, { method: "POST", headers: { cookie, Origin: base!, ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    assert.equal((await call(`/user-management/users/${targetId}/retire`)).status, 200);
    assert.equal((await fetch(`${base}/api/v1/me`, { headers: { cookie: targetCookie } })).status, 401);
    const signIn = await fetch(`${base}/api/auth/sign-in/email`, { method: "POST", headers: { Origin: base!, "Content-Type": "application/json" }, body: JSON.stringify({ email: targetEmail, password: "invalid-password" }) });
    assert.notEqual(signIn.status, 200);
    const reset = await fetch(`${base}/api/auth/request-password-reset`, { method: "POST", headers: { Origin: base!, "Content-Type": "application/json" }, body: JSON.stringify({ email: targetEmail, redirectTo: base }) });
    // The suite shares Better Auth's global rate limiter, so a prior request
    // can reject this before the retirement hook runs. Either denial is safe;
    // the observable recovery invariant is that no reset email is queued.
    assert.notEqual(reset.status, 200);
    assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM outbox WHERE payload->>'to'=$1 AND payload->>'subject'='Reset your P1 password'", [targetEmail])).rows[0].n, 0);
    const users = await (await fetch(`${base}/api/v1/user-management/users`, { headers: { cookie: ownerCookie } })).json() as { items: { id: string }[] };
    assert.equal(users.items.some((user) => user.id === targetId), false);
    assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM session WHERE "userId"=$1', [targetId])).rows[0].n, 0);
    assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM verification WHERE value=$1", [targetId])).rows[0].n, 0, "stored password-reset tokens are revoked");
    assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM verification WHERE value=$1", [unrelatedVerificationValue])).rows[0].n, 1, "unrelated verification records are preserved");
    const consumedReset = await fetch(`${base}/api/auth/reset-password`, { method: "POST", headers: { Origin: base!, "Content-Type": "application/json" }, body: JSON.stringify({ token: resetToken, newPassword: "replacement-password" }) });
    assert.notEqual(consumedReset.status, 200, "a pre-retirement reset token cannot set a password");
    const verified = await fetch(`${base}/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`, { headers: { Origin: base! } });
    assert.notEqual(verified.status, 200, "a pre-retirement signed verification link is rejected");
    assert.equal((await pool.query('SELECT "emailVerified" FROM "user" WHERE id=$1', [targetId])).rows[0].emailVerified, false);
    assert.deepEqual((await pool.query("SELECT capabilities,form_notification_ids FROM business_account_access WHERE user_id=$1", [targetId])).rows[0], { capabilities: [], form_notification_ids: [] });
    assert.equal((await pool.query("SELECT revoked_at IS NOT NULL AS revoked FROM invitation WHERE email=$1", [targetEmail])).rows[0].revoked, true);
    assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM audit_event WHERE user_id=$1", [targetId])).rows[0].n, 1, "historical attribution is preserved");
    assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM audit_event WHERE action='account.retired' AND entity_id=$1", [targetId])).rows[0].n, 1);
    assert.equal((await call(`/user-management/users/${targetId}/retire/recover`)).status, 200);
    assert.equal((await fetch(`${base}/api/v1/me`, { headers: { cookie: targetCookie } })).status, 401, "recovery never restores a revoked session");
    assert.deepEqual((await pool.query("SELECT capabilities FROM business_account_access WHERE user_id=$1", [targetId])).rows[0].capabilities, ["revenue.sales"]);
    assert.equal((await call(`/user-management/users/${targetId}/retire`)).status, 200, "a recovered account can be retired again");
  },
);
