import type { ComponentType } from "react";
import { AlertCircle, Search, RefreshCw, Loader2, Pencil } from "lucide-react";
import { cn } from "../../lib/utils";
export type EmailUI = Record<string, ComponentType<any>>;
export type EmailLibraryRecord = {
  slug: string;
  name: string;
  module?: string;
  subject: string;
  description?: string | null;
  isActive: boolean;
};
export function EmailTemplateLibrary<T extends EmailLibraryRecord>({
  ui,
  enabledModuleOptions,
  moduleCounts,
  moduleFilter,
  setModuleFilter,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  onRestore,
  restoring,
  canRestore,
  filteredTemplates,
  visibleTemplateList,
  templateList,
  onEdit,
  onToggle,
  moduleLabel,
  disabled = false,
}: {
  ui: EmailUI;
  enabledModuleOptions: { value: string; label: string; description: string }[];
  moduleCounts: Record<string, number>;
  moduleFilter: string;
  setModuleFilter: (s: string) => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  onRestore: () => void;
  restoring: boolean;
  canRestore: boolean;
  filteredTemplates: T[];
  visibleTemplateList: T[];
  templateList: T[];
  onEdit: (t: T) => void;
  onToggle: (t: T, active: boolean) => void;
  moduleLabel: (s?: string) => string;
  disabled?: boolean;
}) {
  const {
    Card,
    CardContent,
    Badge,
    Input,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Button,
    Switch,
  } = ui;
  return (
    <div className="space-y-6">
      {" "}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {enabledModuleOptions.map((module) => (
          <button
            disabled={disabled}
            key={module.value}
            type="button"
            onClick={() => setModuleFilter(module.value)}
            className={cn(
              "rounded-lg border bg-background p-3 text-left shadow-sm transition-colors hover:bg-muted/40",
              moduleFilter === module.value && "border-primary bg-primary/5",
            )}
            data-testid={`button-template-module-${module.value}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{module.label}</span>
              <Badge variant="secondary" className="text-xs">
                {moduleCounts[module.value]}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{module.description}</p>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 p-3">
        <div className="relative min-w-0 flex-1 basis-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search templates"
            value={searchQuery}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setSearchQuery(event.target.value)
            }
            placeholder="Search templates, subjects, slugs, variables..."
            className="pl-9"
            data-testid="input-search-email-templates"
          />
        </div>
        <Select
          aria-label="Module"
          value={moduleFilter}
          onValueChange={(value: string) => setModuleFilter(value)}
        >
          <SelectTrigger
            className="w-full sm:w-[180px]"
            data-testid="select-template-module-filter"
          >
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {enabledModuleOptions.map((module) => (
              <SelectItem key={module.value} value={module.value}>
                {module.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          aria-label="Status"
          value={statusFilter}
          onValueChange={(value: string) => setStatusFilter(value)}
        >
          <SelectTrigger
            className="w-full sm:w-[160px]"
            data-testid="select-template-status-filter"
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={onRestore}
          disabled={restoring || !canRestore}
          data-testid="button-restore-email-templates"
        >
          {restoring ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Restore System Templates
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" data-testid="text-template-result-count">
          Showing {filteredTemplates.length} of {visibleTemplateList.length} templates
        </p>
        {(searchQuery || moduleFilter !== "all" || statusFilter !== "all") && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setModuleFilter("all");
              setStatusFilter("all");
            }}
            data-testid="button-clear-template-filters"
          >
            Clear Filters
          </Button>
        )}
      </div>
      {!templateList.length && (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 justify-center text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <span>
              No email templates found. Use “Restore System Templates” to repopulate the defaults.
            </span>
          </CardContent>
        </Card>
      )}
      <div className="space-y-3">
        {templateList.length > 0 && filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-8 justify-center text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <span>No email templates match the current filters.</span>
            </CardContent>
          </Card>
        ) : null}

        {filteredTemplates.map((t) => (
          <Card key={t.slug} data-testid={`card-template-${t.slug}`}>
            <CardContent className="py-4 px-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h4 className="font-medium text-sm">{t.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {moduleLabel(t.module)}
                    </Badge>
                    <Badge
                      variant={t.isActive ? "default" : "outline"}
                      className="text-xs"
                      data-testid={`badge-active-${t.slug}`}
                    >
                      {t.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{t.description}</p>
                  <p className="text-xs">
                    <span className="text-muted-foreground">Subject: </span>
                    <span className="font-mono">{t.subject}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Switch
                    disabled={disabled}
                    aria-label={`Active: ${t.name}`}
                    checked={t.isActive}
                    onCheckedChange={(checked: boolean) => onToggle(t, checked)}
                    data-testid={`switch-active-${t.slug}`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Edit ${t.name}`}
                    disabled={disabled}
                    onClick={() => onEdit(t)}
                    data-testid={`button-edit-${t.slug}`}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function emailTemplateSearchText(template: {
  name: string;
  slug: string;
  subject: string;
  description?: string | null;
  variables: string[];
}) {
  return [
    template.name,
    template.slug,
    template.subject,
    template.description,
    ...template.variables,
  ]
    .join(" ")
    .toLowerCase();
}
