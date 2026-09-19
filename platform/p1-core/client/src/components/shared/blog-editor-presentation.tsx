import type { ReactNode, ComponentType } from "react";
import { BookOpen, LayoutTemplate, Globe } from "lucide-react";
export interface BlogTabsPrimitives {
  Tabs: ComponentType<any>;
  TabsList: ComponentType<any>;
  TabsTrigger: ComponentType<any>;
  TabsContent: ComponentType<any>;
}
/** Original blog tabs; hosts own forms, transport, drafts and authorization. */
export function BlogEditorTabs({
  ui,
  postType,
  content,
  layout,
  seo,
}: {
  ui: BlogTabsPrimitives;
  postType: ReactNode;
  content: ReactNode;
  layout: ReactNode;
  seo: ReactNode;
}) {
  const { Tabs, TabsList, TabsTrigger, TabsContent } = ui;
  return (
    <Tabs defaultValue="content" className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <TabsList>
          <TabsTrigger value="content" data-testid="tab-content">
            <BookOpen className="h-4 w-4 mr-1.5 text-blue-600" />
            Content
          </TabsTrigger>
          <TabsTrigger value="layout" data-testid="tab-layout">
            <LayoutTemplate className="h-4 w-4 mr-1.5 text-indigo-600" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="seo" data-testid="tab-seo">
            <Globe className="h-4 w-4 mr-1.5 text-blue-600" />
            SEO
          </TabsTrigger>
        </TabsList>
        {postType}
      </div>

      <TabsContent value="content" className="space-y-4 mt-0">
        {content}
      </TabsContent>
      <TabsContent value="layout" className="mt-0 space-y-4">
        {layout}
      </TabsContent>
      <TabsContent value="seo" className="mt-0 space-y-4">
        {seo}
      </TabsContent>
    </Tabs>
  );
}
export function BlogEditorCard({
  ui,
  title,
  children,
}: {
  ui: {
    Card: ComponentType<any>;
    CardHeader: ComponentType<any>;
    CardTitle: ComponentType<any>;
    CardContent: ComponentType<any>;
  };
  title: string;
  children: ReactNode;
}) {
  const { Card, CardHeader, CardTitle, CardContent } = ui;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function BlogEditorHeader({
  back,
  title,
  status,
  actions,
}: {
  back: ReactNode;
  title: string;
  status: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        {back}
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-orange-500" />
          <h1 className="text-xl font-heading font-semibold" data-testid="text-blog-editor-title">
            {title}
          </h1>
          {status}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  );
}

export function BlogTaxonomyPicker({
  ui,
  kind,
  options,
  selected,
  onChange,
  add,
  settings,
  onRemove,
}: {
  ui: {
    Card: ComponentType<any>;
    CardContent: ComponentType<any>;
    Badge: ComponentType<any>;
    Checkbox: ComponentType<any>;
  };
  kind: "category" | "tag";
  options: { id: string; name: string; label?: string; nested?: boolean }[];
  selected: string[];
  onChange: (values: string[]) => void;
  add: ReactNode;
  settings?: ReactNode;
  onRemove?: (name: string) => void;
}) {
  const { Card, CardContent, Badge, Checkbox } = ui;
  const plural = kind === "category" ? "categories" : "tags";
  return (
    <Card className="border-dashed">
      <CardContent className="p-4 space-y-4">
        <div className="max-h-60 overflow-y-auto rounded-md border">
          {options.length ? (
            <div className="divide-y">
              {options.map((option) => (
                <label
                  key={option.id}
                  className="flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40"
                >
                  <Checkbox
                    checked={selected.some(
                      (value) => value.toLowerCase() === option.name.toLowerCase(),
                    )}
                    onCheckedChange={(checked: boolean) =>
                      onChange(
                        checked
                          ? [
                              ...selected.filter(
                                (value) => value.toLowerCase() !== option.name.toLowerCase(),
                              ),
                              option.name,
                            ]
                          : selected.filter(
                              (value) => value.toLowerCase() !== option.name.toLowerCase(),
                            ),
                      )
                    }
                  />
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium leading-none">
                      {option.label || option.name}
                    </div>
                    {option.nested && (
                      <p className="text-xs text-muted-foreground">Nested category</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="px-3 py-6 text-sm text-muted-foreground">
              No {plural} yet. Add one below.
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {selected.length ? (
            selected.map((name) => (
              <Badge key={name} variant="secondary">
                {name}
                {onRemove && (
                  <button
                    type="button"
                    aria-label={`Remove ${kind} ${name}`}
                    onClick={() => onRemove(name)}
                  >
                    ×
                  </button>
                )}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No {plural} selected.</p>
          )}
        </div>
        {add}
        {settings}
      </CardContent>
    </Card>
  );
}
