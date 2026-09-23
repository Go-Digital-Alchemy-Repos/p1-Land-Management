import React, { type ElementType, type ComponentType, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Loader2,
  Mail,
  PanelRight,
  Search,
  Star,
  Tag,
  Trash2,
  Type,
} from "lucide-react";
import { cn } from "../../lib/utils";
import type { SidebarWidget, SidebarWidgetType } from "../../../../shared/schema/cms-sidebars";
export type SidebarFormReference = { id: string; slug: string; name: string; kind?: string | null };
export type SidebarPrimitives = Record<string, ComponentType<any>>;
export const WIDGET_LABELS: Record<SidebarWidgetType, string> = {
  "recent-posts": "Recent Blog Posts",
  newsletter: "Newsletter Signup",
  form: "Form",
  callout: "Callout / CTA",
  search: "Search",
  categories: "Categories",
  "tag-cloud": "Tag Cloud",
  "custom-html": "Custom HTML",
};

const WIDGET_ICONS: Record<SidebarWidgetType, ElementType> = {
  "recent-posts": PanelRight,
  newsletter: Mail,
  form: Mail,
  callout: Star,
  search: Search,
  categories: Type,
  "tag-cloud": Tag,
  "custom-html": Type,
};

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export function defaultWidget(type: SidebarWidgetType): SidebarWidget {
  if (type === "recent-posts") {
    return { id: generateId(), type, title: "Recent Posts", settings: { limit: 5 } };
  }
  if (type === "newsletter") {
    return {
      id: generateId(),
      type,
      title: "Stay Connected",
      settings: {
        description: "Get platform updates, events, and resources in your inbox.",
        buttonText: "Sign Up",
        formSlug: "newsletter-signup",
      },
    };
  }
  if (type === "form") {
    return {
      id: generateId(),
      type,
      title: "Form",
      settings: {
        formSlug: "contact-form",
        description: "",
        buttonText: "",
      },
    };
  }
  if (type === "callout") {
    return {
      id: generateId(),
      type,
      title: "Helpful Resource",
      settings: {
        body: "Add a short message, promotion, or supporting note here.",
        buttonText: "",
        buttonUrl: "",
      },
    };
  }
  if (type === "custom-html") {
    return { id: generateId(), type, title: "Custom HTML", settings: { html: "" } };
  }
  return { id: generateId(), type, title: WIDGET_LABELS[type], settings: {} };
}

