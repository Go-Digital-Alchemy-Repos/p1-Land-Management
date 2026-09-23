import type { ComponentType, ReactNode } from "react";
export type StructuredWebsitePrimitives = Record<string, ComponentType<any>>;
export interface StructuredWebsiteField {
  path: string;
  label: string;
  type: string;
  maxLength?: number;
  required?: boolean;
}
export interface StructuredWebsiteRevision {
  id: string;
  revision: number;
  kind: string;
}
/** Original bounded website editor. Hosts own drafts, mutations, media, and preview transport. */
export function StructuredWebsiteEditorPresentation({
  ui,
  draftRevision,
  publishedRevision,
  fields,
  revisions,
  valueAt,
  onChange,
  onSave,
  onPublish,
  onRestore,
  busy = false,
  saveDisabled = false,
  publishDisabled = false,
  mutationDisabledReason,
  preview,
  toolbar,
  fieldTools,
  fieldAction,
  alerts,
  context,
  dirty = false,
}: {
  ui: StructuredWebsitePrimitives;
  draftRevision: number;
  publishedRevision: number | null;
  fields: StructuredWebsiteField[];
  revisions: StructuredWebsiteRevision[];
  valueAt: (path: string) => string;
  onChange: (path: string, value: string) => void;
  onSave: () => void;
  onPublish: () => void;
  onRestore: (revision: number) => void;
  busy?: boolean;
  saveDisabled?: boolean;
  publishDisabled?: boolean;
  mutationDisabledReason?: string;
  preview: ReactNode;
  toolbar?: ReactNode;
  fieldTools?: ReactNode;
  fieldAction?: (field: StructuredWebsiteField) => ReactNode;
  alerts?: ReactNode;
  context?: ReactNode;
  dirty?: boolean;
}) {
  const { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } = ui;
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 structured-website-workspace">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-semibold">P1 website editor</h1>
          <p className="mt-1 text-muted-foreground">
            Edit bounded content while site behavior stays locked.
          </p>
          {context}
        </div>
        <div className="text-sm text-muted-foreground">
          Draft r{draftRevision} · Published{" "}
          {publishedRevision === null ? "never" : `r${publishedRevision}`}
          {dirty ? " · Unsaved changes" : ""}
        </div>
      </div>
      {alerts}
      {toolbar}
      <div className="grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr] structured-website-columns">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Editable content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!busy && !saveDisabled) onSave();
                }}
              >
                <fieldset
                  key={String(busy)}
                  disabled={busy}
                  ref={(node) => {
                    if (node) node.inert = busy;
                  }}
                  className="space-y-4 border-0 p-0 m-0 min-w-0"
                >
                  {fieldTools}
                  {fields.map((field) => {
                    const value = valueAt(field.path);
                    const id = `website-field-${field.path.replaceAll(".", "-")}`;
                    const common = {
                      id,
                      value,
                      maxLength: field.maxLength,
                      required: field.required,
                      onChange: (
                        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                      ) => onChange(field.path, event.target.value),
                    };
                    return (
                      <div className="space-y-2" key={field.path}>
                        <Label htmlFor={id}>{field.label}</Label>
                        {field.type === "textarea" ? (
                          <Textarea {...common} rows={4} />
                        ) : (
                          <Input {...common} />
                        )}{" "}
                        {fieldAction?.(field)}
                        {field.maxLength ? (
                          <p className="text-xs text-muted-foreground">
                            {value.length}/{field.maxLength}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                  <div className="flex gap-2 flex-wrap">
                    <Button type="submit" disabled={busy || saveDisabled || !!mutationDisabledReason} aria-disabled={!!mutationDisabledReason} title={mutationDisabledReason}>
                      Save draft
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onPublish}
                      disabled={busy || publishDisabled || !!mutationDisabledReason}
                      aria-disabled={!!mutationDisabledReason}
                      title={mutationDisabledReason}
                    >
                      Publish
                    </Button>
                  </div>
                </fieldset>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Revision history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {revisions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved revisions yet.</p>
              ) : (
                revisions.map((revision) => (
                  <div
                    key={revision.id}
                    className="flex items-center justify-between rounded border p-2 text-sm gap-2"
                  >
                    <span>
                      r{revision.revision} · {revision.kind}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Restore r${revision.revision}`}
                      onClick={() => onRestore(revision.revision)}
                      disabled={busy || !!mutationDisabledReason}
                      aria-disabled={!!mutationDisabledReason}
                      title={mutationDisabledReason}
                    >
                      Restore
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-2xl">Live preview</CardTitle>
          </CardHeader>
          <CardContent>{preview}</CardContent>
        </Card>
      </div>
    </div>
  );
}
