import { EmailFormattingToolbar } from "../../../../platform/p1-core/client/src/components/shared/email-template-editor-presentation";
import { sidebarPrimitives as emailUI } from "./sidebar-primitives";
import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

/** Email fragments retain tables and inline styles; no schema conversion or automatic save. */
export type EmailVisualEditorHandle = { insertText: (text: string) => void };
export const EmailVisualEditor = forwardRef<
  EmailVisualEditorHandle,
  { value: string; onChange: (html: string) => void; disabled: boolean }
>(function EmailVisualEditor(
  {
    value,
    onChange,
    disabled,
  }: {
    value: string;
    onChange: (html: string) => void;
    disabled: boolean;
  },
  ref,
) {
  const frame = useRef<HTMLIFrameElement>(null);
  const last = useRef(value);
  const change = useRef(onChange);
  change.current = onChange;
  const [initial] = useState(
    () =>
      `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: https://www.p1landmanagement.com https://p1landmanagement.com https://dashboard.p1landmanagement.com; base-uri 'none'; form-action 'none'"><style>body{padding:16px;font:15px/1.6 Arial,sans-serif;color:#171717;overflow-wrap:anywhere}img{max-width:100%}</style></head><body>${value}</body></html>`,
  );
  function update() {
    const html = frame.current?.contentDocument?.body.innerHTML;
    if (html !== undefined) {
      last.current = html;
      change.current(html);
    }
  }
  function initialize() {
    const body = frame.current?.contentDocument?.body;
    if (!body) return;
    body.contentEditable = String(!disabled);
    body.setAttribute("role", "textbox");
    body.setAttribute("aria-label", "Visual email body");
    body.setAttribute("aria-multiline", "true");
    body.addEventListener("input", update);
    body.addEventListener("click", (event) => {
      if ((event.target as Element).closest("a")) event.preventDefault();
    });
  }
  useEffect(() => {
    const body = frame.current?.contentDocument?.body;
    if (!body) return;
    body.contentEditable = String(!disabled);
    if (value !== last.current) {
      body.innerHTML = value;
      last.current = value;
    }
  }, [value, disabled]);
  function command(name: string, argument?: string) {
    const doc = frame.current?.contentDocument;
    if (!doc || disabled) return;
    frame.current?.contentWindow?.focus();
    doc.execCommand(name, false, argument);
    update();
  }
  const [linkUrl, setLinkUrl] = useState("");
  const [showLink, setShowLink] = useState(false);
  const rangeRef = useRef<Range | null>(null);
  function openLink() {
    const selection = frame.current?.contentDocument?.getSelection();
    rangeRef.current = selection?.rangeCount
      ? selection.getRangeAt(0).cloneRange()
      : null;
    setShowLink((v) => !v);
  }
  useImperativeHandle(ref, () => ({
    insertText: (text: string) => command("insertText", text),
  }));
  function link() {
    const doc = frame.current?.contentDocument;
    const selection = doc?.getSelection();
    const range = rangeRef.current;
    const entered = linkUrl;
    if (!entered || !/^(https?:\/\/|mailto:|tel:)/i.test(entered.trim()))
      return;
    if (range && selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    command("createLink", entered.trim());
    setShowLink(false);
    setLinkUrl("");
  }
  return (
    <div>
      <EmailFormattingToolbar
        ui={emailUI}
        disabled={disabled}
        applyCommand={command}
        onLink={openLink}
      />
      {showLink && (
        <div className="email-link-panel">
          <label>
            Link URL
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              disabled={disabled}
            />
          </label>
          <button
            type="button"
            disabled={disabled || !linkUrl.trim()}
            onClick={link}
          >
            Apply link
          </button>
          <p>Use https://, http://, mailto: or tel:.</p>
        </div>
      )}
      <iframe
        ref={frame}
        title="Visual email editor"
        sandbox="allow-same-origin"
        referrerPolicy="no-referrer"
        srcDoc={initial}
        onLoad={initialize}
      />
      <p className="email-template-caption">
        Edit email text and formatting here. Scripts and external resources are
        blocked. Use HTML mode for exact markup.
      </p>
    </div>
  );
});
