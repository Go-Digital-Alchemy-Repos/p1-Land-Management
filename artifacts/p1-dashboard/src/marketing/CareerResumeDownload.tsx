import { useEffect, useRef, useState } from "react";
import { downloadMarketingCareerResume } from "@workspace/api-client-react/dashboard";

export function CareerResumeDownload({
  id,
  fileName,
}: {
  id: string;
  fileName: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);
  const urls = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(
    () => () => {
      pending.current?.abort();
      pending.current = null;
      for (const [url, timer] of urls.current) {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      }
      urls.current.clear();
    },
    [id],
  );

  async function download() {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const blob = await downloadMarketingCareerResume(encodeURIComponent(id), {
        signal: controller.signal,
        cache: "no-store",
      });
      if (controller.signal.aborted || pending.current !== controller) return;
      if (!(blob instanceof Blob) || !blob.size || blob.size > 11 * 1024 * 1024)
        throw new Error("Invalid resume response");
      const url = URL.createObjectURL(blob);
      const timer = setTimeout(() => {
        URL.revokeObjectURL(url);
        urls.current.delete(url);
      }, 60000);
      urls.current.set(url, timer);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName.replace(/[\x00-\x1f\x7f/\\]/g, "_") || "resume";
      document.body.append(link);
      link.click();
      link.remove();
    } catch (cause) {
      if (pending.current !== controller) return;
      const status = (cause as { status?: number }).status;
      setError(
        status === 404
          ? "This resume is unavailable. Refresh the application or contact the owner."
          : status === 401 || status === 403
            ? "Your access has changed. Sign in again or contact the owner."
            : "The resume could not be downloaded. Please try again.",
      );
    } finally {
      clearTimeout(timeout);
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
        if (controller.signal.aborted)
          setError("The resume download timed out. Please try again.");
      }
    }
  }
  return (
    <div>
      <button type="button" disabled={busy} onClick={() => void download()}>
        {busy ? "Downloading resume…" : "Download resume"}
      </button>
      {error && <p role="alert">{error} Your review edits are unchanged.</p>}
    </div>
  );
}
