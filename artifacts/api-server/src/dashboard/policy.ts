import { hasCapability, type Capability, type CapabilitySubject } from "@workspace/api-zod/business-access";
import { createHash, timingSafeEqual } from "node:crypto";
export type Role =
  | "owner"
  | "member"
  | "manager"
  | "dispatch"
  | "sales"
  | "finance"
  | "crew"
  | "client";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
/** Office tools require explicit grants. Crew and client identities retain their scoped workflows. */
export function requireCapability(subject: CapabilitySubject, capability: Capability) {
  if (subject.role === "crew" || !hasCapability(subject, capability))
    throw new HttpError(403, "Access denied");
}
export function requireAnyCapability(subject: CapabilitySubject, capabilities: readonly Capability[]) {
  if (subject.role === "crew" || !capabilities.some(capability => hasCapability(subject, capability)))
    throw new HttpError(403, "Access denied");
}
export function requireRole(role: Role, allowed: Role[]) {
  if (!allowed.includes(role)) throw new HttpError(403, "Access denied");
}
export function verifyCode(
  code: string,
  hash: string | undefined,
  expires: string | undefined,
  now = Date.now(),
) {
  if (
    !hash ||
    !/^[a-f0-9]{64}$/.test(hash) ||
    !expires ||
    !Number.isFinite(Date.parse(expires)) ||
    Date.parse(expires) <= now
  )
    return false;
  return timingSafeEqual(
    createHash("sha256").update(code).digest(),
    Buffer.from(hash, "hex"),
  );
}
export function canDispatch(
  prerequisites: { label: string; done: boolean }[],
  override: string | undefined | null,
) {
  return prerequisites.every((p) => p.done) || Boolean(override?.trim());
}
export function transition(
  current: string,
  next: string,
  role: Role,
  prerequisites: { label: string; done: boolean }[],
  override?: string | null,
) {
  const allowed: Record<string, string[]> = {
    draft: ["scheduled", "cancelled"],
    scheduled: ["in_progress", "delayed", "skipped", "cancelled"],
    delayed: ["scheduled", "cancelled", "skipped"],
    in_progress: ["completed", "delayed", "cancelled"],
    completed: ["reviewed", "in_progress"],
    reviewed: [],
    cancelled: [],
    skipped: [],
  };
  if (!allowed[current]?.includes(next))
    throw new HttpError(409, "This status change is not allowed");
  if (next === "reviewed") requireRole(role, ["owner", "manager"]);
  if (next === "scheduled" && !canDispatch(prerequisites, override))
    throw new HttpError(409, "Complete job prerequisites before scheduling");
}
export function boundedMoney(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 100_000_000_00)
    throw new HttpError(400, "Invalid amount");
  return value;
}
