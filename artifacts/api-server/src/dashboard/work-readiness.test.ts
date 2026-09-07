import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { pool } from "./database";
const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw new Error("Isolated readiness test origin required");
after(() => pool.end());
test(
  "readiness edits isolate roles, reject stale/started/prospect work and invalidate old overrides",
  { skip: !base },
  async () => {
    const client = randomUUID(),
      property = randomUUID(),
      prospect = randomUUID(),
      job = randomUUID(),
      prospectJob = randomUUID();
    await pool.query(
      "INSERT INTO client(id,name) VALUES($1,'Readiness fixture')",
      [client],
    );
    await pool.query(
      "INSERT INTO property(id,client_id,name,address,lifecycle) VALUES($1,$2,'Operational readiness','Synthetic','operational'),($3,NULL,'Prospect readiness','Synthetic','prospect')",
      [property, client, prospect],
    );
    await pool.query(
      "INSERT INTO work_order(id,property_id,title,status,prerequisites,override_reason) VALUES($1,$2,'Readiness','scheduled',$5,'Old approval'),($3,$4,'Legacy prospect work','draft','[]',NULL)",
      [
        job,
        property,
        prospectJob,
        prospect,
        JSON.stringify([{ label: "Equipment: mower", done: false }]),
      ],
    );
    const roles = [
      "owner",
      "manager",
      "dispatch",
      "crew",
      "sales",
      "finance",
      "client",
    ];
    const cookies: Record<string, string> = {};
    for (const role of roles) {
      const uid = randomUUID(),
        sid = randomUUID(),
        token = randomUUID();
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified","twoFactorEnabled") VALUES($1,$2,$3,true,true)',
        [uid, role, uid + "@example.test"],
      );
      await pool.query(
        "INSERT INTO staff_profile(user_id,role) VALUES($1,$2)",
        [uid, role],
      );
      await pool.query(
        'INSERT INTO session(id,"expiresAt",token,"userId") VALUES($1,now()+interval \'1 hour\',$2,$3)',
        [sid, token, uid],
      );
      if (role === "owner")
        await pool.query(
          "INSERT INTO session_assurance(session_id) VALUES($1)",
          [sid],
        );
      cookies[role] =
        "p1-dashboard.session_token=" +
        encodeURIComponent(
          token +
            "." +
            createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
              .update(token)
              .digest("base64"),
        );
    }
    async function edit(
      role: string,
      id: string,
      version: number,
      done: boolean,
      reason = "Readiness inspected",
    ) {
      return fetch(base + "/api/v1/work-orders/" + id + "/readiness", {
        method: "POST",
        headers: {
          origin: base!,
          "content-type": "application/json",
          ...(cookies[role] ? { cookie: cookies[role] } : {}),
        },
        body: JSON.stringify({
          version,
          prerequisites: [{ label: "Equipment: mower", done }],
          reason,
        }),
      });
    }
    for (const role of ["crew", "sales", "finance", "client"])
      assert.equal((await edit(role, job, 1, true)).status, 403);
    assert.equal((await edit("anonymous", job, 1, true)).status, 401);
    const outcomes = await Promise.all([
      edit("manager", job, 1, true),
      edit("manager", job, 1, true),
    ]);
    assert.deepEqual(outcomes.map((r) => r.status).sort(), [200, 409]);
    const row = (
      await pool.query(
        "SELECT version,override_reason,prerequisites FROM work_order WHERE id=$1",
        [job],
      )
    ).rows[0];
    assert.equal(row.version, 2);
    assert.equal(row.override_reason, null);
    assert.equal(row.prerequisites[0].done, true);
    const audit = (
      await pool.query(
        "SELECT details FROM audit_event WHERE entity_id=$1 AND action='work.readiness_updated'",
        [job],
      )
    ).rows;
    assert.equal(audit.length, 1);
    assert.equal(audit[0].details.clearedOverride, "Old approval");
    assert.equal(audit[0].details.reason, "Readiness inspected");
    assert.equal((await edit("owner", job, 2, false)).status, 200);
    assert.equal((await edit("dispatch", job, 3, true)).status, 200);
    assert.equal((await edit("manager", job, 4, true)).status, 400);
    assert.equal((await edit("manager", job, 4, false, "")).status, 400);
    assert.equal((await edit("manager", prospectJob, 1, true)).status, 404);
    await pool.query("UPDATE work_order SET status='in_progress' WHERE id=$1", [
      job,
    ]);
    assert.equal((await edit("manager", job, 4, false)).status, 409);
    assert.equal(
      (await pool.query("SELECT version FROM work_order WHERE id=$1", [job]))
        .rows[0].version,
      4,
    );
  },
);
