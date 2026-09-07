import { useEditor, EditorContent } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Smile,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createLinkExtension, createStarterKit } from "@/lib/tiptap";

const EMOJI_LIST = [
  "😀",
  "😂",
  "😊",
  "😍",
  "🤔",
  "😢",
  "😎",
  "🙏",
  "👍",
  "👋",
  "❤️",
  "🎉",
  "✨",
  "🔥",
  "💪",
  "🤝",
  "✅",
  "⭐",
  "💡",
  "📎",
  "📝",
  "🗓️",
  "⏰",
  "🌟",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".csv",
  ".txt",
];

interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface RichTextEditorHandle {
  triggerSend: () => void;
}

interface RichTextEditorProps {
  onSend: (data: { content: string; contentHtml: string; attachment?: Attachment }) => void;
  disabled?: boolean;
  placeholder?: string;
  sendRef?: React.MutableRefObject<RichTextEditorHandle | null>;
}

function isImageType(type: string) {
  return type.startsWith("image/");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (isImageType(type)) return <ImageIcon className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
}

export function RichTextEditor({ onSend, disabled, placeholder, sendRef }: RichTextEditorProps) {
  const { toast } = useToast();
  const [showEmoji, setShowEmoji] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpenInNewTab, setLinkOpenInNewTab] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const sendFnRef = useRef<() => void>(() => {});

  const editor = useEditor({
    extensions: [
      createStarterKit({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      createLinkExtension(),
      Placeholder.configure({
        placeholder: placeholder ?? "Type a message…",
      }),
    ],
    editorProps: {
      attributes: {
        class: "outline-none min-h-[40px] max-h-32 overflow-y-auto text-sm px-3 py-2",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          sendFnRef.current();
          return true;
        }
        return false;
      },
    },
  });

  const handleSend = useCallback(() => {
    if (!editor || disabled || uploading) return;
    const text = editor.getText().trim();
    if (!text && !attachment) return;

    onSend({
      content: text || (attachment ? `[Attachment: ${attachment.name}]` : ""),
      contentHtml: editor.getHTML(),
      attachment: attachment ?? undefined,
    });

    editor.commands.clearContent();
    setAttachment(null);
  }, [editor, attachment, onSend, disabled, uploading]);

  sendFnRef.current = handleSend;

  if (sendRef) {
    sendRef.current = { triggerSend: handleSend };
  }

  const handleFileUpload = async (file: File) => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast({
        title: "File type not allowed",
        description: "Accepted: images, PDF, Word, Excel, PowerPoint, CSV, TXT.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5 MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads/attachment", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Upload failed");
      }
      const data = await res.json();
      setAttachment({
        url: data.url,
        name: data.name,
        type: data.type,
        size: data.size,
      });
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

  const insertLink = () => {
    if (!editor || !linkUrl.trim()) return;
    let url = linkUrl.trim();
    if (!/^https?:\/\//.test(url)) url = "https://" + url;

    const { from, to } = editor.state.selection;
    if (from === to) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: url,
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
    setLinkOpenInNewTab(false);
    setShowLinkInput(false);
  };

  const insertEmoji = (emoji: string) => {
    editor?.chain().focus().insertContent(emoji).run();
    setShowEmoji(false);
  };

  if (!editor) return null;

  return (
    <div className="flex-1 min-w-0">
      <div className="border rounded-lg bg-background focus-within:ring-1 focus-within:ring-ring">
        <div className="flex items-center gap-0.5 px-1.5 py-1 border-b bg-muted/30 rounded-t-lg">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`h-7 w-7 p-0 ${editor.isActive("bold") ? "bg-accent" : ""}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            data-testid="button-format-bold"
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`h-7 w-7 p-0 ${editor.isActive("italic") ? "bg-accent" : ""}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            data-testid="button-format-italic"
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`h-7 w-7 p-0 ${editor.isActive("strike") ? "bg-accent" : ""}`}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            data-testid="button-format-strike"
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`h-7 w-7 p-0 ${editor.isActive("bulletList") ? "bg-accent" : ""}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            data-testid="button-format-bullet-list"
            title="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`h-7 w-7 p-0 ${editor.isActive("orderedList") ? "bg-accent" : ""}`}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            data-testid="button-format-ordered-list"
            title="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`h-7 w-7 p-0 ${showLinkInput ? "bg-accent" : ""}`}
            onClick={() => {
              const nextOpen = !showLinkInput;
              if (nextOpen) {
                const existingUrl = editor.getAttributes("link").href as string | undefined;
                const existingTarget = editor.getAttributes("link").target as string | undefined;
                setLinkUrl(existingUrl ?? "");
                setLinkOpenInNewTab(existingTarget === "_blank");
              } else {
                setLinkUrl("");
                setLinkOpenInNewTab(false);
              }
              setShowLinkInput(nextOpen);
              setShowEmoji(false);
            }}
            data-testid="button-format-link"
            title="Insert Link"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </Button>
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`h-7 w-7 p-0 ${showEmoji ? "bg-accent" : ""}`}
              onClick={() => {
                setShowEmoji(!showEmoji);
                setShowLinkInput(false);
              }}
              data-testid="button-format-emoji"
              title="Emoji"
            >
              <Smile className="w-3.5 h-3.5" />
            </Button>
            {showEmoji && (
              <div
                ref={emojiRef}
                className="absolute bottom-full left-0 mb-1 bg-popover border rounded-lg shadow-lg p-2 grid grid-cols-8 gap-1 w-[250px] max-h-[200px] overflow-y-auto"
                style={{ zIndex: 1100 }}
                data-testid="emoji-picker"
              >
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="h-8 w-8 flex items-center justify-center text-lg hover:bg-accent rounded cursor-pointer"
                    onClick={() => insertEmoji(emoji)}
                    data-testid={`emoji-${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            data-testid="button-attach-file"
            title="Attach File (max 5MB)"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Paperclip className="w-3.5 h-3.5" />
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={ALLOWED_EXTENSIONS.join(",")}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = "";
            }}
          />
        </div>

        {showLinkInput && (
          <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 border-b bg-muted/20">
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Enter URL..."
              autoPrependHttps
              className="h-7 text-xs flex-1 min-w-[180px]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  insertLink();
                }
              }}
              autoFocus
              data-testid="input-link-url"
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="message-link-new-tab"
                checked={linkOpenInNewTab}
                onCheckedChange={(checked) => setLinkOpenInNewTab(checked === true)}
              />
              <Label htmlFor="message-link-new-tab" className="text-xs font-normal">
                Open in new tab
              </Label>
            </div>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={insertLink}
              disabled={!linkUrl.trim()}
              data-testid="button-insert-link"
            >
              Add
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                setShowLinkInput(false);
                setLinkUrl("");
                setLinkOpenInNewTab(false);
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        <EditorContent editor={editor} data-testid="input-message-draft" />

        {attachment && (
          <div className="flex items-center gap-2 px-3 py-1.5 border-t bg-muted/20">
            {isImageType(attachment.type) ? (
              <img
                src={attachment.url}
                alt={attachment.name}
                className="h-10 w-10 rounded object-cover"
              />
            ) : (
              getFileIcon(attachment.type)
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" data-testid="text-attachment-name">
                {attachment.name}
              </p>
              <p className="text-[10px] text-muted-foreground">{formatFileSize(attachment.size)}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setAttachment(null)}
              data-testid="button-remove-attachment"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
