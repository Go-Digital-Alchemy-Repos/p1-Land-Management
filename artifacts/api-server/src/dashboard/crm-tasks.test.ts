import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { pool } from "./database";
const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw Error("Isolated local server required");
after(() => pool.end());
test(
  "CRM tasks separate Sales and Customers, preserve revisions and serialize retries/edits",
  { skip: !base },
  async () => {
    const owner = randomUUID(),
      sales = randomUUID(),
      customers = randomUUID(),
      crew = randomUUID(),
      portal = randomUUID(),
      lead = randomUUID(),
      client = randomUUID(),
      other = randomUUID();
    const headers = new Map<string, Record<string, string>>();
    for (const [id, role, cap] of [
      [owner, "owner", null],
      [sales, "member", "revenue.sales"],
      [customers, "member", "customers.clients"],
      [crew, "crew", null],
      [portal, "client", null],
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
      if (cap)
        await pool.query(
          "INSERT INTO business_account_access(user_id,capabilities) VALUES($1,$2)",
          [id, [cap]],
        );
      await pool.query(
        'INSERT INTO session(id,token,"userId","expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')',
        [randomUUID(), token, id],
      );
      const sign = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
        .update(token)
        .digest("base64");
      headers.set(id!, {
        cookie:
          "p1-dashboard.session_token=" +
          encodeURIComponent(token + "." + sign),
        origin: base!,
        "content-type": "application/json",
      });
    }
    await pool.query(
      "INSERT INTO lead(id,name,email,location,description) VALUES($1,'Test','test@example.test','Test','Test')",
      [lead],
    );
    await pool.query(
      "INSERT INTO client(id,name) VALUES($1,'Client'),($2,'Other')",
      [client, other],
    );
    const call = (
      who: string,
      kind = "leads",
      key = lead,
      suffix = "",
      method = "GET",
      body?: unknown,
    ) =>
      fetch(`${base}/api/v1/${kind}/${key}/tasks${suffix}`, {
        headers: headers.get(who),
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    const data = async (r: Response): Promise<any> => {
      assert.equal(r.status, 200);
      return r.json();
    };
    const task = {
      id: randomUUID(),
      title: "Follow up",
      dueAt: "2030-03-01T10:30:00-05:00",
      assignedToId: sales,
      completed: false,
    };
    for (const who of [customers, crew, portal])
      assert.equal((await call(who)).status, 403);
    assert.equal((await call(sales, "clients", client)).status, 403);
    assert.equal((await call(customers, "clients", client)).status, 200);
    const eligible = await data(await call(sales, "leads", lead, "/assignees"));
    assert(eligible.some((p: any) => p.id === owner));
    assert(eligible.some((p: any) => p.id === sales));
    assert(
      !eligible.some(
        (p: any) => p.id === customers || p.id === crew || p.id === portal,
      ),
    );
    assert(
      eligible.every((p: any) => Object.keys(p).sort().join(",") === "id,name"),
    );
    assert.equal(
      (
        await call(sales, "leads", lead, "", "POST", {
          ...task,
          assignedToId: customers,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call(sales, "leads", lead, "", "POST", {
          ...task,
          createdById: owner,
        })
      ).status,
      400,
    );
    const results = await Promise.all([
      call(sales, "leads", lead, "", "POST", task),
      call(sales, "leads", lead, "", "POST", task),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 201]);
    const first = await data(await call(sales, "leads", lead, "/" + task.id));
    assert.equal(first.version, 1);
    assert.equal(first.dueAt, "2030-03-01T15:30:00.000Z");
    assert.equal(first.createdById, sales);
    const edit = {
      expectedVersion: 1,
      title: "Updated title",
      dueAt: null,
      assignedToId: null,
      completed: true,
    };
    const edits = await Promise.all([
      call(sales, "leads", lead, "/" + task.id, "PATCH", edit),
      call(owner, "leads", lead, "/" + task.id, "PATCH", {
        ...edit,
        title: "Other edit",
      }),
    ]);
    assert.deepEqual(edits.map((r) => r.status).sort(), [200, 409]);
    const current = await data(await call(sales, "leads", lead, "/" + task.id));
    assert.equal(current.version, 2);
    assert.equal(current.completed, true);
    assert.equal(current.createdById, sales);
    assert.equal(
      (await call(sales, "leads", lead, "", "POST", task)).status,
      200,
    ); // Original creation retry after edit must not revert it.
    assert.equal(
      (await data(await call(sales, "leads", lead, "/" + task.id))).version,
      2,
    );
    assert.equal(
      (await call(owner, "leads", lead, "", "POST", task)).status,
      409,
    );
    assert.equal(
      (
        await call(sales, "leads", lead, "", "POST", {
          ...task,
          title: "Different",
        })
      ).status,
      409,
    );
    assert.equal(
      (await call(owner, "clients", client, "/" + task.id)).status,
      404,
    );
    assert.equal(
      (await call(owner, "clients", client, "/" + task.id + "/history")).status,
      404,
    );
    assert.equal(
      (await call(owner, "clients", client, "/" + task.id, "PATCH", edit))
        .status,
      404,
    );
    assert.equal((await data(await call(sales))).items.length, 0);
    assert.equal(
      (await data(await call(sales, "leads", lead, "?state=completed"))).items
        .length,
      1,
    );
    const reopen = {
      expectedVersion: 2,
      title: current.title,
      dueAt: current.dueAt,
      assignedToId: sales,
      completed: false,
    };
    assert.equal(
      (await call(owner, "leads", lead, "/" + task.id, "PATCH", reopen)).status,
      200,
    );
    // A revoked former assignee can remain credited; changing an assignment requires current grants.
    await pool.query(
      "UPDATE business_account_access SET capabilities='{}' WHERE user_id=$1",
      [sales],
    );
    assert.equal((await call(sales)).status, 403);
    assert.equal(
      (
        await call(owner, "leads", lead, "", "POST", {
          ...task,
          id: randomUUID(),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call(owner, "leads", lead, "/" + task.id, "PATCH", {
          ...reopen,
          expectedVersion: 3,
          completed: true,
        })
      ).status,
      200,
    );
    const history = await data(
      await call(owner, "leads", lead, "/" + task.id + "/history?limit=2"),
    );
    assert.deepEqual(
      history.items.map((r: any) => r.version),
      [4, 3],
    );
    assert.equal(history.nextBeforeVersion, 3);
    const older = await data(
      await call(
        owner,
        "leads",
        lead,
        "/" + task.id + "/history?beforeVersion=3",
      ),
    );
    assert.deepEqual(
      older.items.map((r: any) => r.version),
      [2, 1],
    );
    assert.equal(older.items[1].title, "Follow up");
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM audit_event WHERE entity_id=$1 AND action='crm_task.created'",
          [task.id],
        )
      ).rows[0].n,
      1,
    );
    await assert.rejects(
      pool.query("DELETE FROM crm_task WHERE id=$1", [task.id]),
      /cannot be deleted/,
    );
    await assert.rejects(
      pool.query("UPDATE crm_task SET title=$2 WHERE id=$1", [
        task.id,
        "illegal",
      ]),
      /version must advance/,
    );
    await assert.rejects(
      pool.query(
        "UPDATE crm_task SET lead_id=NULL,client_id=$2,version=version+1 WHERE id=$1",
        [task.id, client],
      ),
      /origin is immutable/,
    );
    await assert.rejects(
      pool.query("DELETE FROM crm_task_revision WHERE task_id=$1", [task.id]),
      /append-only/,
    );
    const clientTask = { ...task, id: randomUUID(), assignedToId: customers };
    assert.equal(
      (await call(customers, "clients", client, "", "POST", clientTask)).status,
      201,
    );
    assert.equal(
      (await call(customers, "clients", other, "/" + clientTask.id)).status,
      404,
    );
    // Audit failures roll back the mutable task and its trigger-created revision together.
    const rejectedId = randomUUID();
    await pool.query(
      `CREATE FUNCTION test_reject_crm_task_audit() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'Synthetic audit failure'; END; $$ LANGUAGE plpgsql`,
    );
    await pool.query(
      `CREATE TRIGGER test_reject_crm_task_audit BEFORE INSERT ON audit_event FOR EACH ROW WHEN (NEW.entity_id IN ('${task.id}','${rejectedId}') AND NEW.action LIKE 'crm_task.%') EXECUTE FUNCTION test_reject_crm_task_audit()`,
    );
    try {
      assert.equal(
        (
          await call(owner, "leads", lead, "/" + task.id, "PATCH", {
            expectedVersion: 4,
            title: "Must roll back",
            dueAt: null,
            assignedToId: null,
            completed: false,
          })
        ).status,
        500,
      );
      assert.equal(
        (await data(await call(owner, "leads", lead, "/" + task.id))).version,
        4,
      );
      assert.equal(
        (
          await data(
            await call(owner, "leads", lead, "/" + task.id + "/history"),
          )
        ).items.length,
        4,
      );
      assert.equal(
        (
          await call(owner, "leads", lead, "", "POST", {
            ...task,
            id: rejectedId,
            assignedToId: null,
          })
        ).status,
        500,
      );
      assert.equal(
        (await pool.query("SELECT id FROM crm_task WHERE id=$1", [rejectedId]))
          .rowCount,
        0,
      );
      assert.equal(
        (
          await pool.query(
            "SELECT task_id FROM crm_task_revision WHERE task_id=$1",
            [rejectedId],
          )
        ).rowCount,
        0,
      );
    } finally {
      await pool.query(
        "DROP TRIGGER test_reject_crm_task_audit ON audit_event",
      );
      await pool.query("DROP FUNCTION test_reject_crm_task_audit()");
    }
    // Imported, completed history without a surviving local user remains visible.
    const imported = randomUUID();
    await pool.query(
      "INSERT INTO crm_task(id,client_id,title,completed,source_instance_id,source_task_id,source_created_by_id,source_assigned_to_id) VALUES($1,$2,'Historical task',true,'synthetic','source-task','deleted-author','deleted-assignee')",
      [imported, client],
    );
    const historical = await data(
      await call(customers, "clients", client, "/" + imported),
    );
    assert.equal(historical.creatorName, null);
    assert.equal(historical.assigneeName, null);
    assert.equal(historical.imported, true);
    assert.equal("source_created_by_id" in historical, false);
    await assert.rejects(
      pool.query(
        "INSERT INTO crm_task(id,client_id,title,source_instance_id,source_task_id) VALUES($1,$2,'Duplicate','synthetic','source-task')",
        [randomUUID(), client],
      ),
      /unique/,
    );
    await pool.query(
      "INSERT INTO crm_task(id,lead_id,title,source_instance_id,source_task_id) VALUES($1,$2,'Independent source table','synthetic','source-task')",
      [randomUUID(), lead],
    );
    // Timestamp-keyset pages keep sub-millisecond source records; state/parent changes reject cursor reuse.
    await pool.query(
      "INSERT INTO crm_task(id,client_id,title,source_instance_id,source_task_id,created_at) SELECT gen_random_uuid(),$1,'Historical '||i,'synthetic','page-'||i,'2021-01-01T00:00:00Z'::timestamptz+i*interval '1 microsecond' FROM generate_series(1,105) i",
      [client],
    );
    let cursor: string | null = null,
      initial = "",
      seen: string[] = [];
    do {
      const response = await call(
        customers,
        "clients",
        client,
        "?state=all&limit=30" +
          (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
      );
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      const page = await data(response);
      seen.push(...page.items.map((t: any) => t.id));
      cursor = page.nextCursor;
      if (!initial && cursor) initial = cursor;
    } while (cursor);
    assert.equal(seen.length, 107);
    assert.equal(new Set(seen).size, 107);
    assert.equal(
      (
        await call(
          customers,
          "clients",
          other,
          "?state=all&cursor=" + encodeURIComponent(initial),
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await call(
          customers,
          "clients",
          client,
          "?state=open&cursor=" + encodeURIComponent(initial),
        )
      ).status,
      400,
    );
    assert.equal(
      (await call(customers, "clients", client, "?limit=101")).status,
      400,
    );
    await pool.query("UPDATE client SET archived=true WHERE id=$1", [client]);
    assert.equal((await call(customers, "clients", client)).status, 404);
  },
);
