import React, { useEffect, useRef, useState } from "react";

/** Email fragments retain tables and inline styles; no schema conversion or automatic save. */
export function EmailVisualEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (html: string) => void;
  disabled: boolean;
}) {
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
  function link() {
    const doc = frame.current?.contentDocument;
    const selection = doc?.getSelection();
    const range = selection?.rangeCount
      ? selection.getRangeAt(0).cloneRange()
      : null;
    const entered = window.prompt(
      "Link URL (https://, http://, mailto: or tel:)",
    );
    if (!entered || !/^(https?:\/\/|mailto:|tel:)/i.test(entered.trim()))
      return;
    if (range && selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    command("createLink", entered.trim());
  }
  const commands: [string, string, string?][] = [
    ["Paragraph", "formatBlock", "p"],
    ["Heading", "formatBlock", "h2"],
    ["Bold", "bold"],
    ["Italic", "italic"],
    ["Underline", "underline"],
    ["Bulleted list", "insertUnorderedList"],
    ["Numbered list", "insertOrderedList"],
    ["Clear formatting", "removeFormat"],
  ];
  return (
    <div>
      <div
        className="email-template-toolbar"
        role="toolbar"
        aria-label="Visual email formatting"
      >
        {commands.map(([label, name, argument]) => (
          <button
            key={name + (argument ?? "")}
            type="button"
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => command(name, argument)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={link}
        >
          Insert link
        </button>
      </div>
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
}
