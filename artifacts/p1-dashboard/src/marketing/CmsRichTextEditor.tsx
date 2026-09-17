import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TiptapImage from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { MediaLibrary } from "./MediaLibrary";
import "./cms-rich-text.css";

type RichTextAlign = "left" | "center" | "right";

const TEXT_ALIGN_EXTENSION = Extension.create({
  name: "cmsTextAlign",
  addGlobalAttributes() {
    return [
      {
        types: ["heading", "paragraph"],
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element) => element.style.textAlign || null,
            renderHTML: (attributes) => {
              if (!attributes.textAlign) return {};
              return { style: `text-align: ${attributes.textAlign}` };
            },
          },
        },
      },
    ];
  },
});

const IMAGE_ALIGN_CLASS: Record<RichTextAlign, string> = {
  left: "cms-richtext-media cms-richtext-media-left",
  center: "cms-richtext-media cms-richtext-media-center",
  right: "cms-richtext-media cms-richtext-media-right",
};

const CmsImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center",
        parseHTML: (element) => {
          const align = element.getAttribute("data-align");
          return align === "left" || align === "right" || align === "center"
            ? align
            : "center";
        },
        renderHTML: (attributes) => {
          const align =
            attributes.align === "left" || attributes.align === "right"
              ? attributes.align
              : "center";
          return {
            "data-align": align,
            class: IMAGE_ALIGN_CLASS[align as RichTextAlign],
          };
        },
      },
    };
  },
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("img");
      const apply = (attrs: Record<string, unknown>) => {
        const source = String(attrs.src || "");
        dom.src =
          source.startsWith("/") && !source.startsWith("//")
            ? new URL(source, "https://www.p1landmanagement.com").href
            : source;
        dom.alt = String(attrs.alt || "");
        dom.className =
          IMAGE_ALIGN_CLASS[(attrs.align as RichTextAlign) || "center"] ||
          IMAGE_ALIGN_CLASS.center;
      };
      apply(node.attrs);
      return {
        dom,
        update(next) {
          if (next.type !== node.type) return false;
          apply(next.attrs);
          return true;
        },
      };
    };
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
    ];
  },
});

const EMOJI_LIST = [
  "😀",
  "😂",
  "😊",
  "😍",
  "🥰",
  "🤔",
  "😢",
  "😎",
  "😤",
  "🙏",
  "👍",
  "👋",
  "👏",
  "🤝",
  "💪",
  "✌️",
  "🖐️",
  "👌",
  "🤞",
  "❤️",
  "🎉",
  "✨",
  "🔥",
  "⭐",
  "💡",
  "📝",
  "🗓️",
  "⏰",
  "🌟",
  "💎",
  "✅",
  "❌",
  "⚠️",
  "ℹ️",
  "📌",
  "🔗",
  "📊",
  "📈",
  "💬",
  "🌍",
  "🧠",
  "💼",
  "🏆",
  "🎯",
  "🚀",
  "🌱",
  "☀️",
  "🌈",
  "🎶",
  "📚",
];

