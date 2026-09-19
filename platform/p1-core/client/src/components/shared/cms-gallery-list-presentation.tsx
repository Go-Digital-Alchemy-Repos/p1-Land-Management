import React from "react";
import { Plus, Search, Image, Pencil, Eye, EyeOff, Copy, Trash2 } from "lucide-react";
import type { GalleryPrimitives } from "./cms-gallery-editor-presentation";
import "./cms-gallery-presentation.css";
export interface GalleryListRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  imageCount: number;
  updatedAt?: string | Date | null;
}
export function GalleryListPresentation({
  galleries,
  isLoading,
  search,
  setSearch,
  status,
  setStatus,
  sort,
  setSort,
  onSelect,
  onAction,
  primitives,
  busy = false,
}: {
  galleries: GalleryListRow[];
  isLoading: boolean;
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  sort: string;
  setSort: (value: string) => void;
  onSelect: (id: string) => void;
  onAction: (id: string, action: "publish" | "unpublish" | "duplicate" | "delete") => void;
  primitives: GalleryPrimitives;
  busy?: boolean;
}) {
  const {
    Button,
    Card,
    CardContent,
    Input,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Badge,
    Skeleton,
  } = primitives;
  return (
    <div className="cms-gallery-presentation">
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-heading font-semibold">Galleries</h1>
            <p className="mt-1 text-muted-foreground">
              Create reusable photo galleries for pages and blog posts.
            </p>
          </div>
          <Button disabled={busy} onClick={() => onSelect("new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Gallery
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search galleries"
                  value={search}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search galleries"
                  className="pl-9"
                />
              </div>
              <Select aria-label="Filter gallery status" value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select aria-label="Sort galleries" value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Recently updated</SelectItem>
                  <SelectItem value="created">Recently created</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-16 w-full" />
                ))}
              </div>
            ) : galleries.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Image className="mx-auto mb-3 h-10 w-10 opacity-35" />
                <p className="font-medium text-foreground">No galleries yet</p>
                <p className="mt-1 text-sm">
                  Create your first gallery to reuse it across the site.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-2 py-3 font-medium">Title</th>
                      <th className="px-2 py-3 font-medium hidden md:table-cell">Slug</th>
                      <th className="px-2 py-3 font-medium">Images</th>
                      <th className="px-2 py-3 font-medium">Status</th>
                      <th className="px-2 py-3 font-medium hidden lg:table-cell">Updated</th>
                      <th className="px-2 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {galleries.map((gallery) => (
                      <tr
                        key={gallery.id}
                        className="border-b last:border-0 hover:bg-muted/30"
                        onClick={() => {
                          if (!busy) onSelect(gallery.id);
                        }}
                      >
                        <td className="px-2 py-3 font-medium">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onSelect(gallery.id)}
                          >
                            {gallery.title}
                          </button>
                          <code className="block text-xs text-muted-foreground">{`[gallery id="${gallery.id}"]`}</code>
                        </td>
                        <td className="px-2 py-3 hidden md:table-cell font-mono text-xs text-muted-foreground">
                          {gallery.slug}
                        </td>
                        <td className="px-2 py-3">{gallery.imageCount}</td>
                        <td className="px-2 py-3">
                          <Badge
                            variant={gallery.status === "published" ? "default" : "outline"}
                            className={gallery.status === "published" ? "bg-green-600" : ""}
                          >
                            {gallery.status}
                          </Badge>
                        </td>
                        <td className="px-2 py-3 hidden lg:table-cell text-muted-foreground">
                          {gallery.updatedAt
                            ? new Date(gallery.updatedAt).toLocaleDateString()
                            : ""}
                        </td>
                        <td className="px-2 py-3">
                          <div
                            className="flex justify-end gap-1"
                            onClick={(event: React.MouseEvent) => event.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onSelect(gallery.id)}
                              aria-label={`Edit ${gallery.title}`}
                              disabled={busy}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {gallery.status === "published" ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onAction(gallery.id, "unpublish")}
                                aria-label={`Unpublish ${gallery.title}`}
                                disabled={busy}
                              >
                                <EyeOff className="h-4 w-4 text-amber-600" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onAction(gallery.id, "publish")}
                                aria-label={`Publish ${gallery.title}`}
                                disabled={busy}
                              >
                                <Eye className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onAction(gallery.id, "duplicate")}
                              aria-label={`Duplicate ${gallery.title}`}
                              disabled={busy}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onAction(gallery.id, "delete")}
                              aria-label={`Delete ${gallery.title}`}
                              disabled={busy}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
