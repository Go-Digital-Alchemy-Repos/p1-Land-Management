import { hasCapability } from "@workspace/api-zod/business-access";
const transitions: Record<string, readonly string[]> = {
  new: ["triaged", "closed", "cancelled"],
  triaged: ["scheduled", "closed", "cancelled"],
  scheduled: ["triaged", "closed", "cancelled"],
  converted: [],
  closed: [],
  cancelled: [],
};

export function serviceRequestUiPolicy(role: string | null | undefined, capabilities: readonly string[] = []) {
  if (role === "client") return "minimized" as const;
  if (role === "crew") return "none" as const;
  if (hasCapability({role: role || null, capabilities}, "customers.requests"))
    return "manage" as const;
  return "none" as const;
}

export function serviceRequestTransitionTargets(status: string) {
  return transitions[status] || [];
}

export function canPrepareServiceRequestDraft(
  role: string | null | undefined,
  status: string | null | undefined,
  capabilities: readonly string[] = [],
) {
  return (
    serviceRequestUiPolicy(role, capabilities) === "manage" &&
    hasCapability({role: role || null, capabilities}, "operations.schedule") &&
    (status === "triaged" || status === "scheduled")
  );
}
