import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Monitor,
  Trash2,
} from "lucide-react";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CmsImageUpload } from "./components/cms-image-upload";
import { MediaPickerDialog } from "./components/media-picker-dialog";
import { GalleryRenderer } from "@/components/shared/gallery-renderer";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CmsGallerySettings, CmsGalleryWithItems, CmsMediaLibraryAsset } from "@shared/schema";

type GalleryItemForm = {
  id?: string;
  mediaId?: string | null;
  imageUrl: string;
  alt: string;
  title: string;
  caption: string;
  linkUrl: string;
  ctaText: string;
  tags: string[];
};

const DEFAULT_SETTINGS: CmsGallerySettings = {
  columnsDesktop: 3,
  columnsTablet: 2,
  columnsMobile: 1,
  spacing: "md",
  imageRatio: "4/3",
  cropMode: "cover",
  borderRadius: "md",
  transitionEffect: "none",
  arrowIconColor: "#ffffff",
  arrowBackgroundColor: "#6b7280",
  showTitle: true,
  showCaptions: true,
  captionPosition: "below",
  lightbox: true,
  hoverEffect: "zoom",
  maxImages: 0,
  customClassName: "",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-/]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function CmsGalleryEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const slugEdited = useRef(false);

  const { data: gallery, isLoading } = useQuery<CmsGalleryWithItems>({
    queryKey: ["/api/admin/cms/galleries", id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/cms/galleries/${id}`, { credentials: "include" });
      if (!response.ok) throw new Error("Gallery not found");
      return response.json();
    },
    enabled: !isNew,
  });

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [layout, setLayout] = useState("grid");
  const [settings, setSettings] = useState<CmsGallerySettings>(DEFAULT_SETTINGS);
  const [items, setItems] = useState<GalleryItemForm[]>([]);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const usesGridSettings = layout === "grid" || layout === "masonry" || layout === "carousel";
  const usesSlideSettings = layout === "carousel" || layout === "slider" || layout === "featured";
  const showsControlColors = usesSlideSettings || settings.lightbox;

  useEffect(() => {
    if (!gallery) return;
    setTitle(gallery.title);
    setSlug(gallery.slug);
    setDescription(gallery.description ?? "");
    setStatus(gallery.status);
    setLayout(gallery.layout);
    setSettings({ ...DEFAULT_SETTINGS, ...(gallery.settings ?? {}) });
    setItems(
      gallery.items.map((item) => ({
        id: item.id,
        mediaId: item.mediaId,
        imageUrl: item.imageUrl,
        alt: item.alt ?? "",
        title: item.title ?? "",
        caption: item.caption ?? "",
        linkUrl: item.linkUrl ?? "",
        ctaText: item.ctaText ?? "",
        tags: item.tags ?? [],
      })),
    );
    slugEdited.current = true;
  }, [gallery]);

  const previewGallery = useMemo<CmsGalleryWithItems>(
    () => ({
      id: gallery?.id ?? "preview",
      title: title || "Gallery preview",
      slug,
      description,
      status,
      layout,
      settings,
      createdBy: gallery?.createdBy ?? null,
      updatedBy: gallery?.updatedBy ?? null,
      publishedAt: gallery?.publishedAt ?? null,
      createdAt: gallery?.createdAt ?? null,
      updatedAt: gallery?.updatedAt ?? null,
      imageCount: items.filter((item) => item.imageUrl).length,
      items: items
        .filter((item) => item.imageUrl)
        .map((item, index) => ({
          id: item.id ?? `preview-${index}`,
          galleryId: gallery?.id ?? "preview",
          mediaId: item.mediaId ?? null,
          imageUrl: item.imageUrl,
          alt: item.alt || null,
          title: item.title || null,
          caption: item.caption || null,
          linkUrl: item.linkUrl || null,
          ctaText: item.ctaText || null,
          tags: item.tags,
          sortOrder: index,
          createdAt: null,
          updatedAt: null,
        })),
    }),
    [description, gallery, items, layout, settings, slug, status, title],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        slug: slug || slugify(title),
        description: description || null,
        status,
        layout,
        settings,
        items: items
          .filter((item) => item.imageUrl)
          .map((item, index) => ({
            ...item,
            sortOrder: index,
            alt: item.alt || null,
            title: item.title || null,
            caption: item.caption || null,
            linkUrl: item.linkUrl || null,
            ctaText: item.ctaText || null,
          })),
      };
      const response = await apiRequest(
        isNew ? "POST" : "PUT",
        isNew ? "/api/admin/cms/galleries" : `/api/admin/cms/galleries/${id}`,
        payload,
      );
      return response.json() as Promise<CmsGalleryWithItems>;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({
        predicate: (query) => String(query.queryKey[0]).startsWith("/api/admin/cms/galleries"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cms/galleries", saved.id] });
      toast({ title: isNew ? "Gallery created" : "Gallery saved" });
      if (isNew) navigate(`/admin/cms/galleries/${saved.id}`);
    },
    onError: (error: Error) =>
      toast({
        title: "Failed to save gallery",
        description: error.message,
        variant: "destructive",
      }),
  });

  const setSetting = <K extends keyof CmsGallerySettings>(key: K, value: CmsGallerySettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const updateItem = (index: number, patch: Partial<GalleryItemForm>) => {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const appendMediaAssets = (assets: CmsMediaLibraryAsset[]) => {
    if (assets.length === 0) return;
    setItems((current) => [
      ...current,
      ...assets.map((asset) => ({
        mediaId: asset.id,
        imageUrl: asset.url,
        alt: asset.alt ?? asset.title ?? asset.originalName,
        title: asset.title ?? "",
        caption: asset.caption ?? "",
        linkUrl: "",
        ctaText: "",
        tags: [],
      })),
    ]);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    setItems((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  if (!isNew && isLoading) {
    return (
      <AdminSidebar>
        <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminSidebar>
    );
  }

  return (
    <AdminSidebar>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/cms/galleries")}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Galleries
            </Button>
            <div>
              <h1 className="text-xl font-heading font-semibold">
                {isNew ? "New Gallery" : title || "Edit Gallery"}
              </h1>
              <Badge variant={status === "published" ? "default" : "outline"} className="mt-1">
                {status === "published" ? (
                  <Eye className="mr-1 h-3 w-3" />
                ) : (
                  <EyeOff className="mr-1 h-3 w-3" />
                )}
                {status}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpen(true)}
              disabled={previewGallery.items.length === 0}
              data-testid="button-preview-gallery"
            >
              <Monitor className="mr-2 h-4 w-4" />
              Preview Gallery
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !title.trim()}
            >
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Gallery
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Gallery Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="gallery-title">Title</Label>
                  <Input
                    id="gallery-title"
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      if (!slugEdited.current) setSlug(slugify(event.target.value));
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="gallery-slug">Slug</Label>
                  <Input
                    id="gallery-slug"
                    value={slug}
                    onChange={(event) => {
                      slugEdited.current = true;
                      setSlug(slugify(event.target.value));
                    }}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="gallery-description">Description</Label>
                  <Textarea
                    id="gallery-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Layout</Label>
                    <Select value={layout} onValueChange={setLayout}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grid">Grid</SelectItem>
                        <SelectItem value="masonry">Masonry</SelectItem>
                        <SelectItem value="carousel">Carousel</SelectItem>
                        <SelectItem value="slider">Slider</SelectItem>
                        <SelectItem value="featured">Featured + thumbnails</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Images</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMediaPickerOpen(true)}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Add Images
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <CmsImageUpload
                  value=""
                  onChange={() => undefined}
                  onChangeMany={appendMediaAssets}
                  multiple
                  data-testid="gallery-bulk-image-upload"
                />
                {items.length === 0 ? (
                  <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Add images to build this gallery.
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div key={item.id ?? index} className="rounded-md border p-4">
                      <div className="grid gap-4 xl:grid-cols-[minmax(220px,320px)_minmax(360px,1fr)]">
                        <CmsImageUpload
                          value={item.imageUrl}
                          onChange={(url) => updateItem(index, { imageUrl: url })}
                          data-testid={`gallery-image-${index}`}
                        />
                        <div className="grid min-w-0 gap-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="grid gap-1.5">
                              <Label>Title</Label>
                              <Input
                                value={item.title}
                                onChange={(event) =>
                                  updateItem(index, { title: event.target.value })
                                }
                              />
                            </div>
                            <div className="grid gap-1.5">
                              <Label>Alt text</Label>
                              <Input
                                value={item.alt}
                                onChange={(event) => updateItem(index, { alt: event.target.value })}
                              />
                            </div>
                          </div>
                          <div className="grid gap-1.5">
                            <Label>Caption</Label>
                            <Textarea
                              value={item.caption}
                              onChange={(event) =>
                                updateItem(index, { caption: event.target.value })
                              }
                              rows={2}
                            />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="grid gap-1.5">
                              <Label>Link URL</Label>
                              <Input
                                value={item.linkUrl}
                                onChange={(event) =>
                                  updateItem(index, { linkUrl: event.target.value })
                                }
                              />
                            </div>
                            <div className="grid gap-1.5">
                              <Label>CTA text</Label>
                              <Input
                                value={item.ctaText}
                                onChange={(event) =>
                                  updateItem(index, { ctaText: event.target.value })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => moveItem(index, -1)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => moveItem(index, 1)}
                          disabled={index === items.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setItems((current) => current.filter((_, i) => i !== index))
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Display Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {usesGridSettings ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="grid gap-1.5">
                        <Label>{layout === "carousel" ? "Desktop shown" : "Desktop"}</Label>
                        <Input
                          type="number"
                          min={1}
                          max={6}
                          value={settings.columnsDesktop}
                          onChange={(event) =>
                            setSetting("columnsDesktop", Number(event.target.value))
                          }
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>{layout === "carousel" ? "Tablet shown" : "Tablet"}</Label>
                        <Input
                          type="number"
                          min={1}
                          max={4}
                          value={settings.columnsTablet}
                          onChange={(event) =>
                            setSetting("columnsTablet", Number(event.target.value))
                          }
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>{layout === "carousel" ? "Mobile shown" : "Mobile"}</Label>
                        <Input
                          type="number"
                          min={1}
                          max={2}
                          value={settings.columnsMobile}
                          onChange={(event) =>
                            setSetting("columnsMobile", Number(event.target.value))
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Spacing</Label>
                      <Select
                        value={settings.spacing}
                        onValueChange={(value) =>
                          setSetting("spacing", value as CmsGallerySettings["spacing"])
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="sm">Small</SelectItem>
                          <SelectItem value="md">Medium</SelectItem>
                          <SelectItem value="lg">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : null}
                <div className="grid gap-2">
                  <Label>Image ratio</Label>
                  <Select
                    value={settings.imageRatio}
                    onValueChange={(value) =>
                      setSetting("imageRatio", value as CmsGallerySettings["imageRatio"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Natural</SelectItem>
                      <SelectItem value="1/1">Square</SelectItem>
                      <SelectItem value="4/3">4:3</SelectItem>
                      <SelectItem value="3/2">3:2</SelectItem>
                      <SelectItem value="16/9">16:9</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Image fit</Label>
                  <Select
                    value={settings.cropMode}
                    onValueChange={(value) =>
                      setSetting("cropMode", value as CmsGallerySettings["cropMode"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">Crop to fill</SelectItem>
                      <SelectItem value="contain">Fit full image</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Corner radius</Label>
                  <Select
                    value={settings.borderRadius}
                    onValueChange={(value) =>
                      setSetting("borderRadius", value as CmsGallerySettings["borderRadius"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="sm">Small</SelectItem>
                      <SelectItem value="md">Medium</SelectItem>
                      <SelectItem value="lg">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Hover effect</Label>
                  <Select
                    value={settings.hoverEffect}
                    onValueChange={(value) =>
                      setSetting("hoverEffect", value as CmsGallerySettings["hoverEffect"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="fade">Fade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Image limit</Label>
                  <Input
                    type="number"
                    min={0}
                    max={200}
                    value={settings.maxImages}
                    onChange={(event) => setSetting("maxImages", Number(event.target.value))}
                  />
                </div>
                {usesSlideSettings ? (
                  <div className="grid gap-2">
                    <Label>Transition effect</Label>
                    <Select
                      value={settings.transitionEffect}
                      onValueChange={(value) =>
                        setSetting(
                          "transitionEffect",
                          value as CmsGallerySettings["transitionEffect"],
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No transition effect</SelectItem>
                        <SelectItem value="fade">Fade</SelectItem>
                        <SelectItem value="slide">Slide left/right</SelectItem>
                        <SelectItem value="zoom">Zoom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                {showsControlColors ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Arrow color</Label>
                      <Input
                        type="color"
                        value={settings.arrowIconColor}
                        onChange={(event) => setSetting("arrowIconColor", event.target.value)}
                        className="h-10 w-full cursor-pointer p-1"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Arrow background</Label>
                      <Input
                        type="color"
                        value={settings.arrowBackgroundColor}
                        onChange={(event) => setSetting("arrowBackgroundColor", event.target.value)}
                        className="h-10 w-full cursor-pointer p-1"
                      />
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-2">
                  <Label>Caption position</Label>
                  <Select
                    value={settings.captionPosition}
                    onValueChange={(value) =>
                      setSetting("captionPosition", value as CmsGallerySettings["captionPosition"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="below">Below image</SelectItem>
                      <SelectItem value="overlay">Overlay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label>Show title</Label>
                  <Switch
                    checked={settings.showTitle}
                    onCheckedChange={(value) => setSetting("showTitle", value)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label>Show captions</Label>
                  <Switch
                    checked={settings.showCaptions}
                    onCheckedChange={(value) => setSetting("showCaptions", value)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label>Lightbox</Label>
                  <Switch
                    checked={settings.lightbox}
                    onCheckedChange={(value) => setSetting("lightbox", value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <GalleryRenderer gallery={previewGallery} preview />
              </CardContent>
            </Card>
          </div>
        </div>
        <MediaPickerDialog
          open={mediaPickerOpen}
          onOpenChange={setMediaPickerOpen}
          onSelect={(_, asset) => appendMediaAssets([asset])}
          onSelectMany={appendMediaAssets}
          multiple
          typeFilter="images"
        />
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="flex h-[calc(100vh-2rem)] w-[min(1180px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0">
            <DialogHeader className="border-b px-6 py-4">
              <DialogTitle>Gallery Preview</DialogTitle>
              <DialogDescription>
                Previewing the current gallery draft as it would appear inside page or post content.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto bg-muted/30 px-4 py-6 sm:px-8">
              <article className="mx-auto max-w-4xl rounded-lg border bg-background px-5 py-6 shadow-sm sm:px-8 sm:py-8">
                <header className="mb-6 border-b pb-5">
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Content Preview
                  </p>
                  <h2 className="text-2xl font-heading font-semibold text-foreground">
                    {title || "Gallery preview"}
                  </h2>
                  {description ? (
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                  ) : null}
                </header>
                <GalleryRenderer gallery={previewGallery} preview />
              </article>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminSidebar>
  );
}
