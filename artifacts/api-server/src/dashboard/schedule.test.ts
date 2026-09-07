import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { pool } from "./database";
import { readSchedule, rescheduleWork } from "./schedule";
const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw new Error("Use isolated schedule tests");
after(() => pool.end());
test(
  "schedule pagination exceeds old500cap and preserves role boundaries; edits version and retain occurrence",
  { skip: !base },
  async () => {
    const manager = randomUUID(),
      crew = randomUUID(),
      clientUser = randomUUID(),
      client = randomUUID(),
      other = randomUUID(),
      property = randomUUID(),
      otherProperty = randomUUID();
    for (const [uid, role] of [
      [manager, "manager"],
      [crew, "crew"],
      [clientUser, "client"],
    ]) {
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
        [uid, role, uid + "@example.test"],
      );
      await pool.query(
        "INSERT INTO staff_profile(user_id,role) VALUES($1,$2)",
        [uid, role],
      );
    }
    await pool.query("INSERT INTO client(id,name) VALUES($1,$2),($3,$4)", [
      client,
      "Calendar client",
      other,
      "Other client",
    ]);
    await pool.query(
      "INSERT INTO property(id,client_id,name,address) VALUES($1,$2,$3,$4),($5,$6,$7,$8)",
      [
        property,
        client,
        "Calendar property",
        "Test",
        otherProperty,
        other,
        "Other property",
        "Test",
      ],
    );
    await pool.query(
      "INSERT INTO client_access(user_id,client_id) VALUES($1,$2)",
      [clientUser, client],
    );
    for (let i = 0; i < 505; i++)
      await pool.query(
        "INSERT INTO work_order(id,property_id,title,status,scheduled_at,assigned_to) VALUES($1,$2,$3,'scheduled','2035-03-11T05:30:00.123456Z',$4)",
        [randomUUID(), property, "Calendar " + i, crew],
      );
    const privateId = randomUUID();
    await pool.query(
      "INSERT INTO work_order(id,property_id,title,status,scheduled_at) VALUES($1,$2,'Private','scheduled','2035-03-11T06:30:00Z')",
      [privateId, otherProperty],
    );
    const who = (id: string, role: "manager" | "crew" | "client") => ({
      id,
      name: role,
      role,
    });
    const query = { from: "2035-03-11", through: "2035-03-11" };
    let cursor: string | undefined;
    const ids = new Set<string>();
    do {
      const page = await readSchedule(who(manager, "manager"), {
        ...query,
        cursor,
      });
      for (const w of page.items) {
        assert.equal(ids.has(w.id), false);
        ids.add(w.id);
      }
      cursor = page.nextCursor || undefined;
    } while (cursor);
    assert.equal(ids.size, 506);
    assert.equal(
      (await readSchedule(who(clientUser, "client"), query)).items.some(
        (w) => w.id === privateId,
      ),
      false,
    );
    assert.equal(
      (await readSchedule(who(crew, "crew"), query)).items.some(
        (w) => w.id === privateId,
      ),
      false,
    );
    assert.equal(
      "assigned_to" in
        (await readSchedule(who(clientUser, "client"), query)).items[0],
      false,
    );
    await assert.rejects(
      () =>
        readSchedule(who(clientUser, "client"), {
          ...query,
          unscheduled: "true",
        }),
      /private/,
    );
    await assert.rejects(
      () =>
        readSchedule(who(manager, "manager"), { ...query, cursor: "bogus" }),
      /cursor/,
    );
    const target = [...ids].find((id) => id !== privateId)!;
    await assert.rejects(
      () =>
        rescheduleWork(manager, target, {
          scheduledAt: "2035-03-12T13:00:00Z",
          assignedTo: clientUser,
          version: 1,
          reason: "Invalid client assignment",
        }),
      /active staff/,
    );
    await pool.query(
      "UPDATE work_order SET occurrence_date='2035-03-11' WHERE id=$1",
      [target],
    );
    const contenders = await Promise.allSettled(
      [1, 2].map(() =>
        rescheduleWork(manager, target, {
          scheduledAt: "2035-03-12T13:00:00Z",
          assignedTo: null,
          version: 1,
          reason: "Weather delay",
        }),
      ),
    );
    assert.equal(contenders.filter((r) => r.status === "fulfilled").length, 1);
    const updated = (
      await pool.query("SELECT * FROM work_order WHERE id=$1", [target])
    ).rows[0];
    assert.equal(updated.assigned_to, null);
    assert.equal(updated.version, 2);
    assert.equal(updated.status, "scheduled");
    assert.equal(
      (
        await pool.query(
          "SELECT to_char(occurrence_date, 'YYYY-MM-DD') AS occurrence FROM work_order WHERE id=$1",
          [target],
        )
      ).rows[0].occurrence,
      "2035-03-11",
    );
    const audit = (
      await pool.query(
        "SELECT details FROM audit_event WHERE entity_id=$1 AND action='work.rescheduled'",
        [target],
      )
    ).rows;
    assert.equal(audit.length, 1);
    assert.equal(audit[0].details.before.assignedTo, crew);
    assert.equal(audit[0].details.after.assignedTo, null);
    await pool.query("UPDATE work_order SET status='in_progress' WHERE id=$1", [
      target,
    ]);
    await assert.rejects(
      () =>
        rescheduleWork(manager, target, {
          scheduledAt: "2035-03-13T13:00:00Z",
          version: 2,
          reason: "Too late",
        }),
      /already started/,
    );
    for (const [uid, role] of [
      [manager, "manager"],
      [crew, "crew"],
      [clientUser, "client"],
    ]) {
      const token = randomUUID();
      await pool.query(
        'INSERT INTO session(id,token,"userId","expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')',
        [randomUUID(), token, uid],
      );
      const sig = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
        .update(token)
        .digest("base64");
      const headers = {
        cookie:
          "p1-dashboard.session_token=" + encodeURIComponent(token + "." + sig),
        origin: base!,
        "Content-Type": "application/json",
      };
      const read = await fetch(
        base + "/api/v1/schedule?from=2035-03-11&through=2035-03-11",
        { headers },
      );
      assert.equal(read.status, 200, role + " read");
      const payload = await read.json();
      if (role === "client") assert.equal("scope" in payload.items[0], false);
      const edit = await fetch(
        base + "/api/v1/work-orders/" + target + "/reschedule",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            scheduledAt: "2035-03-13T13:00:00Z",
            version: 2,
            reason: "Route protection",
          }),
        },
      );
      assert.equal(edit.status, role === "manager" ? 409 : 403, role + " edit");
    }
  },
);
