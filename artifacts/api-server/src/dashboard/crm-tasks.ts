import { Router } from "express";
import { z } from "zod";
import { actor } from "./access";
import { requireCapability } from "./policy";
import {
  createTask,
  getTask,
  listTaskAssignees,
  listTasks,
  taskGrant,
  taskHistory,
  updateTask,
} from "./crm-tasks.service";
export const crmTasksApi = Router();
const id = z.string().uuid();
for (const [base, kind] of [
  ["leads", "lead"],
  ["clients", "client"],
] as const) {
  const prefix = `/${base}/:id/tasks`;
  const scope = async (
    req: Parameters<typeof actor>[0],
    res: { setHeader: (key: string, value: string) => unknown },
  ) => {
    const user = await actor(req);
    requireCapability(user, taskGrant(kind));
    res.setHeader("Cache-Control", "private, no-store");
    return user;
  };
  crmTasksApi.get(prefix, async (req, res) => {
    await scope(req, res);
    res.json(await listTasks(kind, id.parse(req.params.id), req.query));
  });
  crmTasksApi.get(prefix + "/assignees", async (req, res) => {
    await scope(req, res);
    res.json(await listTaskAssignees(kind, id.parse(req.params.id)));
  });
  crmTasksApi.get(prefix + "/:taskId", async (req, res) => {
    await scope(req, res);
    res.json(
      await getTask(kind, id.parse(req.params.id), id.parse(req.params.taskId)),
    );
  });
  crmTasksApi.get(prefix + "/:taskId/history", async (req, res) => {
    await scope(req, res);
    res.json(
      await taskHistory(
        kind,
        id.parse(req.params.id),
        id.parse(req.params.taskId),
        req.query,
      ),
    );
  });
  crmTasksApi.post(prefix, async (req, res) => {
    const user = await scope(req, res);
    const result = await createTask(
      kind,
      id.parse(req.params.id),
      user.id,
      req.body,
    );
    res.status(result.replayed ? 200 : 201).json(result);
  });
  crmTasksApi.patch(prefix + "/:taskId", async (req, res) => {
    const user = await scope(req, res);
    res.json(
      await updateTask(
        kind,
        id.parse(req.params.id),
        id.parse(req.params.taskId),
        user.id,
        req.body,
      ),
    );
  });
}
