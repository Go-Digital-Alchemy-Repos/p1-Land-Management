/** Account-bound business transport. Auth challenges use a separate adapter. */
export class SessionChanged extends Error {
  constructor() {
    super("Session changed. This response was discarded.");
  }
}
export class RequestFailure extends Error {
  constructor(public status: number) {
    super(`Request failed (${status}).`);
  }
}
export class RequestTimeout extends Error {
  constructor() {
    super(
      "Request timed out. Delivery is unconfirmed; saved work remains available for retry.",
    );
  }
}
export class RequestCancelled extends Error {
  constructor() {
    super(
      "Request cancelled. Delivery is unconfirmed; saved work remains available for retry.",
    );
  }
}
export const TRANSPORT_TIMEOUTS = Object.freeze({
  apiMs: 30_000,
  mediaMs: 120_000,
});
export type Binding = Readonly<{ accountId: string; token: string }>;
export class BusinessTransport {
  readonly origin: string;
  private generation = 0;
  private binding: Binding | null = null;
  private pending = new Set<AbortController>();
  constructor(
    origin: string,
    private fetcher: typeof fetch = fetch,
    private timeouts: Readonly<{
      apiMs: number;
      mediaMs: number;
    }> = TRANSPORT_TIMEOUTS,
  ) {
    for (const key of ["apiMs", "mediaMs"] as const) {
      if (
        !Number.isFinite(timeouts[key]) ||
        timeouts[key] <= 0 ||
        timeouts[key] > TRANSPORT_TIMEOUTS[key]
      )
        throw new Error(
          "Request deadlines must be finite and within the transport policy.",
        );
    }
    this.timeouts = Object.freeze({ ...timeouts });
    const url = new URL(origin);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    ) {
      throw new Error("A single HTTPS API origin is required.");
    }
    this.origin = url.origin;
  }
  bind(binding: Binding | null) {
    this.generation++;
    for (const request of this.pending) request.abort();
    this.pending.clear();
    this.binding = binding && Object.freeze({ ...binding });
  }
  async request<T>(
    path: string,
    init: RequestInit = {},
    responseType: "json" | "image" = "json",
  ): Promise<T> {
    if (
      !path.startsWith("/api/v1/") ||
      path.includes("\\") ||
      /[\r\n]/.test(path)
    )
      throw new Error("Invalid API path.");
    const url = new URL(path, this.origin);
    if (url.origin !== this.origin || !url.pathname.startsWith("/api/v1/"))
      throw new Error("Invalid API path.");
    if (!this.binding) throw new Error("Sign in before accessing work.");
    const binding = this.binding,
      generation = this.generation;
    const abort = new AbortController();
    let timedOut = false;
    const stoppedError = () =>
      generation !== this.generation
        ? new SessionChanged()
        : timedOut
          ? new RequestTimeout()
          : new RequestCancelled();
    const checkActive = () => {
      if (generation !== this.generation || abort.signal.aborted)
        throw stoppedError();
    };
    let rejectStopped!: (error: Error) => void;
    const stopped = new Promise<never>((_resolve, reject) => {
      rejectStopped = reject;
    });
    const onAbort = () => rejectStopped(stoppedError());
    abort.signal.addEventListener("abort", onAbort, { once: true });
    const cancel = () => abort.abort();
    init.signal?.addEventListener("abort", cancel, { once: true });
    this.pending.add(abort);
    const isMedia =
      responseType === "image" ||
      (url.pathname.startsWith("/api/v1/files/") &&
        init.body != null &&
        ["POST", "PUT"].includes((init.method || "GET").toUpperCase()));
    const timer = setTimeout(
      () => {
        timedOut = true;
        abort.abort();
      },
      isMedia ? this.timeouts.mediaMs : this.timeouts.apiMs,
    );
    try {
      if (init.signal?.aborted) {
        abort.abort();
        return await stopped;
      }
      const perform = async (): Promise<T> => {
        const headers = new Headers(init.headers);
        for (const prohibited of [
          "cookie",
          "origin",
          "authorization",
          "proxy-authorization",
        ])
          headers.delete(prohibited);
        headers.set("Authorization", `Bearer ${binding.token}`);
        headers.set("Accept", "application/json");
        const response = await this.fetcher(url.href, {
          ...init,
          headers,
          credentials: "omit",
          redirect: "error",
          cache: "no-store",
          signal: abort.signal,
        });
        checkActive();
        // Native acceptance must prove redirects are refused before a second request.
        if (
          response.redirected ||
          (response.url && new URL(response.url).origin !== this.origin)
        )
          throw new Error("Unexpected API redirect.");
        if (!response.ok) throw new RequestFailure(response.status);
        let result: unknown;
        if (responseType === "image") {
          const mime = response.headers.get("content-type")?.split(";")[0];
          if (
            !mime ||
            !["image/jpeg", "image/png", "image/webp"].includes(mime)
          )
            throw new Error("Unsupported private image response.");
          const bytes = new Uint8Array(await response.arrayBuffer());
          if (bytes.length > 15 * 1024 * 1024)
            throw new Error("Private image exceeds the viewing limit.");
          result = { mime, bytes };
        } else
          result = response.status === 204 ? undefined : await response.json();
        checkActive();
        return result as T;
      };
      return await Promise.race([perform(), stopped]);
    } finally {
      clearTimeout(timer);
      abort.signal.removeEventListener("abort", onAbort);
      this.pending.delete(abort);
      init.signal?.removeEventListener("abort", cancel);
    }
  }
}
