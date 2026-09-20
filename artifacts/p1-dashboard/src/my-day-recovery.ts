/** A connectivity failure may retain downloaded work; access failures never do. */
export function isTransientRefreshFailure(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return (
    typeof status === "number" &&
    [408, 429, 500, 502, 503, 504].includes(status)
  );
}
export async function refreshEntries(
  tasks: Array<Promise<readonly [string, unknown]>>,
) {
  const results = await Promise.allSettled(tasks);
  const errors = results.flatMap((result) =>
    result.status === "rejected" ? [result.reason] : [],
  );
  // An earlier transient rejection must not hide a concurrent access rejection.
  if (errors.length)
    throw (
      errors.find((error) => !isTransientRefreshFailure(error)) ?? errors[0]
    );
  return results.map(
    (result) =>
      (result as PromiseFulfilledResult<readonly [string, unknown]>).value,
  );
}