/** Same CMS editor engine and HTML contract as the retained admin. */
export function CmsRichTextEditor({
  value,
  onChange,
  canUseMedia = false,
  disabled = false,
  label = "Full biography",
  blogMode = false,
  galleries = [],
}: {
  value: string;
  onChange: (value: string) => void;
  canUseMedia?: boolean;
  disabled?: boolean;
  label?: string;
  blogMode?: boolean;
  galleries?: { id: string; title: string }[];
}) {
  const [mode, setMode] = useState("visual"),
    [linkPanel, setLinkPanel] = useState(false),
    [imagePanel, setImagePanel] = useState(false),
    [linkUrl, setLinkUrl] = useState(""),
    [linkText, setLinkText] = useState(""),
    [newTab, setNewTab] = useState(false),
    [imageUrl, setImageUrl] = useState(""),
    [imageAlt, setImageAlt] = useState(""),
    [imageAlign, setImageAlign] = useState<RichTextAlign>("center"),
    [mediaOpen, setMediaOpen] = useState(false),
    [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const [, rerender] = useState(0);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
        underline: false,
        heading: { levels: blogMode ? [1, 2, 3] : [2, 3] },
      }),
      TEXT_ALIGN_EXTENSION,
      Underline,
      CmsImage.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Write and format your content…" }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onSelectionUpdate: () => rerender((n) => n + 1),
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
        class: "cms-richtext-input",
      },
    },
  });
  useEffect(() => {
    if (editor && value !== editor.getHTML())
      editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);
  useEffect(() => {
    if (mediaOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [mediaOpen]);
  const button = (name: string, action: () => void, active = false) => (
    <button
      key={name}
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={action}
    >
      {name}
    </button>
  );
  function safeUrl(url: string, image = false) {
    return (
      !/[\\\s\u0000-\u001f\u007f]/.test(url) &&
      (/^\/(?!\/)/.test(url) ||
        (!image && /^(#|mailto:|tel:)/.test(url)) ||
        /^https?:\/\//i.test(url))
    );
  }
  function applyLink() {
    if (!editor) return;
    let url = linkUrl.trim();
    if (!safeUrl(url)) {
      setError(
        "Use an HTTP(S) URL, internal path, email, phone or page anchor.",
      );
      return;
    }
    const attrs = {
      href: url,
      target: newTab ? "_blank" : null,
      rel: newTab ? "noopener noreferrer" : null,
    };
    if (editor.state.selection.empty && linkText.trim())
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: linkText,
          marks: [{ type: "link", attrs }],
        })
        .run();
    else editor.chain().focus().extendMarkRange("link").setLink(attrs).run();
    setLinkPanel(false);
    setError("");
  }
  function applyImage() {
    if (!editor) return;
    if (!safeUrl(imageUrl, true)) {
      setError("Use an HTTP(S) image URL or an internal path.");
      return;
    }
    editor
      .chain()
      .focus()
      .insertContent({
        type: "image",
        attrs: { src: imageUrl, alt: imageAlt, align: imageAlign },
      })
      .run();
    setImagePanel(false);
    setError("");
  }
  return (
    <div className="cms-richtext">
      <div role="group" aria-label="Editor mode">
        {button("Visual", () => setMode("visual"), mode === "visual")}
        {button("HTML", () => setMode("html"), mode === "html")}
      </div>
      {error && <p role="alert">{error}</p>}
      {mode === "html" ? (
        <textarea
          aria-label={`${label} HTML`}
          value={value}
          maxLength={blogMode ? undefined : 30000}
          rows={12}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <>
          <div
            className="cms-richtext-toolbar"
            role="toolbar"
            aria-label={`${label} formatting`}
          >
            {editor && (
              <>
                {blogMode && (
                  <>
                    {button(
                      "Heading 1",
                      () =>
                        editor
                          .chain()
                          .focus()
                          .toggleHeading({ level: 1 })
                          .run(),
                      editor.isActive("heading", { level: 1 }),
                    )}
                    {button(
                      "Inline code",
                      () => editor.chain().focus().toggleCode().run(),
                      editor.isActive("code"),
                    )}
                    {button(
                      "Code block",
                      () => editor.chain().focus().toggleCodeBlock().run(),
                      editor.isActive("codeBlock"),
                    )}
                    {button("Divider", () =>
                      editor.chain().focus().setHorizontalRule().run(),
                    )}
                    <label>
                      Emoji
                      <select
                        aria-label="Insert emoji"
                        disabled={disabled}
                        value=""
                        onChange={(event) => {
                          if (event.target.value)
                            editor
                              .chain()
                              .focus()
                              .insertContent(event.target.value)
                              .run();
                        }}
                      >
                        <option value="">Choose emoji</option>
                        {EMOJI_LIST.map((emoji) => (
                          <option key={emoji}>{emoji}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Gallery
                      <select
                        aria-label="Insert published gallery"
                        disabled={disabled}
                        value=""
                        onChange={(event) => {
                          const gallery = galleries.find(
                            (item) => item.id === event.target.value,
                          );
                          if (gallery)
                            editor
                              .chain()
                              .focus()
                              .insertContent({
                                type: "paragraph",
                                content: [
                                  {
                                    type: "text",
                                    text: `[gallery id="${gallery.id}"]`,
                                  },
                                ],
                              })
                              .run();
                        }}
                      >
                        <option value="">Choose gallery</option>
                        {galleries.map((gallery) => (
                          <option key={gallery.id} value={gallery.id}>
                            {gallery.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                {button(
                  "Paragraph",
                  () => editor.chain().focus().setParagraph().run(),
                  editor.isActive("paragraph"),
                )}
                {button(
                  "Heading 2",
                  () =>
                    editor.chain().focus().toggleHeading({ level: 2 }).run(),
                  editor.isActive("heading", { level: 2 }),
                )}
                {button(
                  "Heading 3",
                  () =>
                    editor.chain().focus().toggleHeading({ level: 3 }).run(),
                  editor.isActive("heading", { level: 3 }),
                )}
                {button(
                  "Bold",
                  () => editor.chain().focus().toggleBold().run(),
                  editor.isActive("bold"),
                )}
                {button(
                  "Italic",
                  () => editor.chain().focus().toggleItalic().run(),
                  editor.isActive("italic"),
                )}
                {button(
                  "Underline",
                  () => editor.chain().focus().toggleUnderline().run(),
                  editor.isActive("underline"),
                )}
                {button(
                  "Strike",
                  () => editor.chain().focus().toggleStrike().run(),
                  editor.isActive("strike"),
                )}
                {button(
                  "Bulleted list",
                  () => editor.chain().focus().toggleBulletList().run(),
                  editor.isActive("bulletList"),
                )}
                {button(
                  "Numbered list",
                  () => editor.chain().focus().toggleOrderedList().run(),
                  editor.isActive("orderedList"),
                )}
                {button(
                  "Quote",
                  () => editor.chain().focus().toggleBlockquote().run(),
                  editor.isActive("blockquote"),
                )}
                {(["left", "center", "right"] as const).map((align) =>
                  button(`Align ${align}`, () =>
                    editor
                      .chain()
                      .focus()
                      .updateAttributes(
                        editor.isActive("heading") ? "heading" : "paragraph",
                        { textAlign: align },
                      )
                      .run(),
                  ),
                )}
                {button("Link", () => {
                  const attrs = editor.getAttributes("link");
                  setLinkUrl(attrs.href || "");
                  setLinkText("");
                  setNewTab(attrs.target === "_blank");
                  setLinkPanel(true);
                })}
                {button("Remove link", () =>
                  editor.chain().focus().unsetLink().run(),
                )}
                {button("Image", () => {
                  const attrs = editor.getAttributes("image");
                  setImageUrl(attrs.src || "");
                  setImageAlt(attrs.alt || "");
                  setImageAlign(attrs.align || "center");
                  setImagePanel(true);
                })}
                {button("Undo", () => editor.chain().focus().undo().run())}
                {button("Redo", () => editor.chain().focus().redo().run())}
              </>
            )}
          </div>
          <EditorContent editor={editor} />
        </>
      )}
      {linkPanel && (
        <fieldset disabled={disabled}>
          <legend>Link</legend>
          <label>
            Link URL
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </label>
          <label>
            Link text (when nothing is selected)
            <input
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={newTab}
              onChange={(e) => setNewTab(e.target.checked)}
            />
            Open in new tab
          </label>
          {button("Apply link", applyLink)}
          {button("Cancel link", () => setLinkPanel(false))}
        </fieldset>
      )}
      {imagePanel && (
        <fieldset disabled={disabled}>
          <legend>Embedded image</legend>
          <label>
            Image URL
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </label>
          <label>
            Image description
            <input
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
            />
          </label>
          <label>
            Image alignment
            <select
              aria-label="Image alignment"
              value={imageAlign}
              onChange={(e) => setImageAlign(e.target.value as RichTextAlign)}
            >
              <option>left</option>
              <option>center</option>
              <option>right</option>
            </select>
          </label>
          {canUseMedia &&
            button("Choose embedded image", () => setMediaOpen(true))}
          {button("Apply image", applyImage)}
          {button("Cancel image", () => setImagePanel(false))}
        </fieldset>
      )}
      <dialog
        ref={dialog}
        className="media-picker"
        aria-label="Choose biography image"
        onCancel={() => setMediaOpen(false)}
      >
        <button type="button" onClick={() => setMediaOpen(false)}>
          Close image picker
        </button>
        {mediaOpen && canUseMedia && (
          <MediaLibrary
            acceptAsset={(asset) => asset.mimeType.startsWith("image/")}
            onSelect={(asset) => {
              setImageUrl(asset.url);
              setImageAlt(asset.alt || "");
              setMediaOpen(false);
            }}
          />
        )}
      </dialog>
    </div>
  );
}
