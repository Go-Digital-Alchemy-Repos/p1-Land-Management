import type { ReactNode } from "react";
import type { EmailUI } from "./email-template-library-presentation";
import {
  Pilcrow,
  Heading2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link2,
  Eraser,
} from "lucide-react";
export function EmailFormattingToolbar({
  ui,
  applyCommand,
  onLink,
  disabled = false,
}: {
  ui: EmailUI;
  applyCommand: (command: string, value?: string) => void;
  onLink: () => void;
  disabled?: boolean;
}) {
  const { Button } = ui;
  return (
    <fieldset
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      className="email-formatting-controls"
    >
      {" "}
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 px-2 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          aria-label="Paragraph"
          onClick={() => applyCommand("formatBlock", "<p>")}
        >
          <Pilcrow className="mr-1.5 h-3.5 w-3.5" />
          Paragraph
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          aria-label="Heading"
          onClick={() => applyCommand("formatBlock", "<h2>")}
        >
          <Heading2 className="mr-1.5 h-3.5 w-3.5" />
          Heading
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Bold"
          onClick={() => applyCommand("bold")}
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Italic"
          onClick={() => applyCommand("italic")}
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Underline"
          onClick={() => applyCommand("underline")}
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Bulleted list"
          onClick={() => applyCommand("insertUnorderedList")}
        >
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Numbered list"
          onClick={() => applyCommand("insertOrderedList")}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={onLink}>
          <Link2 className="mr-1.5 h-3.5 w-3.5" />
          Link
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          aria-label="Clear formatting"
          onClick={() => applyCommand("removeFormat")}
        >
          <Eraser className="mr-1.5 h-3.5 w-3.5" />
          Clear
        </Button>
      </div>
    </fieldset>
  );
}
export function EmailVariableTokens({
  ui,
  variables,
  onInsert,
  disabled = false,
}: {
  ui: EmailUI;
  variables: string[];
  onInsert: (v: string) => void;
  disabled?: boolean;
}) {
  const { Badge } = ui;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      <span className="text-xs text-muted-foreground mr-1">Variables:</span>
      {variables.map((v) => (
        <button
          key={v}
          disabled={disabled}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onInsert(v)}
          className="inline-flex"
          data-testid={`button-template-variable-${v}`}
        >
          <Badge
            variant="secondary"
            className="cursor-pointer text-xs font-mono hover:bg-secondary/80"
          >{`{{${v}}}`}</Badge>
        </button>
      ))}
    </div>
  );
}
export function EmailTemplatePreviewPanel({
  action,
  children,
}: {
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mt-4 border rounded-lg overflow-hidden">
      <div className="bg-muted px-3 py-2 text-xs font-medium flex items-center justify-between">
        <span>Preview</span>
        {action}
      </div>
      {children}
    </div>
  );
}
