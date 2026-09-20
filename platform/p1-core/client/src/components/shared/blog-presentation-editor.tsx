import { useId, useState, type ComponentType } from "react";
import type { BlogPresentation } from "../../../../shared/blog-presentation";
import { BlogEditorCard } from "./blog-editor-presentation";

type UI = Record<
  | "Card"
  | "CardHeader"
  | "CardTitle"
  | "CardContent"
  | "Input"
  | "Label"
  | "Textarea"
  | "Checkbox"
  | "Button"
  | "Select"
  | "SelectTrigger"
  | "SelectValue"
  | "SelectContent"
  | "SelectItem",
  ComponentType<any>
>;
const normalized = (text: string) => text.replace(/\s+/g, " ").trim();
/** Preserve authored segments when they already describe the current title. */
export function alignPresentationTitle(value: BlogPresentation | null | undefined, title: string) {
  return value &&
    normalized(value.titleParts.map((part) => part.text).join("")) !== normalized(title)
    ? { ...value, titleParts: [{ text: title, emphasis: false }] }
    : value;
}
export function BlogPresentationEditor({
  ui,
  value,
  title,
  excerpt,
  disabled,
  onChange,
}: {
  ui: UI;
  value?: BlogPresentation | null;
  title: string;
  excerpt: string;
  disabled: boolean;
  onChange: (value: BlogPresentation | null) => void;
}) {
  const id = useId();
  const [phrase, setPhrase] = useState("");
  const [phraseError, setPhraseError] = useState("");
  const {
    Input,
    Label,
    Textarea,
    Checkbox,
    Button,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  } = ui;
  const patch = (next: Partial<BlogPresentation>) => {
    if (value && !disabled) onChange({ ...value, ...next });
  };
  const structured = (next: Partial<BlogPresentation["structuredData"]>) => {
    if (value) patch({ structuredData: { ...value.structuredData, ...next } });
  };
  const field = (
    label: string,
    text: string,
    change: (value: string) => void,
    type = "text",
    multiline = false,
  ) => {
    const Component = multiline ? Textarea : Input;
    return (
      <div className="space-y-2">
        <Label htmlFor={`${id}-${label}`}>{label}</Label>
        <Component
          id={`${id}-${label}`}
          aria-label={label}
          type={type}
          value={text}
          disabled={disabled}
          onChange={(e: any) => change(e.target.value)}
        />
      </div>
    );
  };
  const choice = (
    label: string,
    selected: string,
    options: string[],
    change: (next: any) => void,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={`${id}-${label}`}>{label}</Label>
      <Select aria-label={label} value={selected} disabled={disabled} onValueChange={change}>
        <SelectTrigger id={`${id}-${label}`} aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
  return (
    <BlogEditorCard ui={ui} title="Editorial presentation">
      <div className="flex items-center gap-2">
        <Checkbox
          id={`${id}-enabled`}
          aria-label="Enable editorial presentation"
          checked={!!value}
          disabled={disabled}
          onCheckedChange={(checked: boolean) => {
            if (disabled) return;
            onChange(
              checked
                ? {
                    schemaVersion: 1,
                    layout: "editorial",
                    eyebrow: "",
                    titleParts: [{ text: title, emphasis: false }],
                    imageAlt: "",
                    relatedContent: "",
                    structuredData: {
                      type: "BlogPosting",
                      headline: title,
                      description: excerpt,
                      authorType: "Person",
                      publishedDate: null,
                      modifiedDate: null,
                    },
                  }
                : null,
            );
          }}
        />
        <Label htmlFor={`${id}-enabled`}>Enable editorial presentation</Label>
      </div>
      <p className="text-sm text-muted-foreground">
        Optional hero, article metadata and related content. Disabling clears these settings when
        saved. Declared dates do not change publication or scheduling.
      </p>
      {value && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field("Hero eyebrow", value.eyebrow, (eyebrow) => patch({ eyebrow }))}
            {field("Hero image alternative text", value.imageAlt, (imageAlt) =>
              patch({ imageAlt }),
            )}
          </div>
          <div className="space-y-2">
            <Label>Hero title emphasis</Label>
            <p>
              {(alignPresentationTitle(value, title)?.titleParts || []).map((part, index) =>
                part.emphasis ? (
                  <em key={index}>{part.text}</em>
                ) : (
                  <span key={index}>{part.text}</span>
                ),
              )}
            </p>
            {field("Exact title phrase to emphasize", phrase, (next) => {
              setPhrase(next);
              setPhraseError("");
            })}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={disabled}
                onClick={() => {
                  const start = title.indexOf(phrase);
                  if (!phrase || start < 0) {
                    setPhraseError("Enter an exact phrase from the current title.");
                    return;
                  }
                  patch({
                    titleParts: [
                      ...(start ? [{ text: title.slice(0, start), emphasis: false }] : []),
                      { text: phrase, emphasis: true },
                      ...(start + phrase.length < title.length
                        ? [{ text: title.slice(start + phrase.length), emphasis: false }]
                        : []),
                    ],
                  });
                }}
              >
                Apply emphasis
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() => patch({ titleParts: [{ text: title, emphasis: false }] })}
              >
                Clear emphasis
              </Button>
            </div>
            {phraseError && <p role="alert">{phraseError}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {choice(
              "Structured article type",
              value.structuredData.type,
              ["Article", "BlogPosting"],
              (type) => structured({ type }),
            )}
            {choice(
              "Author type",
              value.structuredData.authorType,
              ["Person", "Organization"],
              (authorType) => structured({ authorType }),
            )}
            {field(
              "Declared publication date",
              value.structuredData.publishedDate || "",
              (publishedDate) => structured({ publishedDate: publishedDate || null }),
              "date",
            )}
            {field(
              "Declared modification date",
              value.structuredData.modifiedDate || "",
              (modifiedDate) => structured({ modifiedDate: modifiedDate || null }),
              "date",
            )}
          </div>
          {field("Structured headline", value.structuredData.headline, (headline) =>
            structured({ headline }),
          )}
          {field(
            "Structured description",
            value.structuredData.description,
            (description) => structured({ description }),
            "text",
            true,
          )}
          <div className="space-y-2">
            {field(
              "Related service HTML",
              value.relatedContent,
              (relatedContent) => patch({ relatedContent }),
              "text",
              true,
            )}
            <p className="text-sm text-muted-foreground">
              Use article text and links in HTML. Images and gallery blocks are not supported here.
              Publication validates this HTML before public rendering.
            </p>
          </div>
        </>
      )}
    </BlogEditorCard>
  );
}
