const transitions: Record<string, readonly string[]> = {
  new: ["triaged", "closed", "cancelled"],
  triaged: ["scheduled", "closed", "cancelled"],
  scheduled: ["triaged", "closed", "cancelled"],
  converted: [],
  closed: [],
  cancelled: [],
};

export function serviceRequestUiPolicy(role: string | null | undefined) {
  if (role === "client") return "minimized" as const;
  if (role === "crew") return "none" as const;
  if (["owner", "manager", "dispatch"].includes(role || ""))
    return "manage" as const;
  return "read" as const;
}

export function serviceRequestTransitionTargets(status: string) {
  return transitions[status] || [];
}

export function canPrepareServiceRequestDraft(
  role: string | null | undefined,
  status: string | null | undefined,
) {
  return (
    serviceRequestUiPolicy(role) === "manage" &&
    (status === "triaged" || status === "scheduled")
  );
}
