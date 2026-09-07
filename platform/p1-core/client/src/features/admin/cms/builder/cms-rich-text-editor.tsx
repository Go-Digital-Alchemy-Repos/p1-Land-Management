import { useEffect, useState, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension, mergeAttributes } from "@tiptap/core";
import TiptapImage from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createCmsLinkExtension, createStarterKit } from "@/lib/tiptap";
import { MediaPickerDialog } from "../components/media-picker-dialog";
import type { CmsMediaLibraryAsset } from "@shared/schema";

interface CmsRichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  "data-testid"?: string;
}

function ToolbarSep() {
  return <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />;
}

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
          return align === "left" || align === "right" || align === "center" ? align : "center";
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
  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },
});

function ToolbarButton({
  active,
  children,
  disabled,
  onClick,
  title,
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={cn(
        "h-8 min-w-8 shrink-0 rounded-md px-2 text-xs",
        active && "bg-primary/10 text-primary ring-1 ring-primary/20",
      )}
    >
      {children}
    </Button>
  );
}

export function CmsRichTextEditor({
  value,
  onChange,
  placeholder,
  "data-testid": testId,
}: CmsRichTextEditorProps) {
  const [activeTab, setActiveTab] = useState<"visual" | "html">("visual");
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkOpenInNewTab, setLinkOpenInNewTab] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageAlign, setImageAlign] = useState<RichTextAlign>("center");

  const editor = useEditor({
    extensions: [
      createStarterKit({
        heading: { levels: [2, 3] },
      }),
      TEXT_ALIGN_EXTENSION,
      Underline,
      CmsImage.configure({
        inline: false,
        allowBase64: false,
      }),
      createCmsLinkExtension(),
      Placeholder.configure({
        placeholder: placeholder ?? "Write and format your content here...",
      }),
    ],
    content: value || "",
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none min-h-[220px] px-4 py-3 text-sm leading-relaxed outline-none focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const nextValue = value || "";
    if (nextValue !== editor.getHTML()) {
      editor.commands.setContent(nextValue);
    }
  }, [editor, value]);

  const insertLink = () => {
    if (!editor || !linkUrl.trim()) return;
    let url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

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
        .extendMarkRange("link")
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

  const setTextAlign = (align: RichTextAlign) => {
    if (!editor) return;
    if (editor.isActive("heading")) {
      editor.chain().focus().updateAttributes("heading", { textAlign: align }).run();
      return;
    }
    editor.chain().focus().updateAttributes("paragraph", { textAlign: align }).run();
  };

  const syncImagePanelFromSelection = () => {
    if (!editor) return;
    const attrs = editor.getAttributes("image") as {
      src?: string;
      alt?: string;
      align?: RichTextAlign;
    };
    setImageUrl(attrs.src ?? "");
    setImageAlt(attrs.alt ?? "");
    setImageAlign(attrs.align === "left" || attrs.align === "right" ? attrs.align : "center");
  };

  const insertOrUpdateImage = () => {
    if (!editor || !imageUrl.trim()) return;
    const attrs = {
      src: imageUrl.trim(),
      alt: imageAlt.trim() || undefined,
      align: imageAlign,
    };

    if (editor.isActive("image")) {
      editor.chain().focus().updateAttributes("image", attrs).run();
    } else {
      editor.chain().focus().setImage(attrs).run();
    }
    setShowImagePanel(false);
  };

  const handleMediaSelect = (url: string, asset: CmsMediaLibraryAsset) => {
    setImageUrl(url);
    setImageAlt(asset.alt || asset.title || asset.originalName || "");
  };

  if (!editor) return null;

  return (
    <Tabs
      value={activeTab}
      onValueChange={(tab) => setActiveTab(tab as "visual" | "html")}
      className="w-full"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <TabsList className="h-9 rounded-full">
          <TabsTrigger
            value="visual"
            className="rounded-full px-3 text-xs"
            data-testid={`${testId}-visual-tab`}
          >
            Visual
          </TabsTrigger>
          <TabsTrigger
            value="html"
            className="rounded-full px-3 text-xs"
            data-testid={`${testId}-html-tab`}
          >
            HTML
          </TabsTrigger>
        </TabsList>
        <p className="text-[11px] text-muted-foreground">
          Use HTML only when you need advanced control.
        </p>
      </div>

      <TabsContent value="visual" className="mt-0">
        <div
          className="overflow-hidden rounded-xl border bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring"
          data-testid={testId}
        >
          <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-2 py-2">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarSep />
            <ToolbarButton
              active={editor.isActive("paragraph")}
              onClick={() => editor.chain().focus().setParagraph().run()}
              title="Paragraph"
            >
              <span className="font-semibold leading-none">P</span>
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive("heading", { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Heading"
            >
              <span className="font-semibold leading-none">H2</span>
            </ToolbarButton>
            <ToolbarSep />
            <ToolbarButton
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold"
            >
              <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic"
            >
              <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              title="Underline"
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="Strikethrough"
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive("code")}
              onClick={() => editor.chain().focus().toggleCode().run()}
              title="Inline code"
            >
              <Code className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarSep />
            <ToolbarButton
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Bullet list"
            >
              <List className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="Numbered list"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive("blockquote")}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="Quote"
            >
              <Quote className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarSep />
            <ToolbarButton onClick={() => setTextAlign("left")} title="Align text left">
              <AlignLeft className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => setTextAlign("center")} title="Align text center">
              <AlignCenter className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => setTextAlign("right")} title="Align text right">
              <AlignRight className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarSep />
            <ToolbarButton
              active={showLinkPanel || editor.isActive("link")}
              onClick={() => {
                const existingUrl = editor.getAttributes("link").href as string | undefined;
                const existingTarget = editor.getAttributes("link").target as string | undefined;
                setLinkUrl(existingUrl ?? "");
                setLinkOpenInNewTab(existingTarget === "_blank");
                setShowLinkPanel((open) => !open);
              }}
              title="Insert or edit link"
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              active={showImagePanel || editor.isActive("image")}
              onClick={() => {
                if (editor.isActive("image")) {
                  syncImagePanelFromSelection();
                } else {
                  setImageUrl("");
                  setImageAlt("");
                  setImageAlign("center");
                }
                setShowImagePanel((open) => !open);
              }}
              title="Insert or edit image"
            >
              <ImageIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
              title="Clear formatting"
            >
              <span className="font-semibold leading-none">Tx</span>
            </ToolbarButton>
          </div>

          {showLinkPanel && (
            <div className="space-y-2 border-b bg-muted/20 px-3 py-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Link URL</Label>
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
                    data-testid={`${testId}-link-url`}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Link text if nothing is selected</Label>
                  <Input
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Read more"
                    className="h-8 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        insertLink();
                      }
                    }}
                    data-testid={`${testId}-link-text`}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      id={`${testId ?? "cms-richtext"}-link-new-tab`}
                      checked={linkOpenInNewTab}
                      onCheckedChange={(checked) => setLinkOpenInNewTab(checked === true)}
                    />
                    <Label
                      htmlFor={`${testId ?? "cms-richtext"}-link-new-tab`}
                      className="text-xs font-normal"
                    >
                      Open in new tab
                    </Label>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={insertLink}
                    disabled={!linkUrl.trim()}
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
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {showImagePanel && (
            <div className="space-y-3 border-b bg-muted/20 px-3 py-3">
              <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Image URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="/r2/example.jpg or https://..."
                      className="h-8 text-xs"
                      data-testid={`${testId}-image-url`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 text-xs"
                      onClick={() => setMediaPickerOpen(true)}
                    >
                      Media Library
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Alt text</Label>
                  <Input
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                    placeholder="Describe the image"
                    className="h-8 text-xs"
                    data-testid={`${testId}-image-alt`}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Image alignment</Label>
                  <div className="flex rounded-md border bg-background p-0.5">
                    {(
                      [
                        ["left", AlignLeft],
                        ["center", AlignCenter],
                        ["right", AlignRight],
                      ] as const
                    ).map(([align, Icon]) => (
                      <Button
                        key={align}
                        type="button"
                        variant={imageAlign === align ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 w-8 p-0"
                        onClick={() => {
                          setImageAlign(align);
                          if (editor.isActive("image")) {
                            editor.chain().focus().updateAttributes("image", { align }).run();
                          }
                        }}
                        title={`Align image ${align}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={insertOrUpdateImage}
                    disabled={!imageUrl.trim()}
                  >
                    {editor.isActive("image") ? "Update" : "Insert"}
                  </Button>
                  {editor.isActive("image") && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        editor.chain().focus().deleteSelection().run();
                        setShowImagePanel(false);
                      }}
                    >
                      Remove
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setShowImagePanel(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <EditorContent
            editor={editor}
            data-testid={testId ? `${testId}-content` : "cms-richtext-content"}
          />
        </div>
      </TabsContent>

      <TabsContent value="html" className="mt-0">
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={12}
          className="min-h-[300px] rounded-xl font-mono text-xs leading-relaxed"
          data-testid={testId ? `${testId}-html` : "cms-richtext-html"}
        />
      </TabsContent>
      <MediaPickerDialog
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        onSelect={handleMediaSelect}
        typeFilter="images"
      />
    </Tabs>
  );
}