const SIDEBAR_WIDGET_TYPES = Object.keys(WIDGET_LABELS) as SidebarWidgetType[];
function WidgetSettings({
  widget,
  onChange,
  forms,
  ui,
  preserveSettingsOnTypeChange = false,
}: {
  forms: SidebarFormReference[];
  ui: SidebarPrimitives;
  preserveSettingsOnTypeChange?: boolean;
  widget: SidebarWidget;
  onChange: (updates: Partial<SidebarWidget>) => void;
}) {
  const { Label, Input, Textarea, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } =
    ui;
  const updateSetting = (key: string, value: unknown) => {
    onChange({ settings: { ...widget.settings, [key]: value } });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Widget Title</Label>
          <Input
            aria-label="Widget title"
            value={widget.title}
            onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              onChange({ title: event.target.value })
            }
            placeholder={WIDGET_LABELS[widget.type]}
            data-testid={`input-widget-title-${widget.id}`}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Widget Type</Label>
          <Select
            aria-label="Widget type"
            value={widget.type}
            onValueChange={(type: string) => {
              if (preserveSettingsOnTypeChange) {
                onChange({ type: type as SidebarWidgetType });
                return;
              }
              const replacement = defaultWidget(type as SidebarWidgetType);
              onChange({
                type: replacement.type,
                title: replacement.title,
                settings: replacement.settings,
              });
            }}
          >
            <SelectTrigger data-testid={`select-widget-type-${widget.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIDEBAR_WIDGET_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {WIDGET_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {widget.type === "recent-posts" && (
        <div className="space-y-1.5">
          <Label>Number of posts</Label>
          <Input
            aria-label="Number of posts"
            required
            step={1}
            type="number"
            min={1}
            max={10}
            value={String(widget.settings.limit ?? 5)}
            onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              updateSetting("limit", Number(event.target.value))
            }
            data-testid={`input-widget-limit-${widget.id}`}
          />
        </div>
      )}

      {widget.type === "newsletter" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              aria-label="Widget description"
              value={String(widget.settings.description ?? "")}
              onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                updateSetting("description", event.target.value)
              }
              rows={2}
              data-testid={`textarea-newsletter-description-${widget.id}`}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Button Text</Label>
              <Input
                aria-label="Button text"
                value={String(widget.settings.buttonText ?? "")}
                onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  updateSetting("buttonText", event.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Assigned Form</Label>
              <Select
                aria-label="Assigned form"
                value={String(widget.settings.formSlug ?? "newsletter-signup")}
                onValueChange={(value: string) => updateSetting("formSlug", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a form" />
                </SelectTrigger>
                <SelectContent>
                  {widget.settings.formSlug &&
                  !forms.some(
                    (form) =>
                      (form.kind === "newsletter" || form.slug === "newsletter-signup") &&
                      form.slug === widget.settings.formSlug,
                  ) ? (
                    <SelectItem value={String(widget.settings.formSlug)}>
                      Saved form: {String(widget.settings.formSlug)}
                    </SelectItem>
                  ) : null}
                  {forms
                    .filter(
                      (form) => form.kind === "newsletter" || form.slug === "newsletter-signup",
                    )
                    .map((form) => (
                      <SelectItem key={form.id} value={form.slug}>
                        {form.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {widget.type === "form" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Assigned Form</Label>
            <Select
              aria-label="Assigned form"
              value={String(widget.settings.formSlug ?? "contact-form")}
              onValueChange={(value: string) => updateSetting("formSlug", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a form" />
              </SelectTrigger>
              <SelectContent>
                {widget.settings.formSlug &&
                !forms.some(
                  (form) => form.kind !== "application" && form.slug === widget.settings.formSlug,
                ) ? (
                  <SelectItem value={String(widget.settings.formSlug)}>
                    Saved form: {String(widget.settings.formSlug)}
                  </SelectItem>
                ) : null}
                {forms
                  .filter((form) => form.kind !== "application")
                  .map((form) => (
                    <SelectItem key={form.id} value={form.slug}>
                      {form.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Button Text Override{" "}
                <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input
                aria-label="Button text"
                value={String(widget.settings.buttonText ?? "")}
                onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  updateSetting("buttonText", event.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Description Override{" "}
                <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                aria-label="Widget description"
                value={String(widget.settings.description ?? "")}
                onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  updateSetting("description", event.target.value)
                }
                rows={2}
              />
            </div>
          </div>
        </div>
      )}

      {widget.type === "callout" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Body</Label>
            <Textarea
              aria-label="Body"
              value={String(widget.settings.body ?? "")}
              onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                updateSetting("body", event.target.value)
              }
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Button Text</Label>
              <Input
                aria-label="Button text"
                value={String(widget.settings.buttonText ?? "")}
                onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  updateSetting("buttonText", event.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Button URL</Label>
              <Input
                aria-label="Button URL"
                value={String(widget.settings.buttonUrl ?? "")}
                onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  updateSetting("buttonUrl", event.target.value)
                }
                placeholder="/contact"
                autoPrependHttps
              />
            </div>
          </div>
        </div>
      )}

      {widget.type === "custom-html" && (
        <div className="space-y-1.5">
          <Label>HTML</Label>
          <Textarea
            aria-label="HTML"
            value={String(widget.settings.html ?? "")}
            onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              updateSetting("html", event.target.value)
            }
            rows={5}
            className="font-mono text-sm"
            placeholder="<p>Custom widget content...</p>"
          />
        </div>
      )}
    </div>
  );
}

export function SidebarEditorPresentation({
  ui,
  isNew,
  name,
  description,
  isDefault,
  widgets,
  forms,
  setName,
  setDescription,
  setIsDefault,
  onSave,
  onClose,
  updateWidget,
  moveWidget,
  addWidget,
  onRemoveWidget,
  busy = false,
  readOnly = false,
  mutationDisabledReason,
  reservation,
  preserveSettingsOnTypeChange = false,
  defaultHelp,
}: {
  ui: SidebarPrimitives;
  isNew: boolean;
  name: string;
  description: string;
  isDefault: boolean;
  widgets: SidebarWidget[];
  forms: SidebarFormReference[];
  setName: (name: string) => void;
  setDescription: (value: string) => void;
  setIsDefault: (value: boolean) => void;
  onSave: () => void;
  onClose: () => void;
  updateWidget: (id: string, updates: Partial<SidebarWidget>) => void;
  moveWidget: (id: string, direction: -1 | 1) => void;
  addWidget: (type: SidebarWidgetType) => void;
  onRemoveWidget: (id: string) => void;
  busy?: boolean;
  readOnly?: boolean;
  mutationDisabledReason?: string;
  reservation?: ReactNode;
  preserveSettingsOnTypeChange?: boolean;
  defaultHelp?: ReactNode;
}) {
  const {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
    Label,
    Input,
    Textarea,
    Switch,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  } = ui;
  return (
    <div className="space-y-6">
      {reservation}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-semibold">
            {isNew ? "Create Sidebar" : `Edit ${name}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            Build reusable sidebars from widget components.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!busy && !readOnly) onSave();
            }}
            disabled={!name.trim() || busy || readOnly}
            aria-disabled={!!mutationDisabledReason}
            title={mutationDisabledReason}
            data-testid="button-save-sidebar"
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isNew ? "Create Sidebar" : "Save Sidebar"}
          </Button>
        </div>
      </div>

      <fieldset disabled={busy || readOnly} className="sidebar-presentation-fields">
        <Card className={cn(true && readOnly && "pointer-events-none select-none opacity-70")}>
          <CardHeader>
            <CardTitle className="text-base">Sidebar Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  aria-label="Sidebar name"
                  required
                  value={name}
                  onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    setName(event.target.value)
                  }
                  placeholder="Blog Sidebar"
                  data-testid="input-sidebar-name"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <Label>Default Blog Sidebar</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {defaultHelp || "Used automatically by blog posts."}
                  </p>
                </div>
                <Switch
                  aria-label="Default Blog Sidebar"
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                  data-testid="switch-sidebar-default"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                aria-label="Description"
                value={description}
                onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  setDescription(event.target.value)
                }
                rows={2}
                placeholder="Internal note for admins"
              />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(true && readOnly && "pointer-events-none select-none opacity-70")}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Widgets</CardTitle>
                <CardDescription>
                  Stack widgets in the order they should appear on the sidebar.
                </CardDescription>
              </div>
              <Select
                aria-label="Add widget"
                value=""
                onValueChange={(value: string) => {
                  if (value && !busy && !readOnly) addWidget(value as SidebarWidgetType);
                }}
              >
                <SelectTrigger className="w-[210px]" data-testid="select-add-widget">
                  <SelectValue placeholder="Add widget..." />
                </SelectTrigger>
                <SelectContent>
                  {SIDEBAR_WIDGET_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {WIDGET_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {widgets.length === 0 ? (
              <div
                className="rounded-lg border border-dashed p-10 text-center text-muted-foreground"
                data-testid="text-empty-widgets"
              >
                <PanelRight className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p className="font-medium">No widgets yet</p>
                <p className="text-sm">
                  Use the Add widget dropdown to start building this sidebar.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {widgets.map((widget, index) => {
                  const Icon = WIDGET_ICONS[widget.type] || Type;
                  return (
                    <div
                      key={widget.id}
                      className="rounded-lg border bg-card p-4"
                      data-testid={`sidebar-widget-${widget.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <GripVertical className="mt-2 h-4 w-4 text-muted-foreground" />
                        <Icon
                          className={cn(
                            "mt-2 h-4 w-4",
                            {
                              "recent-posts": "text-blue-500",
                              newsletter: "text-emerald-500",
                              form: "text-violet-500",
                              callout: "text-amber-500",
                              search: "text-cyan-500",
                              categories: "text-indigo-500",
                              "tag-cloud": "text-pink-500",
                              "custom-html": "text-orange-500",
                            }[widget.type],
                          )}
                        />
                        <div className="flex-1">
                          <WidgetSettings
                            ui={ui}
                            forms={forms}
                            preserveSettingsOnTypeChange={preserveSettingsOnTypeChange}
                            widget={widget}
                            onChange={(updates) => {
                              if (!busy && !readOnly) updateWidget(widget.id, updates);
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Move widget ${index + 1} up`}
                            onClick={() => moveWidget(widget.id, -1)}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Move widget ${index + 1} down`}
                            onClick={() => moveWidget(widget.id, 1)}
                            disabled={index === widgets.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove widget ${index + 1}`}
                            className="text-destructive hover:text-destructive"
                            onClick={() => onRemoveWidget(widget.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </fieldset>
    </div>
  );
}
