import type { ComponentType } from "react";
import { Plus, RefreshCcw, Trash2, Pencil, Blocks, Search, Layers } from "lucide-react";
import { getBlockDef, type BlockInstance } from "../../../../shared/cms-builder/block-registry";
export type SectionPrimitives = Record<string, ComponentType<any>>;
export interface SectionListRecord {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  createdAt?: string | Date | null;
  blocks: unknown;
}
const CATEGORIES = [
  "all",
  "general",
  "hero",
  "cta",
  "testimonials",
  "faq",
  "features",
  "content",
  "team",
];
const SYSTEM_SECTION_NAME_PREFIX = "Starter - ";

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  hero: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  cta: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  testimonials: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  faq: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  features: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  content: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  team: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
};

export function SectionListPresentation({
  sections,
  isLoading,
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  restoring,
  busy = false,
  onRestore,
  onEdit,
  onDelete,
  formatDate,
  ui,
}: {
  sections: SectionListRecord[];
  isLoading: boolean;
  search: string;
  setSearch: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  restoring: boolean;
  busy?: boolean;
  onRestore: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  formatDate: (date: string | Date) => string;
  ui: SectionPrimitives;
}) {
  const {
    Button,
    Card,
    CardContent,
    Badge,
    Input,
    Skeleton,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  } = ui;
  const filtered = sections.filter((s) => {
    const sectionBlocks = Array.isArray(s.blocks) ? (s.blocks as BlockInstance[]) : [];
    const containsDynamicStarterBlock =
      s.name.startsWith(SYSTEM_SECTION_NAME_PREFIX) &&
      sectionBlocks.some((block) => getBlockDef(block?.type)?.isDynamic);

    if (containsDynamicStarterBlock) return false;

    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || s.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const blockCount = (s: SectionListRecord) => {
    const blocks = Array.isArray(s.blocks) ? s.blocks : [];
    return blocks.length;
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-semibold" data-testid="text-sections-title">
            Reusable Sections
          </h1>
          <p className="text-muted-foreground mt-1">
            Save and reuse block groups across any CMS page
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => onRestore()}
            disabled={busy || restoring}
            data-testid="button-restore-starter-sections"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            {restoring ? "Updating Starter Library..." : "Restore Starter Sections"}
          </Button>
          <Button onClick={() => onEdit("new")} disabled={busy} data-testid="button-new-section">
            <Plus className="h-4 w-4 mr-2" />
            New Section
          </Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            aria-label="Search sections"
            placeholder="Search sections…"
            className="pl-9"
            data-testid="input-sections-search"
          />
        </div>
        <div className="w-40 shrink-0">
          <Select
            aria-label="Filter section category"
            value={categoryFilter}
            onValueChange={setCategoryFilter}
          >
            <SelectTrigger className="w-40" data-testid="select-category-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from(
                new Set([...CATEGORIES, ...sections.map((s) => s.category || "general")]),
              ).map((c) => (
                <SelectItem key={c} value={c} className="capitalize">
                  {c === "all" ? "All categories" : c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-14 pb-14 text-center">
            <div className="h-16 w-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
              <Blocks className="h-8 w-8 text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2">
              {search || categoryFilter !== "all"
                ? "No sections match your filters"
                : "No reusable sections yet"}
            </h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-5">
              {search || categoryFilter !== "all"
                ? "Try a different search or category."
                : "Save block groups as reusable sections to speed up page building. You can also save a block directly from the page builder or restore the full starter library."}
            </p>
            {!search && categoryFilter === "all" && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onRestore()}
                  disabled={busy || restoring}
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  {restoring ? "Updating Starter Library..." : "Restore Starter Sections"}
                </Button>
                <Button onClick={() => onEdit("new")} disabled={busy} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Section
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((section) => (
            <Card
              key={section.id}
              className="group hover:border-violet-300 transition-colors"
              data-testid={`section-card-${section.id}`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                        <Layers className="h-3.5 w-3.5 text-violet-600" />
                      </div>
                      <h3
                        className="text-sm font-semibold truncate"
                        data-testid={`text-section-name-${section.id}`}
                      >
                        {section.name}
                      </h3>
                    </div>
                    {section.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-9">
                        {section.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap pl-9">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] capitalize ${CATEGORY_COLORS[section.category ?? "general"] ?? ""}`}
                  >
                    {section.category ?? "general"}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {blockCount(section)} block{blockCount(section) !== 1 ? "s" : ""}
                  </span>
                  {section.createdAt && (
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(section.createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 pt-1 border-t">
                  <Button
                    onClick={() => onEdit(section.id)}
                    disabled={busy}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    data-testid={`button-edit-section-${section.id}`}
                  >
                    <Pencil className="h-3 w-3 mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive text-xs"
                    disabled={busy}
                    aria-label={`Delete ${section.name}`}
                    onClick={() => onDelete(section.id)}
                    data-testid={`button-delete-section-${section.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
