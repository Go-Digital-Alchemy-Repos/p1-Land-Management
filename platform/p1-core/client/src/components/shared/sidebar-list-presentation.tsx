import React, { type ReactNode } from "react";
import { Plus, Loader2, PanelRight, Edit, Trash2 } from "lucide-react";
import type { SidebarPrimitives } from "./sidebar-editor-presentation";
export interface SidebarListRecord {
  id: string;
  name: string;
  description?: string | null;
  isDefault?: boolean | null;
  widgets?: unknown;
}
const widgetCount = (sidebar: SidebarListRecord) =>
  Array.isArray(sidebar.widgets) ? sidebar.widgets.length : 0;
export function SidebarListPresentation({
  ui,
  sidebars,
  isLoading,
  onCreate,
  onEdit,
  onDelete,
  tools,
  mutationDisabledReason,
}: {
  ui: SidebarPrimitives;
  sidebars: SidebarListRecord[];
  isLoading: boolean;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onDelete?: (id: string) => void;
  tools?: ReactNode;
  mutationDisabledReason?: string;
}) {
  const { Button, Card, CardHeader, CardTitle, CardContent, CardDescription, Badge } = ui;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-semibold" data-testid="text-sidebars-title">
            Sidebars & Widgets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create reusable right-side sidebars for pages and blog posts.
          </p>
        </div>
        <Button onClick={() => onCreate()} disabled={!!mutationDisabledReason} aria-disabled={!!mutationDisabledReason} title={mutationDisabledReason} data-testid="button-create-sidebar">
          <Plus className="mr-2 h-4 w-4" />
          Create Sidebar
        </Button>
      </div>

      {tools}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : sidebars.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <PanelRight className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
            <h2 className="text-lg font-medium">No sidebars yet</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Create a default blog sidebar or page-specific sidebar to get started.
            </p>
            <Button onClick={() => onCreate()} disabled={!!mutationDisabledReason} aria-disabled={!!mutationDisabledReason} title={mutationDisabledReason}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Sidebar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sidebars.map((sidebar) => (
            <Card key={sidebar.id} data-testid={`card-sidebar-${sidebar.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {sidebar.name}
                      {sidebar.isDefault && (
                        <Badge className="bg-emerald-600 text-white">Default Blog</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {sidebar.description || "No description"} · {widgetCount(sidebar)} widget
                      {widgetCount(sidebar) === 1 ? "" : "s"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Edit ${sidebar.name}`}
                      onClick={() => onEdit(sidebar.id)}
                    >
                      <Edit className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    {onDelete && (
                      <Button
                        aria-label={`Delete ${sidebar.name}`}
                        disabled={!!mutationDisabledReason}
                        aria-disabled={!!mutationDisabledReason}
                        title={mutationDisabledReason}
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete?.(sidebar.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
