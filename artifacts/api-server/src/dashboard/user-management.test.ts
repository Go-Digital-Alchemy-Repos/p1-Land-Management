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
