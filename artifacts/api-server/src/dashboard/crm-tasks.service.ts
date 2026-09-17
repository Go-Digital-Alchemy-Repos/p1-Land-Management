import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { PoolClient } from "pg";
import { pool, transaction } from "./database";
import { HttpError } from "./policy";
export type TaskParent = "lead" | "client";
export const taskGrant = (kind: TaskParent) =>
  kind === "lead" ? ("revenue.sales" as const) : ("customers.clients" as const);
const column = (kind: TaskParent) =>
  kind === "lead" ? "lead_id" : "client_id";
const fields = {
  title: z.string().trim().min(1).max(2000),
  dueAt: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .transform((value) =>
      value === null ? null : new Date(value).toISOString(),
    ),
  assignedToId: z.string().min(1).max(200).nullable(),
  completed: z.boolean(),
};
const createInput = z.object({ id: z.string().uuid(), ...fields }).strict();
const updateInput = z
  .object({ expectedVersion: z.number().int().positive(), ...fields })
  .strict();
const pageInput = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(30),
    cursor: z.string().max(2000).optional(),
    state: z.enum(["all", "open", "completed"]).default("open"),
  })
  .strict();
const cursorInput = z
  .object({
    kind: z.enum(["lead", "client"]),
    parentId: z.string().uuid(),
    state: z.enum(["all", "open", "completed"]),
    at: z.string().datetime(),
    id: z.string().uuid(),
  })
  .strict();
