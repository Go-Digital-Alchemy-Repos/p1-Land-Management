import { useEditor, EditorContent } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Images,
  Smile,
  Minus,
  Quote,
  Code2,
  Code,
  Undo2,
  Redo2,
  X,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { createLinkExtension, createStarterKit } from "@/lib/tiptap";
import type { CmsGalleryWithItems } from "@shared/schema";

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

interface BlogEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  "data-testid"?: string;
}

function ToolbarSep() {
  return <div className="w-px h-5 bg-border mx-0.5 shrink-0" />;
}

function ToolbarBtn({
  active,
  onClick,
  title,
  children,
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      className={cn("h-7 w-7 p-0 shrink-0", active && "bg-accent text-accent-foreground")}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}

export function BlogEditor({
  value,
  onChange,
  placeholder,
  "data-testid": testId,
}: BlogEditorProps) {
  const { toast } = useToast();
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkOpenInNewTab, setLinkOpenInNewTab] = useState(false);
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageTab, setImageTab] = useState<"url" | "upload">("url");
  const [uploading, setUploading] = useState(false);
  const [showGalleryPanel, setShowGalleryPanel] = useState(false);
  const [selectedGalleryId, setSelectedGalleryId] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const { data: galleries = [] } = useQuery<CmsGalleryWithItems[]>({
    queryKey: ["/api/admin/cms/galleries"],
  });

  const editor = useEditor({
    extensions: [
      createStarterKit({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      createLinkExtension(),
      Image.configure({
        HTMLAttributes: { class: "max-w-full rounded-lg my-4" },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "Write your article here…",
      }),
    ],
    content: value || "",
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "outline-none min-h-[400px] prose prose-slate dark:prose-invert max-w-none px-4 py-3 text-sm leading-relaxed focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "");
    }
  }, [value]);

  useEffect(() => {
    if (!showEmoji) return;
    function handleClick(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmoji]);

  const insertLink = () => {
    if (!editor || !linkUrl.trim()) return;
    let url = linkUrl.trim();
    if (!/^https?:\/\//.test(url)) url = "https://" + url;
    const { from, to } = editor.state.selection;
    if (from === to && linkText.trim()) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: linkText.trim(),
          marks: [
            {
              type: "link",
              attrs: {
                href: url,
                target: linkOpenInNewTab ? "_blank" : null,
                rel: linkOpenInNewTab ? "noopener noreferrer" : null,
              },
            },
          ],
        })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .setLink({
          href: url,
          target: linkOpenInNewTab ? "_blank" : null,
          rel: linkOpenInNewTab ? "noopener noreferrer" : null,
        })
        .run();
    }
    setLinkUrl("");
    setLinkText("");
    setLinkOpenInNewTab(false);
    setShowLinkPanel(false);
  };

  const insertImageUrl = () => {
    if (!editor || !imageUrl.trim()) return;
    editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
    setImageUrl("");
    setShowImagePanel(false);
  };

  const insertGallery = () => {
    if (!editor || !selectedGalleryId) return;
    editor.chain().focus().insertContent(`<p>[gallery id="${selectedGalleryId}"]</p>`).run();
    setSelectedGalleryId("");
    setShowGalleryPanel(false);
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Images only",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max size is 10 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/cms/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Upload failed");
      const { url } = await res.json();
      editor?.chain().focus().setImage({ src: url }).run();
      setShowImagePanel(false);
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Upload failed",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (!editor) return null;

  return (
    <div
      className="rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring"
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30 rounded-t-lg">
        <ToolbarBtn
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarSep />

        <ToolbarBtn
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1"
        >
          <span className="text-[11px] font-bold leading-none">H1</span>
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          <span className="text-[11px] font-bold leading-none">H2</span>
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3"
        >
          <span className="text-[11px] font-bold leading-none">H3</span>
        </ToolbarBtn>
        <ToolbarSep />

        <ToolbarBtn
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Inline Code"
        >
          <Code className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarSep />

        <ToolbarBtn
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote"
        >
          <Quote className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code Block"
        >
          <Code2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarSep />

        <ToolbarBtn
          active={showLinkPanel}
          onClick={() => {
            if (showLinkPanel) {
              setShowLinkPanel(false);
              return;
            }
            const existing = editor.getAttributes("link").href as string | undefined;
            const existingTarget = editor.getAttributes("link").target as string | undefined;
            if (existing) setLinkUrl(existing);
            setLinkOpenInNewTab(existingTarget === "_blank");
            setShowLinkPanel(true);
            setShowImagePanel(false);
            setShowGalleryPanel(false);
            setShowEmoji(false);
          }}
          title="Insert / Edit Link"
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={showImagePanel}
          onClick={() => {
            setShowImagePanel(!showImagePanel);
            setShowLinkPanel(false);
            setShowGalleryPanel(false);
            setShowEmoji(false);
          }}
          title="Insert Image"
        >
          <ImageIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={showGalleryPanel}
          onClick={() => {
            setShowGalleryPanel(!showGalleryPanel);
            setShowImagePanel(false);
            setShowLinkPanel(false);
            setShowEmoji(false);
          }}
          title="Insert Gallery"
        >
          <Images className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="relative">
          <ToolbarBtn
            active={showEmoji}
            onClick={() => {
              setShowEmoji(!showEmoji);
              setShowLinkPanel(false);
              setShowImagePanel(false);
              setShowGalleryPanel(false);
            }}
            title="Emoji"
          >
            <Smile className="w-3.5 h-3.5" />
          </ToolbarBtn>
          {showEmoji && (
            <div
              ref={emojiRef}
              className="absolute top-full left-0 mt-1 bg-popover border rounded-lg shadow-lg p-2 grid grid-cols-10 gap-1 z-50"
              style={{ width: 300 }}
              data-testid="emoji-picker"
            >
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="h-7 w-7 flex items-center justify-center text-base hover:bg-accent rounded cursor-pointer"
                  onClick={() => {
                    editor.chain().focus().insertContent(emoji).run();
                    setShowEmoji(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showLinkPanel && (
        <div className="flex flex-wrap items-end gap-3 px-3 py-2.5 border-b bg-muted/20">
          <div className="flex-1 min-w-[180px]">
            <Label className="text-xs mb-1 block">URL</Label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              autoPrependHttps
              className="h-8 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  insertLink();
                }
              }}
              data-testid="input-link-url"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <Label className="text-xs mb-1 block">
              Link text <span className="text-muted-foreground">(if no selection)</span>
            </Label>
            <Input
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder="Click here"
              className="h-8 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  insertLink();
                }
              }}
              data-testid="input-link-text"
            />
          </div>
          <div className="flex items-center gap-2 pb-0.5 min-w-[150px]">
            <Checkbox
              id={`${testId ?? "blog-editor"}-link-new-tab`}
              checked={linkOpenInNewTab}
              onCheckedChange={(checked) => setLinkOpenInNewTab(checked === true)}
            />
            <Label
              htmlFor={`${testId ?? "blog-editor"}-link-new-tab`}
              className="text-xs font-normal"
            >
              Open in new tab
            </Label>
          </div>
          <div className="flex items-center gap-1.5 pb-0.5">
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              onClick={insertLink}
              disabled={!linkUrl.trim()}
              data-testid="button-insert-link"
            >
              {editor.isActive("link") ? "Update" : "Insert"}
            </Button>
            {editor.isActive("link") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setLinkOpenInNewTab(false);
                  setShowLinkPanel(false);
                }}
                data-testid="button-remove-link"
              >
                Remove
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                setShowLinkPanel(false);
                setLinkUrl("");
                setLinkText("");
                setLinkOpenInNewTab(false);
              }}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {showGalleryPanel && (
        <div className="flex flex-wrap items-end gap-3 px-3 py-2.5 border-b bg-muted/20">
          <div className="min-w-[260px] flex-1">
            <Label className="text-xs mb-1 block">Gallery</Label>
            <select
              value={selectedGalleryId}
              onChange={(event) => setSelectedGalleryId(event.target.value)}
              className="h-8 w-full rounded-md border bg-background px-2 text-xs"
              data-testid="select-insert-gallery"
            >
              <option value="">Select a published gallery...</option>
              {galleries
                .filter((gallery) => gallery.status === "published")
                .map((gallery) => (
                  <option key={gallery.id} value={gallery.id}>
                    {gallery.title} ({gallery.imageCount})
                  </option>
                ))}
            </select>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            onClick={insertGallery}
            disabled={!selectedGalleryId}
            data-testid="button-insert-gallery"
          >
            Insert Gallery
          </Button>
        </div>
      )}

      {showImagePanel && (
        <div className="px-3 py-2.5 border-b bg-muted/20 space-y-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cn(
                "text-xs px-2.5 py-1 rounded-full transition-colors",
                imageTab === "url"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setImageTab("url")}
            >
              From URL
            </button>
            <button
              type="button"
              className={cn(
                "text-xs px-2.5 py-1 rounded-full transition-colors",
                imageTab === "upload"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setImageTab("upload")}
            >
              Upload
            </button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 ml-auto"
              onClick={() => {
                setShowImagePanel(false);
                setImageUrl("");
              }}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          {imageTab === "url" ? (
            <div className="flex items-center gap-2">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                autoPrependHttps
                className="h-8 text-xs flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    insertImageUrl();
                  }
                }}
                data-testid="input-image-url"
              />
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                onClick={insertImageUrl}
                disabled={!imageUrl.trim()}
                data-testid="button-insert-image-url"
              >
                Insert
              </Button>
            </div>
          ) : (
            <div>
              <button
                type="button"
                className="flex items-center gap-2 text-xs text-muted-foreground border-2 border-dashed rounded-lg px-4 py-2.5 w-full hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                data-testid="button-upload-image"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
                {uploading ? "Uploading…" : "Click to choose an image (max 10 MB)"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </div>
      )}

      <EditorContent
        editor={editor}
        data-testid={testId ? `${testId}-content` : "blog-editor-content"}
      />
    </div>
  );
}
