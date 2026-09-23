import React, { useState, useRef, useEffect } from "react";
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
import type { CmsGallerySettings } from "../../../../shared/schema/cms-galleries";
import "./cms-gallery-presentation.css";
export type GalleryItemDraft = {
  id?: string;
  mediaId?: string | null;
  imageUrl: string;
  alt?: string | null;
  title?: string | null;
  caption?: string | null;
  linkUrl?: string | null;
  ctaText?: string | null;
  tags?: string[];
  [key: string]: unknown;
};
export type GalleryDraft = {
  title: string;
  slug: string;
  description?: string | null;
  status: string;
  layout: string;
  settings: CmsGallerySettings;
  items: GalleryItemDraft[];
};
export type GalleryPrimitives = Record<string, React.ComponentType<any>>;
export interface GalleryEditorPresentationProps {
  draft: GalleryDraft;
  setDraft: (update: (current: GalleryDraft) => GalleryDraft) => void;
  isNew: boolean;
  busy: boolean;
  mutationDisabledReason?: string;
  canUseMedia: boolean;
  onBack: () => void;
  onSave: () => void;
  onChooseMedia: () => void;
  confirmRemoveItem?: (index: number) => boolean;
  primitives: GalleryPrimitives;
  uploadControl: React.ReactNode;
  mediaPicker: React.ReactNode;
  renderImageInput: (index: number, item: GalleryItemDraft) => React.ReactNode;
  renderPreview: (gallery: GalleryDraft) => React.ReactNode;
}
function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-/]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
export function GalleryEditorPresentation({
  draft,
  setDraft,
  isNew,
  busy,
  mutationDisabledReason,
  canUseMedia,
  onBack,
  onSave,
  onChooseMedia,
  confirmRemoveItem = () => true,
  primitives,
  uploadControl,
  mediaPicker,
  renderImageInput,
  renderPreview,
}: GalleryEditorPresentationProps) {
  const {
    Button,
    Card,
    CardHeader,
    CardContent,
    CardTitle,
    Badge,
    Input,
    Textarea,
    Label,
    Switch,
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } = primitives;
  const { title, slug, description, status, layout, settings, items } = draft;
  const setSlug = (slug: string) => setDraft((d) => ({ ...d, slug }));
  const setDescription = (description: string) => setDraft((d) => ({ ...d, description }));
  const setStatus = (status: string) => setDraft((d) => ({ ...d, status }));
  const setLayout = (layout: string) => setDraft((d) => ({ ...d, layout }));
  const setItems = (update: React.SetStateAction<GalleryItemDraft[]>) =>
    setDraft((d) => ({ ...d, items: typeof update === "function" ? update(d.items) : update }));
  const setSetting = <K extends keyof CmsGallerySettings>(key: K, value: CmsGallerySettings[K]) =>
    setDraft((d) => ({ ...d, settings: { ...d.settings, [key]: value } }));
  const updateItem = (index: number, patch: Partial<GalleryItemDraft>) =>
    setItems((rows) => rows.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const moveItem = (index: number, offset: number) =>
    setItems((rows) => {
      const target = index + offset;
      if (target < 0 || target >= rows.length) return rows;
      const next = [...rows];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const slugEdited = useRef(!isNew);
  const [previewOpen, setPreviewOpen] = useState(false);
  useEffect(() => {
    if (busy) setPreviewOpen(false);
  }, [busy]);
  const previewGallery = draft;
  const usesGridSettings = layout === "grid" || layout === "masonry" || layout === "carousel";
  const usesSlideSettings = layout === "carousel" || layout === "slider" || layout === "featured";
  const showsControlColors = usesSlideSettings || settings.lightbox;
  return (
    <div className="cms-gallery-presentation">
      <fieldset disabled={busy} className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
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
            <Button onClick={onSave} disabled={busy || !title.trim() || !!mutationDisabledReason} aria-disabled={!!mutationDisabledReason} title={mutationDisabledReason}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
                    onChange={(
                      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                    ) => {
                      const nextTitle = event.target.value;
                      setDraft((d) => ({
                        ...d,
                        title: nextTitle,
                        ...(!slugEdited.current ? { slug: slugify(nextTitle) } : {}),
                      }));
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="gallery-slug">Slug</Label>
                  <Input
                    id="gallery-slug"
                    value={slug}
                    onChange={(
                      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                    ) => {
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
                    value={description ?? ""}
                    onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setDescription(event.target.value)
                    }
                    rows={3}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select aria-label="Status" value={status} onValueChange={setStatus}>
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
                    <Select aria-label="Layout" value={layout} onValueChange={setLayout}>
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
                  onClick={onChooseMedia}
                  disabled={!canUseMedia || busy}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Add Images
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {uploadControl}
                {items.length === 0 ? (
                  <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Add images to build this gallery.
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div key={item.id ?? index} className="rounded-md border p-4">
                      <div className="grid gap-4 xl:grid-cols-[minmax(220px,320px)_minmax(360px,1fr)]">
                        {renderImageInput(index, item)}
                        <div className="grid min-w-0 gap-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="grid gap-1.5">
                              <Label>Title</Label>
                              <Input
                                aria-label="Title"
                                value={item.title ?? ""}
                                onChange={(
                                  event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                                ) => updateItem(index, { title: event.target.value })}
                              />
                            </div>
                            <div className="grid gap-1.5">
                              <Label>Alt text</Label>
                              <Input
                                aria-label="Alt text"
                                value={item.alt ?? ""}
                                onChange={(
                                  event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                                ) => updateItem(index, { alt: event.target.value })}
                              />
                            </div>
                          </div>
                          <div className="grid gap-1.5">
                            <Label>Caption</Label>
                            <Textarea
                              aria-label="Caption"
                              value={item.caption ?? ""}
                              onChange={(
                                event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                              ) => updateItem(index, { caption: event.target.value })}
                              rows={2}
                            />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="grid gap-1.5">
                              <Label>Link URL</Label>
                              <Input
                                aria-label="Link URL"
                                value={item.linkUrl ?? ""}
                                onChange={(
                                  event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                                ) => updateItem(index, { linkUrl: event.target.value })}
                              />
                            </div>
                            <div className="grid gap-1.5">
                              <Label>CTA text</Label>
                              <Input
                                aria-label="CTA text"
                                value={item.ctaText ?? ""}
                                onChange={(
                                  event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                                ) => updateItem(index, { ctaText: event.target.value })}
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
                          aria-label={`Move image ${index + 1} up`}
                          onClick={() => moveItem(index, -1)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Move image ${index + 1} down`}
                          onClick={() => moveItem(index, 1)}
                          disabled={index === items.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove image ${index + 1}`}
                          onClick={() => {
                            if (confirmRemoveItem(index))
                              setItems((current) => current.filter((_, i) => i !== index));
                          }}
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
                          aria-label={layout === "carousel" ? "Desktop shown" : "Desktop"}
                          type="number"
                          min={1}
                          max={6}
                          value={settings.columnsDesktop}
                          onChange={(
                            event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                          ) => setSetting("columnsDesktop", Number(event.target.value))}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>{layout === "carousel" ? "Tablet shown" : "Tablet"}</Label>
                        <Input
                          aria-label={layout === "carousel" ? "Tablet shown" : "Tablet"}
                          type="number"
                          min={1}
                          max={4}
                          value={settings.columnsTablet}
                          onChange={(
                            event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                          ) => setSetting("columnsTablet", Number(event.target.value))}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>{layout === "carousel" ? "Mobile shown" : "Mobile"}</Label>
                        <Input
                          aria-label={layout === "carousel" ? "Mobile shown" : "Mobile"}
                          type="number"
                          min={1}
                          max={2}
                          value={settings.columnsMobile}
                          onChange={(
                            event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                          ) => setSetting("columnsMobile", Number(event.target.value))}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Spacing</Label>
                      <Select
                        aria-label="Spacing"
                        value={settings.spacing}
                        onValueChange={(value: string) =>
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
                    aria-label="Image ratio"
                    value={settings.imageRatio}
                    onValueChange={(value: string) =>
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
                    aria-label="Image fit"
                    value={settings.cropMode}
                    onValueChange={(value: string) =>
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
                    aria-label="Corner radius"
                    value={settings.borderRadius}
                    onValueChange={(value: string) =>
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
                    aria-label="Hover effect"
                    value={settings.hoverEffect}
                    onValueChange={(value: string) =>
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
                    aria-label="Image limit"
                    type="number"
                    min={0}
                    max={200}
                    value={settings.maxImages}
                    onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setSetting("maxImages", Number(event.target.value))
                    }
                  />
                </div>
                {usesSlideSettings ? (
                  <div className="grid gap-2">
                    <Label>Transition effect</Label>
                    <Select
                      aria-label="Transition effect"
                      value={settings.transitionEffect}
                      onValueChange={(value: string) =>
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
                        aria-label="Arrow color"
                        type="color"
                        value={settings.arrowIconColor}
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                        ) => setSetting("arrowIconColor", event.target.value)}
                        className="h-10 w-full cursor-pointer p-1"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Arrow background</Label>
                      <Input
                        aria-label="Arrow background"
                        type="color"
                        value={settings.arrowBackgroundColor}
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                        ) => setSetting("arrowBackgroundColor", event.target.value)}
                        className="h-10 w-full cursor-pointer p-1"
                      />
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-2">
                  <Label>Caption position</Label>
                  <Select
                    aria-label="Caption position"
                    value={settings.captionPosition}
                    onValueChange={(value: string) =>
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
                <div className="grid gap-1.5">
                  <Label>Custom CSS class</Label>
                  <Input
                    aria-label="Custom CSS class"
                    value={settings.customClassName || ""}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setSetting("customClassName", event.target.value)
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label>Show title</Label>
                  <Switch
                    aria-label="Show title"
                    checked={settings.showTitle}
                    onCheckedChange={(value: boolean) => setSetting("showTitle", value)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label>Show captions</Label>
                  <Switch
                    aria-label="Show captions"
                    checked={settings.showCaptions}
                    onCheckedChange={(value: boolean) => setSetting("showCaptions", value)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label>Lightbox</Label>
                  <Switch
                    aria-label="Enable lightbox"
                    checked={settings.lightbox}
                    onCheckedChange={(value: boolean) => setSetting("lightbox", value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Preview</CardTitle>
              </CardHeader>
              <CardContent>{renderPreview(previewGallery)}</CardContent>
            </Card>
          </div>
        </div>
        {mediaPicker}
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
                {renderPreview(previewGallery)}
              </article>
            </div>
          </DialogContent>
        </Dialog>
      </fieldset>
    </div>
  );
}
