export class AuthRequestFailure extends Error {
  constructor(public status: number) {
    super("Sign-in verification failed. Check your details and try again.");
  }
}
import type { CredentialStore } from "./session";
const actions = [
  "sign-in/email",
  "two-factor/verify-totp",
  "two-factor/verify-backup-code",
  "two-factor/enable",
  "sign-out",
  "get-session",
] as const;
type Action = (typeof actions)[number];
/** Auth-only challenge memory; never a business API credential. */
export class AuthProtocol {
  private challenge: string | null = null;
  private token: string | null = null;
  private generation = 0;
  private writes: Promise<void> = Promise.resolve();
  private mutate(action: () => Promise<void>) {
    const write = this.writes.then(action, action);
    this.writes = write.catch(() => {});
    return write;
  }
  constructor(
    readonly origin: string,
    private store: CredentialStore,
    private fetcher: typeof fetch,
  ) {
    const url = new URL(origin);
    if (url.protocol !== "https:" || url.origin !== origin)
      throw new Error("Invalid authentication origin.");
  }
  async restore() {
    const generation = this.generation;
    const value = await this.store.read();
    if (generation === this.generation) this.token = value;
    return this.token;
  }
  getToken() {
    return this.token;
  }
  async clear() {
    this.generation++;
    this.challenge = null;
    this.token = null;
    await this.mutate(() => this.store.remove());
  }
  private inFlight = false;
  async call(action: Action, body: unknown) {
    if (this.inFlight)
      throw new Error("An authentication request is already pending.");
    this.inFlight = true;
    try {
      return await this.perform(action, body);
    } finally {
      this.inFlight = false;
    }
  }
  private async perform(action: Action, body: unknown) {
    if (action === "sign-in/email") await this.clear();
    if (!actions.includes(action))
      throw new Error("Unsupported authentication action.");
    const generation = this.generation;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Origin: this.origin,
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (
      this.challenge &&
      ["two-factor/verify-totp", "two-factor/verify-backup-code"].includes(
        action,
      )
    ) {
      headers.Cookie = this.challenge;
      headers.Origin = this.origin;
    }
    const response = await this.fetcher(`${this.origin}/api/auth/${action}`, {
      method: action === "get-session" ? "GET" : "POST",
      body: action === "get-session" ? undefined : JSON.stringify(body),
      headers,
      credentials: "omit",
      redirect: "error",
    });
    if (response.redirected)
      throw new Error("Authentication redirect refused.");
    const result = await response.json();
    if (generation !== this.generation)
      throw new Error("Authentication session changed.");
    if (!response.ok) throw new AuthRequestFailure(response.status);
    if (result.twoFactorRedirect) {
      const match = (response.headers.get("set-cookie") || "").match(
        /(?:^|,\s*)(__Secure-p1-dashboard\.two_factor=[^;,]+)/,
      );
      if (!match)
        throw new Error("This device could not establish the MFA challenge.");
      this.challenge = match[1];
      this.token = null;
      return { challenge: true as const };
    }
    const token = response.headers.get("set-auth-token");
    if (token) {
      await this.mutate(async () => {
        if (generation !== this.generation)
          throw new Error("Authentication session changed.");
        await this.store.write(token);
      });
      if (generation !== this.generation)
        throw new Error("Authentication session changed.");
      this.token = token;
      this.challenge = null;
    }
    return { challenge: false as const, result };
  }
}
