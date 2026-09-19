import React, { useState, type ComponentType, type ReactNode } from "react";
import { AlertCircle, Search } from "lucide-react";
import { cn } from "../../lib/utils";
export type IntegrationLibraryRecord = {
  category: string;
  title: string;
  description: string;
  group: string;
  icon: ComponentType<any>;
  brandIcon?: ComponentType<any>;
  brandColor?: string;
  logoText?: string;
  libraryCategory?: string;
  capabilities?: string[];
  supportedCapabilities?: string[];
  supportedEvents?: string[];
  operational?: boolean;
  fields?: { label: string }[];
};
type IntegrationGroupKey = string;
type IntegrationLibraryCategory = string;
type IntegrationStatusFilter = "all" | "configured" | "not_configured";
export function IntegrationLibrary({
  ui,
  integrations: platformIntegrations,
  groups: INTEGRATION_GROUPS,
  isConfigured,
  onOpen,
  description,
}: {
  ui: Record<string, ComponentType<any>>;
  integrations: IntegrationLibraryRecord[];
  groups: { key: string; title: string; description: string }[];
  isConfigured: (config: IntegrationLibraryRecord) => boolean;
  onOpen: (config: IntegrationLibraryRecord) => void;
  description?: ReactNode;
}) {
  const {
    Badge,
    Button,
    Card,
    CardContent,
    Input,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  } = ui;
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<IntegrationStatusFilter>("all");
  const configuredCount = platformIntegrations.filter(isConfigured).length;
  const groupCounts = Object.fromEntries(
    INTEGRATION_GROUPS.map((g) => [
      g.key,
      {
        total: platformIntegrations.filter((c) => c.group === g.key).length,
        configured: platformIntegrations.filter((c) => c.group === g.key && isConfigured(c)).length,
      },
    ]),
  );
  const libraryCategories = [
    ...new Set(platformIntegrations.map((c) => c.libraryCategory || "Other")),
  ].sort((a, b) => a.localeCompare(b));
  const getIntegrationGroupLabel = (key: string) =>
    INTEGRATION_GROUPS.find((g) => g.key === key)?.title || key;
  const filteredIntegrations = platformIntegrations.filter(
    (c) =>
      (groupFilter === "all" || c.group === groupFilter) &&
      (categoryFilter === "all" || (c.libraryCategory || "Other") === categoryFilter) &&
      (statusFilter === "all" ||
        (statusFilter === "configured" ? isConfigured(c) : !isConfigured(c))) &&
      [
        c.title,
        c.category,
        c.description,
        getIntegrationGroupLabel(c.group),
        c.libraryCategory,
        ...(c.capabilities || []),
        ...(c.supportedCapabilities || []),
        ...(c.supportedEvents || []),
        c.operational ? "operational" : "setup ready requires adapter",
        ...(c.fields || []).map((field) => field.label),
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-integrations-heading">
          Integrations
        </h3>
        <p className="text-sm text-muted-foreground">
          {description || (
            <>
              Browse platform-wide integrations as a library. {configuredCount} of{" "}
              {platformIntegrations.length} connections have saved settings, and secret values are
              encrypted at rest.
            </>
          )}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {INTEGRATION_GROUPS.map((group) => {
          const counts = groupCounts[group.key] || { total: 0, configured: 0 };
          if (counts.total === 0) return null;

          return (
            <button
              key={group.key}
              type="button"
              onClick={() => setGroupFilter(group.key)}
              className={cn(
                "rounded-lg border bg-background p-3 text-left shadow-sm transition-colors hover:bg-muted/40",
                groupFilter === group.key && "border-primary bg-primary/5",
              )}
              data-testid={`button-integration-group-${group.key}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{group.title}</span>
                <Badge variant="secondary" className="text-xs">
                  {counts.total}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{counts.configured} configured</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 p-3">
        <div className="relative min-w-0 flex-1 basis-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setSearchQuery(event.target.value)
            }
            aria-label="Search integrations"
            placeholder="Search integrations, providers, capabilities..."
            className="pl-9"
            data-testid="input-search-integrations"
          />
        </div>
        <Select
          aria-label="Module type"
          value={groupFilter}
          onValueChange={(value: string) => setGroupFilter(value as IntegrationGroupKey | "all")}
        >
          <SelectTrigger
            className="w-full sm:w-[190px]"
            aria-label="Module type"
            data-testid="select-integration-group-filter"
          >
            <SelectValue placeholder="Module type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Module Types</SelectItem>
            {INTEGRATION_GROUPS.map((group) => (
              <SelectItem key={group.key} value={group.key}>
                {group.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          aria-label="Category"
          value={categoryFilter}
          onValueChange={(value: string) =>
            setCategoryFilter(value as IntegrationLibraryCategory | "all")
          }
        >
          <SelectTrigger
            className="w-full sm:w-[190px]"
            aria-label="Category"
            data-testid="select-integration-category-filter"
          >
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {libraryCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          aria-label="Status"
          value={statusFilter}
          onValueChange={(value: string) => setStatusFilter(value as IntegrationStatusFilter)}
        >
          <SelectTrigger
            className="w-full sm:w-[165px]"
            aria-label="Status"
            data-testid="select-integration-status-filter"
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="configured">Configured</SelectItem>
            <SelectItem value="not_configured">Not Configured</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" data-testid="text-integration-result-count">
          Showing {filteredIntegrations.length} of {platformIntegrations.length} integrations
        </p>
        {(searchQuery ||
          groupFilter !== "all" ||
          categoryFilter !== "all" ||
          statusFilter !== "all") && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setGroupFilter("all");
              setCategoryFilter("all");
              setStatusFilter("all");
            }}
            data-testid="button-clear-integration-filters"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {filteredIntegrations.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <span>No integrations match the current filters.</span>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredIntegrations.map((config) => {
            const configured = isConfigured(config);
            const Icon = config.icon;
            const BrandIcon = config.brandIcon;

            return (
              <Card key={config.category} data-testid={`library-integration-${config.category}`}>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border bg-background shadow-sm">
                        {BrandIcon ? (
                          <BrandIcon
                            aria-label={`${config.title} logo`}
                            className={cn("h-6 w-6", config.brandColor || "text-primary")}
                          />
                        ) : config.logoText ? (
                          <span
                            aria-label={`${config.title} logo`}
                            className={cn(
                              "px-1 text-center text-[10px] font-bold leading-tight tracking-normal",
                              config.brandColor || "text-primary",
                            )}
                          >
                            {config.logoText}
                          </span>
                        ) : (
                          <Icon className={cn("h-5 w-5", config.brandColor || "text-primary")} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold">{config.title}</h4>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {config.description}
                        </p>
                      </div>
                    </div>
                    <Badge variant={configured ? "default" : "outline"} className="text-xs">
                      {configured ? "Configured" : "Not configured"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-xs">
                      {getIntegrationGroupLabel(config.group)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {config.libraryCategory || "Other"}
                    </Badge>
                    {(config.capabilities || []).slice(0, 2).map((capability) => (
                      <Badge key={capability} variant="outline" className="text-xs font-normal">
                        {capability}
                      </Badge>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => onOpen(config)}
                    data-testid={`button-open-integration-${config.category}`}
                  >
                    Configure
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