const select = `t.id,t.title,t.due_at AS "dueAt",t.completed,t.assigned_to_id AS "assignedToId",a.name AS "assigneeName",t.created_by_id AS "createdById",u.name AS "creatorName",t.created_at AS "createdAt",t.updated_at AS "updatedAt",t.version,(t.source_task_id IS NOT NULL) AS imported`;
const joins = `LEFT JOIN "user" a ON a.id=t.assigned_to_id LEFT JOIN "user" u ON u.id=t.created_by_id`;
async function parent(
  kind: TaskParent,
  id: string,
  c: Pick<PoolClient, "query"> = pool,
  lock = false,
) {
  const result = await c.query(
    `SELECT id FROM ${kind === "lead" ? "lead" : "client"} WHERE id=$1${kind === "client" ? " AND archived=false" : ""}${lock ? " FOR SHARE" : ""}`,
    [id],
  );
  if (!result.rowCount)
    throw new HttpError(
      404,
      kind === "lead" ? "Inquiry not found" : "Client not found",
    );
}
export async function listTaskAssignees(kind: TaskParent, parentId: string) {
  await parent(kind, parentId);
  return (
    await pool.query(
      `SELECT u.id,u.name FROM "user" u JOIN staff_profile p ON p.user_id=u.id LEFT JOIN business_account_access a ON a.user_id=u.id
 WHERE p.active=true AND (p.role='owner' OR (p.role NOT IN ('crew','client') AND $1=ANY(a.capabilities))) ORDER BY u.name,u.id`,
      [taskGrant(kind)],
    )
  ).rows;
}
async function eligibleAssignee(
  c: PoolClient,
  kind: TaskParent,
  id: string | null,
) {
  if (id === null) return;
  const profile = (
    await c.query(
      "SELECT role,active FROM staff_profile WHERE user_id=$1 FOR SHARE",
      [id],
    )
  ).rows[0];
  const access = (
    await c.query(
      "SELECT capabilities FROM business_account_access WHERE user_id=$1 FOR SHARE",
      [id],
    )
  ).rows[0];
  if (
    !profile?.active ||
    (profile.role !== "owner" &&
      (["crew", "client"].includes(profile.role) ||
        !access?.capabilities?.includes(taskGrant(kind))))
  )
    throw new HttpError(
      400,
      "Choose an active assignee with access to this area",
    );
}
export async function listTasks(
  kind: TaskParent,
  parentId: string,
  input: unknown,
) {
  const query = pageInput.parse(input);
  let cursor: z.infer<typeof cursorInput> | undefined;
  if (query.cursor) {
    try {
      cursor = cursorInput.parse(
        JSON.parse(Buffer.from(query.cursor, "base64url").toString()),
      );
      if (
        cursor.kind !== kind ||
        cursor.parentId !== parentId ||
        cursor.state !== query.state
      )
        throw Error("Wrong scope");
    } catch {
      throw new HttpError(400, "Invalid task page cursor");
    }
  }
  await parent(kind, parentId);
  const result = await pool.query(
    `SELECT ${select},to_char(t.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_at FROM crm_task t ${joins}
 WHERE t.${column(kind)}=$1 AND ($2='all' OR t.completed=($2='completed'))
 AND ($3::timestamptz IS NULL OR (t.created_at,t.id)<($3::timestamptz,$4::uuid)) ORDER BY t.created_at DESC,t.id DESC LIMIT $5`,
    [
      parentId,
      query.state,
      cursor?.at || null,
      cursor?.id || null,
      query.limit + 1,
    ],
  );
  const items = result.rows.slice(0, query.limit),
    last = items.at(-1);
  return {
    items: items.map(({ cursor_at, ...row }) => row),
    nextCursor:
      result.rows.length > query.limit && last
        ? Buffer.from(
            JSON.stringify({
              kind,
              parentId,
              state: query.state,
              at: last.cursor_at,
              id: last.id,
            }),
          ).toString("base64url")
        : null,
  };
}
export async function getTask(kind: TaskParent, parentId: string, id: string) {
  await parent(kind, parentId);
  const result = await pool.query(
    `SELECT ${select} FROM crm_task t ${joins} WHERE t.id=$1 AND t.${column(kind)}=$2`,
    [id, parentId],
  );
  if (!result.rowCount) throw new HttpError(404, "Task not found");
  return result.rows[0];
}
export async function taskHistory(
  kind: TaskParent,
  parentId: string,
  id: string,
  input: unknown,
) {
  const query = z
    .object({
      beforeVersion: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(30),
    })
    .strict()
    .parse(input);
  await getTask(kind, parentId, id);
  const result = await pool.query(
    `SELECT r.version,r.title,r.due_at AS "dueAt",r.completed,r.assigned_to_id AS "assignedToId",a.name AS "assigneeName",u.name AS "changedByName",r.recorded_at AS "recordedAt" FROM crm_task_revision r LEFT JOIN "user" a ON a.id=r.assigned_to_id LEFT JOIN "user" u ON u.id=r.changed_by_id WHERE r.task_id=$1 AND ($2::integer IS NULL OR r.version<$2) ORDER BY r.version DESC LIMIT $3`,
    [id, query.beforeVersion || null, query.limit + 1],
  );
  const items = result.rows.slice(0, query.limit);
  return {
    items,
    nextBeforeVersion:
      result.rows.length > query.limit ? items.at(-1).version : null,
  };
}
export async function createTask(
  kind: TaskParent,
  parentId: string,
  actorId: string,
  input: unknown,
) {
  const { id, ...body } = createInput.parse(input);
  return transaction(async (c) => {
    await parent(kind, parentId, c, true);
    // Serialize creation retries by immutable requested task ID, even after later edits.
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      "crm-task:" + id,
    ]);
    const existing = (
      await c.query(
        `SELECT created_by_id,${column(kind)} AS parent_id,creation_payload=$2::jsonb AS matches FROM crm_task WHERE id=$1`,
        [id, JSON.stringify(body)],
      )
    ).rows[0];
    if (existing) {
      if (
        existing.parent_id !== parentId ||
        existing.created_by_id !== actorId ||
        !existing.matches
      )
        throw new HttpError(409, "Task ID already used");
      return { id, replayed: true };
    }
    await eligibleAssignee(c, kind, body.assignedToId);
    await c.query(
      `INSERT INTO crm_task(id,${column(kind)},title,due_at,completed,assigned_to_id,created_by_id,changed_by_id,creation_payload) VALUES($1,$2,$3,$4,$5,$6,$7,$7,$8)`,
      [
        id,
        parentId,
        body.title,
        body.dueAt,
        body.completed,
        body.assignedToId,
        actorId,
        JSON.stringify(body),
      ],
    );
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'crm_task.created',$3,$4)",
      [
        randomUUID(),
        actorId,
        id,
        JSON.stringify({ kind, parentId, version: 1 }),
      ],
    );
    return { id, replayed: false };
  });
}
export async function updateTask(
  kind: TaskParent,
  parentId: string,
  id: string,
  actorId: string,
  input: unknown,
) {
  const body = updateInput.parse(input);
  return transaction(async (c) => {
    await parent(kind, parentId, c, true);
    const old = (
      await c.query(
        `SELECT * FROM crm_task WHERE id=$1 AND ${column(kind)}=$2 FOR UPDATE`,
        [id, parentId],
      )
    ).rows[0];
    if (!old) throw new HttpError(404, "Task not found");
    if (old.version !== body.expectedVersion)
      throw new HttpError(409, "Task changed; reload before saving");
    // Preserve an old/deactivated assignment when it is unchanged; new assignments must be eligible.
    if (body.assignedToId !== old.assigned_to_id)
      await eligibleAssignee(c, kind, body.assignedToId);
    if (
      old.title === body.title &&
      (old.due_at?.toISOString() || null) === body.dueAt &&
      old.assigned_to_id === body.assignedToId &&
      old.completed === body.completed
    )
      return { id, version: old.version };
    const result = await c.query(
      `UPDATE crm_task SET title=$2,due_at=$3,completed=$4,assigned_to_id=$5,changed_by_id=$6,version=version+1,updated_at=clock_timestamp() WHERE id=$1 RETURNING version`,
      [id, body.title, body.dueAt, body.completed, body.assignedToId, actorId],
    );
    const version = result.rows[0].version;
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,$3,$4,$5)",
      [
        randomUUID(),
        actorId,
        old.completed !== body.completed
          ? body.completed
            ? "crm_task.completed"
            : "crm_task.reopened"
          : "crm_task.updated",
        id,
        JSON.stringify({ kind, parentId, version }),
      ],
    );
    return { id, version };
  });
}
