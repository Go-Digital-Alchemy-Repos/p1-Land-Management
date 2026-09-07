import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import type { BlockInstance } from "./block-registry";

const LazyPublicPageRenderer = lazy(() =>
  import("@/features/public/public-block-renderer").then((module) => ({
    default: module.PublicPageRenderer,
  })),
);

export type PreviewDevice = "desktop" | "tablet" | "mobile";

const PREVIEW_DEVICE_LABELS: Record<PreviewDevice, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

const PREVIEW_DEVICE_FRAME_CLASSES: Record<PreviewDevice, string> = {
  desktop: "w-full max-w-[1280px]",
  tablet: "w-full max-w-[834px]",
  mobile: "w-full max-w-[430px]",
};

export function initializeFrontendPreviewDocument(
  doc: Document,
  sourceDocument: Document = document,
) {
  doc.open();
  doc.write("<!doctype html><html><head></head><body></body></html>");
  doc.close();

  doc.documentElement.lang = sourceDocument.documentElement.lang || "en";
  doc.body.style.margin = "0";
  doc.body.style.background = "transparent";
  doc.body.style.minHeight = "100vh";

  Array.from(sourceDocument.head.querySelectorAll('style, link[rel="stylesheet"]')).forEach(
    (node) => {
      doc.head.appendChild(node.cloneNode(true));
    },
  );

  const root = doc.createElement("div");
  root.setAttribute("data-frontend-preview-root", "true");
  root.style.minHeight = "100vh";
  doc.body.appendChild(root);
  return root;
}

function FrontendPreviewFrame({
  previewDevice,
  blocks,
}: {
  previewDevice: PreviewDevice;
  blocks: BlockInstance[];
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [mountNode, setMountNode] = useState<HTMLDivElement | null>(null);
  const [frameHeight, setFrameHeight] = useState(900);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    setMountNode(initializeFrontendPreviewDocument(doc));

    return () => {
      setMountNode(null);
    };
  }, [previewDevice]);

  useEffect(() => {
    if (!mountNode) return;
    const doc = mountNode.ownerDocument;
    const view = doc.defaultView;
    if (!view) return;

    const updateHeight = () => {
      const nextHeight = Math.max(
        mountNode.scrollHeight,
        doc.body.scrollHeight,
        doc.documentElement.scrollHeight,
        900,
      );
      setFrameHeight(nextHeight);
    };

    updateHeight();

    const ResizeObserverCtor = view.ResizeObserver;
    if (!ResizeObserverCtor) {
      const frame = view.requestAnimationFrame(updateHeight);
      return () => view.cancelAnimationFrame(frame);
    }

    const observer = new ResizeObserverCtor(() => updateHeight());
    observer.observe(mountNode);
    observer.observe(doc.body);
    observer.observe(doc.documentElement);
    const frame = view.requestAnimationFrame(updateHeight);

    return () => {
      view.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [mountNode, blocks]);

  return (
    <>
      <iframe
        ref={iframeRef}
        title={`${PREVIEW_DEVICE_LABELS[previewDevice]} frontend preview`}
        className={cn(
          "block overflow-hidden rounded-[28px] border border-border/60 bg-background shadow-[0_20px_70px_rgba(15,23,42,0.08)] transition-[max-width] duration-200",
          PREVIEW_DEVICE_FRAME_CLASSES[previewDevice],
        )}
        style={{ height: `${frameHeight}px` }}
      />
      {mountNode
        ? createPortal(
            <div className="min-h-screen bg-background">
              <Suspense fallback={<div className="min-h-screen bg-background" />}>
                <LazyPublicPageRenderer blocks={blocks} />
              </Suspense>
            </div>,
            mountNode,
          )
        : null}
    </>
  );
}

interface FrontendPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocks: BlockInstance[];
  previewDevice: PreviewDevice;
  onPreviewDeviceChange: (device: PreviewDevice) => void;
}

export function FrontendPreviewDialog({
  open,
  onOpenChange,
  blocks,
  previewDevice,
  onPreviewDeviceChange,
}: FrontendPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100vh-2rem)] w-[min(1440px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" />
                Frontend Preview
              </DialogTitle>
              <DialogDescription>
                Review the current page content with the published renderer only, without builder
                chrome, before you publish.
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Monitor className="h-3 w-3" />
                {PREVIEW_DEVICE_LABELS[previewDevice]}
              </Badge>
              <div className="flex items-center rounded-lg border border-border/70 bg-background p-1">
                <Button
                  type="button"
                  variant={previewDevice === "desktop" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPreviewDeviceChange("desktop")}
                  data-testid="button-frontend-preview-desktop"
                  title="Desktop preview"
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={previewDevice === "tablet" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPreviewDeviceChange("tablet")}
                  data-testid="button-frontend-preview-tablet"
                  title="Tablet preview"
                >
                  <Tablet className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={previewDevice === "mobile" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPreviewDeviceChange("mobile")}
                  data-testid="button-frontend-preview-mobile"
                  title="Mobile preview"
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 bg-[radial-gradient(circle_at_top,_rgba(137,205,161,0.10),_transparent_45%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(248,250,252,0.98))] p-4 sm:p-6">
          <ScrollArea className="h-full">
            <div className="mx-auto w-full">
              <FrontendPreviewFrame previewDevice={previewDevice} blocks={blocks} />
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
