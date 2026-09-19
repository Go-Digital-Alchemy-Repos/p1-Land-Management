import type { ReactNode } from "react";
import { ArrowLeft, Layers } from "lucide-react";
import type { SectionPrimitives } from "./cms-section-list-presentation";
export function SectionEditorPresentation({
  isNew,
  name,
  onBack,
  disabled,
  navigationDisabled = false,
  details,
  builder,
  saveControl,
  banner,
  extraActions,
  ui,
}: {
  isNew: boolean;
  name: string;
  onBack: () => void;
  disabled: boolean;
  navigationDisabled?: boolean;
  details: ReactNode;
  builder: ReactNode;
  saveControl: (position: "top" | "bottom") => ReactNode;
  banner?: ReactNode;
  extraActions?: ReactNode;
  ui: SectionPrimitives;
}) {
  const { Button, Card, CardHeader, CardTitle, CardContent } = ui;
  return (
    <div className="admin-has-mobile-action-bar p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {banner}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={onBack}
            disabled={navigationDisabled}
          >
            <ArrowLeft className="h-4 w-4" />
            Sections
          </Button>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-violet-500" />
            <h1
              className="text-xl font-heading font-semibold"
              data-testid="text-section-editor-title"
            >
              {isNew ? "New Section" : name || "Edit Section"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">{saveControl("top")}</div>
      </div>
      <fieldset
        key={String(disabled)}
        disabled={disabled}
        ref={(node) => {
          if (node) node.inert = disabled;
        }}
        className="min-w-0 border-0 p-0 m-0"
      >
        <Card className={disabled ? "opacity-70" : undefined}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Section Details
            </CardTitle>
          </CardHeader>
          <CardContent>{details}</CardContent>
        </Card>
      </fieldset>
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Blocks</h2>
        <Card className={disabled ? "opacity-70" : undefined}>
          <CardContent className="pt-4">{builder}</CardContent>
        </Card>
      </div>
      {extraActions}
      <div className="flex justify-end">{saveControl("bottom")}</div>
    </div>
  );
}
