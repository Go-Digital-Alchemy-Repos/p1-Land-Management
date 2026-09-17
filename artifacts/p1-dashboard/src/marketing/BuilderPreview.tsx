import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CMS_BUILDER_PREVIEW_PATH,
  CMS_BUILDER_PREVIEW_VERSION,
  parseBuilderPreviewMessage,
} from "../../../../platform/p1-core/shared/cms-builder/preview";

export function BuilderPreview({
  previewUrl,
  blocks,
  label = "section",
  form,
}: {
  previewUrl?: string | null;
  blocks: unknown[];
  label?: "section" | "page" | "form";
  form?: Record<string, unknown>;
}) {
  const [device, setDevice] = useState<"Desktop" | "Tablet" | "Mobile">(
    "Desktop",
  );
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("Connecting to website preview…");
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const revision = useRef(0);
  const latest = useRef(blocks);
  latest.current = blocks;
  const latestForm = useRef(form);
  latestForm.current = form;
  const target = useMemo(() => {
    try {
      const url = new URL(previewUrl || "");
      if (
        url.protocol !== "https:" ||
        url.hostname.includes("*") ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== CMS_BUILDER_PREVIEW_PATH
      )
        return null;
      const channel = crypto.randomUUID();
      url.hash = new URLSearchParams({ channel }).toString();
      return { url, channel };
    } catch {
      return null;
    }
  }, [previewUrl, attempt]);
  const send = useCallback(() => {
    if (!target || !ready.current) return;
    const payload = parseBuilderPreviewMessage({
      type: "p1:builder-preview",
      version: CMS_BUILDER_PREVIEW_VERSION,
      channel: target.channel,
      revision: ++revision.current,
      blocks: latest.current,
      ...(latestForm.current ? { form: latestForm.current } : {}),
    });
    if (!payload) {
      setStatus(
        "Preview could not update: this draft exceeds the preview limits or contains invalid blocks. Your editor draft is unchanged.",
      );
      return;
    }
    frame.current?.contentWindow?.postMessage(payload, target.url.origin);
    setStatus(
      "Draft preview. Links, forms and embedded video players are disabled.",
    );
  }, [target]);
  useLayoutEffect(() => {
    ready.current = false;
    setStatus("Connecting to website preview…");
    if (!target) return;
    const timeout = window.setTimeout(() => {
      if (!ready.current)
        setStatus(
          "The website preview did not connect. Retry, or ask the workspace owner to check the preview connection. Your draft is unchanged.",
        );
    }, 15000);
    const receive = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== target.url.origin ||
        event.data?.type !== "p1:builder-preview-ready" ||
        event.data?.version !== CMS_BUILDER_PREVIEW_VERSION ||
        event.data?.channel !== target.channel
      )
        return;
      ready.current = true;
      window.clearTimeout(timeout);
      send();
    };
    window.addEventListener("message", receive);
    return () => {
      ready.current = false;
      window.clearTimeout(timeout);
      window.removeEventListener("message", receive);
    };
  }, [target, send]);
  useEffect(send, [blocks, form, send]);
  if (!target)
    return (
      <p role="status">
        Website preview is not configured yet. You can continue editing and
        saving.
      </p>
    );
  return (
    <section className="builder-preview" aria-label={`${label} draft preview`}>
      <div className="section-actions" role="group" aria-label="Preview device">
        {(["Desktop", "Tablet", "Mobile"] as const).map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={device === value}
            onClick={() => setDevice(value)}
          >
            {value}
          </button>
        ))}
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>
          Retry preview
        </button>
      </div>
      <p role="status">{status}</p>
      <div className="builder-preview-scroll">
        <iframe
          key={target.channel}
          ref={frame}
          title={`${device} ${label} preview`}
          src={target.url.href}
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          style={{ width: { Desktop: 1280, Tablet: 834, Mobile: 430 }[device] }}
        />
      </div>
    </section>
  );
}
