import React from "react";
import { useQuery } from "@tanstack/react-query";
import type { CmsGalleryWithItems } from "@shared/schema";
import {
  GalleryPresentation,
  type GalleryRendererProps,
} from "@/features/admin/cms/builder/gallery-presentation";
export function GalleryRenderer(props: GalleryRendererProps) {
  const query = useQuery<CmsGalleryWithItems>({
    queryKey: ["/api/cms/galleries", props.galleryId],
    enabled: !props.gallery && Boolean(props.galleryId),
  });
  return (
    <GalleryPresentation
      {...props}
      gallery={props.gallery ?? query.data}
      isLoading={query.isLoading}
    />
  );
}
