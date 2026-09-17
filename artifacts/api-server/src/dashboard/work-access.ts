import { hasCapability } from "@workspace/api-zod/business-access";
import type { Actor } from "./access";
import { requireAnyCapability, HttpError } from "./policy";

export function requireWorkRead(a: Actor) {
  if (a.role === "client" || a.role === "crew") return;
  requireAnyCapability(a, ["workspace.my-day", "operations.schedule"]);
}
export function requireFieldWork(a: Actor) {
  if (a.role === "client") throw new HttpError(403, "Access denied");
  requireWorkRead(a);
}
/** My Day grants only assigned work. The Schedule tool grants the office calendar. */
export function assignedWorkOnly(a: Actor) {
  return a.role === "crew" || (a.role !== "client" && !hasCapability(a, "operations.schedule"));
}
