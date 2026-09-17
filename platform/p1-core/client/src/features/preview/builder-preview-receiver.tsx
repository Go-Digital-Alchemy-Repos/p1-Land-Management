import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import {
  acceptBuilderPreviewMessage,
  createBuilderPreviewMessage,
  isBuilderPreviewOrigin,
  CMS_BUILDER_PREVIEW_VERSION,
} from "@shared/cms-builder/preview";
import { sanitizeBuilderPreviewBlocks } from "@shared/cms-builder/sanitize-preview";
import type { BlockInstance } from "@shared/cms-builder/block-registry.shared";
import { PublicFormRenderer } from "@/components/forms/public-form-renderer";
import { insertCmsFormSchema, type CmsForm } from "@shared/schema";
import { sanitizePublicCmsContent } from "@shared/sanitize-rich-html";
import { PublicPageRenderer } from "@/features/public/public-block-renderer";

class PreviewRenderBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="alert">This draft could not be previewed. Edit the block and try again.</p>
    ) : (
      this.props.children
    );
  }
}

/** Renderer-only receiver. Mount inside the dedicated preview runtime, never App.
 * The host must supply trusted origin configuration and install the read-only
 * network policy before mounting. This component neither reads nor saves drafts.
 */
export function BuilderPreviewReceiver({
  parentOrigin,
  channel,
  parentWindow = window.parent,
}: {
  parentOrigin: string;
  channel: string;
  parentWindow?: Window;
}) {
  const [draft, setDraft] = useState<{
    revision: number;
    blocks: BlockInstance[];
    form?: CmsForm;
  } | null>(null);
  const [error, setError] = useState("");
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setDraft(null);
    setError("");
    if (!isBuilderPreviewOrigin(parentOrigin) || parentWindow === window) {
      setError("Open this preview from the Business Center editor.");
      return;
    }
    try {
      createBuilderPreviewMessage(channel, 0, []);
    } catch {
      setError("Preview session is invalid. Reopen the preview.");
      return;
    }
    let revision = -1;
    const receive = (event: MessageEvent) => {
      const message = acceptBuilderPreviewMessage(event, {
        origin: parentOrigin,
        source: parentWindow,
        channel,
        afterRevision: revision,
      });
      if (!message) return;
      revision = message.revision;
      if (message.form) {
        const form = insertCmsFormSchema.safeParse(sanitizePublicCmsContent(message.form));
        if (!form.success) {
          setDraft(null);
          setError(
            "This form draft could not be previewed. Check its field settings and try again.",
          );
          return;
        }
        setError("");
        setDraft({
          revision,
          blocks: [],
          form: {
            ...form.data,
            id: "preview-form",
            description: form.data.description ?? null,
            createdAt: null,
            updatedAt: null,
          },
        });
      } else {
        setError("");
        setDraft({ revision, blocks: sanitizeBuilderPreviewBlocks(message.blocks) });
      }
    };
    window.addEventListener("message", receive);
    parentWindow.postMessage(
      {
        type: "p1:builder-preview-ready",
        version: CMS_BUILDER_PREVIEW_VERSION,
        channel,
      },
      parentOrigin,
    );
    return () => window.removeEventListener("message", receive);
  }, [parentOrigin, parentWindow, channel]);
  useEffect(() => {
    // Native inert also removes controls/links from keyboard focus and prevents
    // activation of embedded forms. The outer frame remains scrollable.
    content.current?.setAttribute("inert", "");
  }, []);
  return (
    <>
      {error && <p role="alert">{error}</p>}
      {!error && !draft && <p role="status">Waiting for editor preview…</p>}
      <div
        ref={content}
        data-builder-preview-content="true"
        onClickCapture={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onSubmitCapture={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {draft && (
          <PreviewRenderBoundary key={`${channel}:${draft.revision}`}>
            {draft.form ? (
              <PublicFormRenderer slug={draft.form.slug} formOverride={draft.form} />
            ) : (
              <PublicPageRenderer blocks={draft.blocks} />
            )}
          </PreviewRenderBoundary>
        )}
      </div>
    </>
  );
}
