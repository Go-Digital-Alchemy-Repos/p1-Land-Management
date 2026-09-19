import React, { useEffect, useRef, type ReactNode } from "react";
import type { MarketingGalleryInput } from "../../../../lib/api-client-react/src/dashboard/models";
import { GalleryPresentation } from "../../../../platform/p1-core/client/src/features/admin/cms/builder/gallery-presentation";
import type { CmsGalleryWithItems } from "../../../../platform/p1-core/shared/schema/cms-galleries";
function GalleryLightboxModal({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current!;
    node.showModal();
    node.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      node.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-label="Gallery image preview"
      aria-modal="true"
      style={{
        padding: 0,
        border: 0,
        maxWidth: "none",
        maxHeight: "none",
        width: "100vw",
        height: "100vh",
      }}
      onCancel={(event) => {
        event.preventDefault();
        close.current();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          close.current();
        }
        if (event.key === "Tab") {
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          );
          const first = controls[0],
            last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      {children}
    </dialog>
  );
}
export function GalleryPreview({
  gallery,
}: {
  gallery: MarketingGalleryInput;
}) {
  const preview = {
    ...gallery,
    id: "preview",
    imageCount: gallery.items.filter((item) => item.imageUrl).length,
    items: gallery.items
      .filter((item) => item.imageUrl)
      .map((item, index) => ({
        ...item,
        id: item.id || `preview-${index}`,
        galleryId: "preview",
        sortOrder: index,
        imageUrl:
          item.imageUrl.startsWith("/") && !item.imageUrl.startsWith("//")
            ? `https://www.p1landmanagement.com${item.imageUrl}`
            : item.imageUrl,
      })),
  };
  return (
    <GalleryPresentation
      gallery={preview as unknown as CmsGalleryWithItems}
      preview
      inertActions
      lightboxHost={GalleryLightboxModal}
    />
  );
}
