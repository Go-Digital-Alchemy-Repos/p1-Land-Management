import { useEffect, useRef, useState } from "react";
import { PHONE_DISPLAY, PHONE_HREF } from "../../lib/site";
type Api = {
  render: (node: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Api;
  }
}
let loading: Promise<Api> | undefined;
function loadApi(): Promise<Api> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    const timer = setTimeout(() => done(false), 15000);
    function done(ok: boolean) {
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (ok && window.turnstile) resolve(window.turnstile);
      else {
        script.remove();
        loading = undefined;
        reject(Error("Verification unavailable"));
      }
    }
    script.onload = () => done(true);
    script.onerror = () => done(false);
    document.head.append(script);
  });
  return loading;
}
async function readConfig(response: Response) {
  if (!response.body) throw Error("Invalid configuration");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) throw Error("Invalid configuration");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
export function isPublicFormPreview() {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("cmsPreview")
  );
}
/** Tokens are transient headers only: response-field=false keeps them out of FormData. */
export function usePublicFormVerification(preview = false) {
  const container = useRef<HTMLDivElement>(null),
    token = useRef(""),
    mode = useRef<"loading" | "disabled" | "enabled">("loading");
  const [attempt, setAttempt] = useState(0),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true,
      widget: string | undefined,
      api: Api | undefined;
    token.current = "";
    mode.current = "loading";
    setReady(false);
    setError("");
    if (preview) return;
    const abort = new AbortController(),
      timer = setTimeout(() => abort.abort(), 15000);
    const fail = () => {
      if (live) {
        token.current = "";
        setReady(false);
        setError("Verification is unavailable. Retry below or call P1.");
      }
    };
    void (async () => {
      const response = await fetch("/api/forms/turnstile-config", {
        credentials: "omit",
        redirect: "error",
        cache: "no-store",
        signal: abort.signal,
      });
      if (!response.ok) throw Error("Configuration unavailable");
      const config = await readConfig(response);
      if (
        !config ||
        Object.keys(config).sort().join(",") !== "action,enabled,siteKey" ||
        typeof config.enabled !== "boolean" ||
        config.action !== "public_form" ||
        (config.enabled
          ? typeof config.siteKey !== "string" ||
            !/^[A-Za-z0-9_-]{1,100}$/.test(config.siteKey)
          : config.siteKey !== null)
      )
        throw Error("Invalid configuration");
      if (!live) return;
      if (!config.enabled) {
        mode.current = "disabled";
        setReady(true);
        return;
      }
      mode.current = "enabled";
      api = await loadApi();
      if (!live || !container.current) return;
      widget = api.render(container.current, {
        sitekey: config.siteKey,
        action: "public_form",
        size: "flexible",
        theme: "light",
        "response-field": false,
        callback: (value: string) => {
          if (live) {
            token.current =
              typeof value === "string" && value.length <= 2048 ? value : "";
            setReady(Boolean(token.current));
            setError("");
          }
        },
        "expired-callback": () => {
          if (live) {
            token.current = "";
            setReady(false);
            setError("Verification expired. Please retry verification.");
          }
        },
        "error-callback": fail,
        "timeout-callback": fail,
      });
    })()
      .catch(fail)
      .finally(() => clearTimeout(timer));
    return () => {
      live = false;
      clearTimeout(timer);
      abort.abort();
      token.current = "";
      mode.current = "loading";
      if (widget !== undefined) api?.remove(widget);
    };
  }, [attempt, preview]);
  function headers(): Record<string, string> {
    if (
      preview ||
      mode.current === "loading" ||
      (mode.current === "enabled" && !token.current)
    )
      throw Error(
        "Complete verification before sending, or retry verification below.",
      );
    return token.current ? { "X-Turnstile-Token": token.current } : {};
  }
  function reset() {
    token.current = "";
    mode.current = "loading";
    setReady(false);
    setAttempt((v) => v + 1);
  }
  const control = preview ? (
    <p role="status">Preview only. Submissions are disabled.</p>
  ) : (
    <div aria-label="Form verification" className="space-y-2 min-w-0">
      <div ref={container} style={{ width: "100%", minWidth: 0 }} />
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={reset}
            className="underline font-semibold"
          >
            Retry verification
          </button>
          {" · "}
          <a href={PHONE_HREF} className="underline">
            Call {PHONE_DISPLAY}
          </a>
        </div>
      ) : !ready ? (
        <p role="status">Preparing verification…</p>
      ) : null}
    </div>
  );
  return { control, ready, headers, reset };
}
