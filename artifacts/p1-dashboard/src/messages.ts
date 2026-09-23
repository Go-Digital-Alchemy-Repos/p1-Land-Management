const known: Record<string, string> = {
  feature_disabled: "This feature is not available right now.",
  billing_draft_changed: "This invoice draft changed. Refresh and review it again.",
  already_invoiced_externally: "This draft has already been marked invoiced. Refresh to see it.",
  posting_outcome_requires_review: "A prior accounting posting needs finance review before this can be marked invoiced.",
  operation_id_conflict: "This action could not be retried. Refresh and try again.",
  "Access denied": "Your account does not have access to this action.",
  "Invalid input": "Check the highlighted fields and try again.",
  "Endpoint not found": "This page or action is unavailable.",
  "User switch expired": "User switching expired. You are back in your Owner account.",
  "Impersonation is no longer available": "User switching is no longer available. You are back in your Owner account.",
};

export function messageForApiError(code: unknown, requestId: string | null): string {
  if (typeof code === "string" && known[code]) return known[code];
  const id = requestId && /^[\w-]{8,64}$/.test(requestId) ? requestId : "unavailable";
  return `Something went wrong. Try again, or send this ID to support: ${id}.`;
}
