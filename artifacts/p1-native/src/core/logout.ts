/** Successful server revocation locks UI before any fallible local cleanup. */
export async function logoutAccount(steps: {
  pendingCount(): Promise<number>;
  signOut(): Promise<unknown>;
  detach(): Promise<void>;
  revokeOffline(): Promise<void>;
  clearAuth(): Promise<void>;
  destroy(): Promise<void>;
}) {
  if (await steps.pendingCount())
    throw new Error("Resolve pending work before signing out.");
  await steps.signOut();
  const detached = steps.detach(); // Must synchronously clear references and views.
  const results = await Promise.allSettled([
    detached,
    steps.revokeOffline(),
    steps.clearAuth(),
  ]);
  // Never destroy protected storage until durable offline revocation succeeded.
  if (results[1].status === "fulfilled") {
    results.push(...(await Promise.allSettled([steps.destroy()])));
  }
  if (results.some((result) => result.status === "rejected"))
    throw new Error(
      "Signed out. Protected work is locked, but device cleanup failed. Reconnect to recover it.",
    );
}
