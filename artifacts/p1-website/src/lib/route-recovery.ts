/** Recover a stale lazy-route bundle once per minute, never loop on a broken release. */
export function recoverStaleRoute(error: unknown, browser: {
  storage: Pick<Storage, "getItem" | "setItem">;
  reload: () => void;
  now: () => number;
}): boolean {
  if (!(error instanceof Error) || !/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(error.message)) return false;
  try {
    const key = "p1-route-bundle-recovery";
    const previous = browser.storage.getItem(key);
    const now = browser.now();
    if (previous !== null && Number.isFinite(Number(previous)) && now - Number(previous) < 60_000) return false;
    browser.storage.setItem(key, String(now));
    browser.reload();
    return true;
  } catch {
    // Storage restrictions or navigation failure retain the visible manual recovery.
    return false;
  }
}
