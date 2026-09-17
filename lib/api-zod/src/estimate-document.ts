/** Customer review and exported documents must identify the same expiry instant. */
export function formatEstimateExpiry(value: string | Date): string {
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(value)) + " UTC"
  );
}
