/** SecureStore implementation is supplied by the native adapter, never SQLite. */
export interface CredentialStore {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  remove(): Promise<void>;
}
export type SessionState =
  | { phase: "signed-out" }
  | { phase: "checking" }
  | { phase: "challenge"; method: "totp-or-recovery" }
  | { phase: "locked"; reason: "expired" | "unavailable" | "key-unavailable" }
  | { phase: "authorized"; accountId: string };
/** Guards revalidation against account changes and responses arriving after expiry. */
export class SessionGate {
  state: SessionState = { phase: "signed-out" };
  private generation = 0;
  lock(reason: "expired" | "unavailable" | "key-unavailable") {
    this.generation++;
    this.state = { phase: "locked", reason };
  }
  challenge() {
    this.generation++;
    this.state = { phase: "challenge", method: "totp-or-recovery" };
  }
  async revalidate(check: () => Promise<{ id: string }>) {
    const generation = ++this.generation;
    this.state = { phase: "checking" };
    try {
      const person = await check();
      if (generation !== this.generation) return false;
      if (!person.id) throw new Error("Account identity missing.");
      this.state = { phase: "authorized", accountId: person.id };
      return true;
    } catch (error) {
      if (generation === this.generation)
        this.state = { phase: "locked", reason: "unavailable" };
      throw error;
    }
  }
  async signOut(
    pendingCount: () => Promise<number>,
    clearAccount: () => Promise<void>,
  ) {
    if ((await pendingCount()) !== 0)
      throw new Error(
        "Synchronize or resolve pending work before signing out.",
      );
    this.lock("expired");
    await clearAccount();
    this.state = { phase: "signed-out" };
  }
}
