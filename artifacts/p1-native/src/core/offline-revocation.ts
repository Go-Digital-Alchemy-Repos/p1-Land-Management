/** Independent deny marker survives a SecureStore deletion failure. */
export class OfflineRevocation {
  private denied = new Set<string>();
  constructor(
    private storage: {
      mark(origin: string): Promise<void>;
      marked(origin: string): Promise<boolean>;
      unmark(origin: string): Promise<void>;
      deleteEntry(origin: string): Promise<void>;
    },
  ) {}
  async revoke(origin: string) {
    this.denied.add(origin);
    const results = await Promise.allSettled([
      this.storage.mark(origin),
      this.storage.deleteEntry(origin),
    ]);
    if (results.every((result) => result.status === "rejected"))
      throw new Error(
        "Offline access is locked, but both device stores failed to record revocation. Reconnect before reopening this app.",
      );
  }
  async assertAllowed(origin: string) {
    if (this.denied.has(origin) || (await this.storage.marked(origin)))
      throw new Error(
        "Offline access was revoked. Sign in online to recover saved work.",
      );
  }
  /** Call only after fresh server verification and durable replacement metadata. */
  async verified(origin: string) {
    await this.storage.unmark(origin);
    this.denied.delete(origin);
  }
}
