import { createRoot } from "react-dom/client";
import { ScheduleCalendar } from "../src/ScheduleCalendar";
import "../src/style.css";
const job = {
  id: "synthetic-job",
  title: "Synthetic mowing",
  property_name: "Test farm",
  scheduled_at: new Date().toISOString(),
  assigned_to: "crew1",
  status: "scheduled",
  scope: "Mow the north field",
  version: 1,
};
async function request(path: string, body?: any) {
  if (body) {
    if (body.version !== job.version) throw new Error("Work order changed");
    Object.assign(job, {
      scheduled_at: body.scheduledAt,
      assigned_to: body.assignedTo,
      version: job.version + 1,
    });
    return { id: job.id, version: job.version };
  }
  const q = new URL(path, "http://fixture").searchParams;
  return {
    items: q.get("unscheduled") === "true" ? [] : [{ ...job }],
    nextCursor: null,
  };
}
createRoot(document.getElementById("root")!).render(
  <ScheduleCalendar
    work={[]}
    staff={[{ id: "crew1", name: "North crew" }]}
    canManage={true}
    onSelect={() => {}}
    request={request}
  />,
);
