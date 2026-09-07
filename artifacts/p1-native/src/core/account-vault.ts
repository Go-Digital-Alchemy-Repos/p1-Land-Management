export interface ScopedResource {
  origin: string;
  accountId: string;
  close(): Promise<void>;
}
/** Session references are detached immediately; encrypted data stays for its owner. */
export class AccountVault<T extends ScopedResource> {
  private resource: T | null = null;
  get current() {
    return this.resource;
  }
  attach(resource: T) {
    if (this.resource && this.resource !== resource)
      throw new Error("Detach previous protected workspace first.");
    this.resource = resource;
  }
  require(origin: string, accountId: string) {
    if (
      !this.resource ||
      this.resource.origin !== origin ||
      this.resource.accountId !== accountId
    )
      throw new Error("Protected work is locked for this account.");
    return this.resource;
  }
  async detach() {
    const previous = this.resource;
    this.resource = null;
    await previous?.close();
  }
}
