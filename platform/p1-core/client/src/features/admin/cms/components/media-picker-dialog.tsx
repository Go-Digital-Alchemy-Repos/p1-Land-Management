import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Image, Search, CheckCircle2, FileText } from "lucide-react";
import type { CmsMediaLibraryAsset } from "@shared/schema";

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, asset: CmsMediaLibraryAsset) => void;
  onSelectMany?: (assets: CmsMediaLibraryAsset[]) => void;
  multiple?: boolean;
  typeFilter?: "images" | "documents" | "all";
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  onSelectMany,
  multiple = false,
  typeFilter = "images",
}: MediaPickerDialogProps) {
  const [search, setSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: assets = [], isLoading } = useQuery<CmsMediaLibraryAsset[]>({
    queryKey: ["/api/admin/cms/media"],
    enabled: open,
  });

  const filtered = assets.filter((a) => {
    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "images" && a.assetKind === "image") ||
      (typeFilter === "documents" && a.assetKind === "document");
    const matchesSearch =
      !search ||
      a.originalName.toLowerCase().includes(search.toLowerCase()) ||
      (a.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (a.alt ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (a.caption ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (a.description ?? "").toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const libraryLabel =
    typeFilter === "all" ? "media items" : typeFilter === "documents" ? "documents" : "images";
  const selectedAssets = selectedIds
    .map((selectedId) => assets.find((asset) => asset.id === selectedId))
    .filter((asset): asset is CmsMediaLibraryAsset => Boolean(asset));

  useEffect(() => {
    if (!open) setSelectedIds([]);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-violet-500" />
            Media Library
          </DialogTitle>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${libraryLabel}…`}
              className="pl-9"
              data-testid="input-media-search"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {[...Array(9)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <Image className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">
                {search ? `No ${libraryLabel} match your search` : "No media uploaded yet"}
              </p>
              <p className="text-xs">Upload media through the CMS builder or Media page</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {filtered.map((asset) => (
                <button
                  key={asset.id}
                  className={`relative group rounded-lg border-2 overflow-hidden aspect-square transition-all hover:border-violet-400 focus:outline-none focus:border-violet-500 bg-muted/30 ${
                    selectedIds.includes(asset.id) ? "border-violet-500" : "border-transparent"
                  }`}
                  onClick={() => {
                    if (multiple) {
                      setSelectedIds((current) =>
                        current.includes(asset.id)
                          ? current.filter((selectedId) => selectedId !== asset.id)
                          : [...current, asset.id],
                      );
                    } else {
                      onSelect(asset.url, asset);
                      onOpenChange(false);
                    }
                  }}
                  onMouseEnter={() => setHoveredId(asset.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  data-testid={`media-asset-${asset.id}`}
                  title={asset.originalName}
                >
                  {asset.assetKind === "image" ? (
                    <img
                      src={asset.url}
                      alt={asset.alt ?? asset.originalName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/30 p-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background shadow-sm">
                        <FileText className="h-6 w-6 text-violet-500" />
                      </div>
                      <span className="line-clamp-2 text-center text-xs font-medium text-foreground">
                        {asset.originalName}
                      </span>
                    </div>
                  )}
                  {hoveredId === asset.id && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1 p-2">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                      <span className="text-white text-xs font-medium text-center line-clamp-2 leading-tight">
                        {asset.originalName}
                      </span>
                      <span className="text-white/70 text-[10px]">
                        {formatBytes(asset.fileSize)}
                      </span>
                    </div>
                  )}
                  {selectedIds.includes(asset.id) && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white shadow">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t bg-muted/20 px-6 py-3">
          <div className="text-xs text-muted-foreground">
            {filtered.length}{" "}
            {typeFilter === "all" ? "item" : typeFilter === "documents" ? "document" : "image"}
            {filtered.length !== 1 ? "s" : ""}
            {search ? " matching search" : " in library"}
            {multiple && selectedIds.length > 0 ? ` · ${selectedIds.length} selected` : ""}
          </div>
          {multiple ? (
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={selectedAssets.length === 0}
                onClick={() => {
                  onSelectMany?.(selectedAssets);
                  onOpenChange(false);
                }}
              >
                {selectedAssets.length > 0 ? `Add ${selectedAssets.length}` : "Add"}{" "}
                {typeFilter === "documents"
                  ? selectedAssets.length === 1
                    ? "Document"
                    : "Documents"
                  : selectedAssets.length === 1
                    ? "Image"
                    : "Images"}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
