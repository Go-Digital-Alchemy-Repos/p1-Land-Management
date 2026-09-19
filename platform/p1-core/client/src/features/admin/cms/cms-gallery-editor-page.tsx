import { GalleryEditorPresentation } from "@/components/shared/cms-gallery-editor-presentation";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";

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
      <GalleryEditorPresentation
        draft={{ title, slug, description, status, layout, settings, items }}
        setDraft={(update) => {
          const next = update({ title, slug, description, status, layout, settings, items });
          setTitle(next.title);
          setSlug(next.slug);
          setDescription(next.description || "");
          setStatus(next.status);
          setLayout(next.layout);
          setSettings(next.settings);
          setItems(next.items as GalleryItemForm[]);
        }}
        isNew={isNew}
        busy={saveMutation.isPending}
        canUseMedia={true}
        onBack={() => navigate("/admin/cms/galleries")}
        onSave={() => saveMutation.mutate()}
        onChooseMedia={() => setMediaPickerOpen(true)}
        primitives={{
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
        }}
        uploadControl={
          <CmsImageUpload
            value=""
            onChange={() => undefined}
            onChangeMany={appendMediaAssets}
            multiple
            data-testid="gallery-bulk-image-upload"
          />
        }
        mediaPicker={
          <MediaPickerDialog
            open={mediaPickerOpen}
            onOpenChange={setMediaPickerOpen}
            onSelect={(_, asset) => appendMediaAssets([asset])}
            onSelectMany={appendMediaAssets}
            multiple
            typeFilter="images"
          />
        }
        renderImageInput={(index, item) => (
          <CmsImageUpload
            value={item.imageUrl}
            onChange={(url) => updateItem(index, { imageUrl: url })}
            data-testid={`gallery-image-${index}`}
          />
        )}
        renderPreview={() => <GalleryRenderer gallery={previewGallery} preview inertActions />}
      />
    </AdminSidebar>
  );
}
