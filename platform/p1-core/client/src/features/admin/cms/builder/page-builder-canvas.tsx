import type { DragEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  Lock,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { getBlockDef, isDynamicBlock, type BlockInstance } from "./block-registry";
import { BlockRenderer as AdminBlockRenderer } from "./block-renderer";
import {
  getSectionPaddingClasses,
  getSectionStyleConfig,
  hasSectionStyleConfig,
  SectionStyleWrapper,
} from "./section-style";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { getBlockSummary } from "./page-builder-support";
import { FULL_WIDTH_BLOCK_TYPES } from "./page-builder-constants";
import { reportBuilderRenderError } from "./builder-diagnostics";

interface CanvasBlockFrameProps {
  block: BlockInstance;
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onToggleActive: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onAddBelow: (id: string) => void;
  registerBlockRef: (id: string, node: HTMLDivElement | null) => void;
  onCanvasDragStart: (event: DragEvent, blockId: string) => void;
  onCanvasDragEnd: () => void;
  draggedBlockId: string | null;
  hasActiveDragPayload: boolean;
  dropTarget: { id: string; position: "before" | "after" } | null;
  onBlockDragOver: (event: DragEvent, targetId: string) => void;
  onBlockDrop: (event: DragEvent, targetId: string) => void;
  onBlockDragEnd: () => void;
}

function CanvasDropZone({
  index,
  active,
  onDragOver,
  onDrop,
}: {
  index: number;
  active: boolean;
  onDragOver: (event: DragEvent, index: number) => void;
  onDrop: (event: DragEvent, index: number) => void;
}) {
  return (
    <div
      className={cn("relative h-4 transition-all", active && "h-10")}
      onDragOver={(event) => onDragOver(event, index)}
      onDrop={(event) => onDrop(event, index)}
      data-testid={`canvas-drop-zone-${index}`}
    >
      <div
        className={cn(
          "absolute left-8 right-8 top-1/2 h-1 -translate-y-1/2 rounded-full border border-dashed border-transparent",
          active && "border-violet-500 bg-violet-500 shadow-sm",
        )}
      />
    </div>
  );
}

function BlockPreviewFallback({
  blockType,
  summary,
  blockId,
}: {
  blockType: string;
  summary: string;
  blockId: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/80 p-4 sm:p-6 text-left dark:border-amber-700 dark:bg-amber-950/20">
      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        This block preview could not be rendered in the builder.
      </p>
      <p className="mt-2 text-sm text-amber-800/90 dark:text-amber-300/90">
        The section is still available for editing. You can adjust its settings in the inspector and
        keep working.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-amber-900/80 dark:text-amber-200/80">
        <span className="rounded-full bg-background/80 px-2 py-1">Block ID: {blockId}</span>
        <span className="rounded-full bg-background/80 px-2 py-1">Type: {blockType}</span>
        {summary ? (
          <span className="rounded-full bg-background/80 px-2 py-1">{summary}</span>
        ) : null}
      </div>
    </div>
  );
}

function CanvasBlockFrame({
  block,
  index,
  isSelected,
  onSelect,
  onToggleActive,
  onDuplicate,
  onDelete,
  onMove,
  onAddBelow,
  registerBlockRef,
  onCanvasDragStart,
  onCanvasDragEnd,
  draggedBlockId,
  hasActiveDragPayload,
  dropTarget,
  onBlockDragOver,
  onBlockDrop,
  onBlockDragEnd,
}: CanvasBlockFrameProps) {
  const blockDef = getBlockDef(block.type);
  const summary = getBlockSummary(block);
  const isDynamic = isDynamicBlock(block.type);
  const showDropBefore = dropTarget?.id === block.id && dropTarget.position === "before";
  const showDropAfter = dropTarget?.id === block.id && dropTarget.position === "after";

  return (
    <div
      ref={(node) => {
        registerBlockRef(block.id, node);
      }}
      className={cn(
        "group relative scroll-mt-24 transition-all",
        draggedBlockId === block.id && "opacity-60",
        showDropBefore &&
          "pt-4 before:absolute before:left-6 before:right-6 before:top-1 before:z-30 before:h-1 before:rounded-full before:bg-violet-500",
        showDropAfter &&
          "pb-4 after:absolute after:left-6 after:right-6 after:bottom-1 after:z-30 after:h-1 after:rounded-full after:bg-violet-500",
      )}
      onDragOver={(event) => onBlockDragOver(event, block.id)}
      onDrop={(event) => onBlockDrop(event, block.id)}
      onDragEnd={onBlockDragEnd}
      data-testid={`canvas-block-${block.id}`}
    >
      <div
        className={cn(
          "relative transition-all",
          isSelected
            ? "ring-2 ring-violet-500 ring-offset-4 ring-offset-background"
            : "hover:ring-2 hover:ring-violet-300/70 hover:ring-offset-2 hover:ring-offset-background",
          hasActiveDragPayload && !isSelected && "ring-offset-background",
        )}
      >
        <div className="pointer-events-none select-none">
          <ErrorBoundary
            name={`builder-block-preview:${block.type}`}
            onError={(error, errorInfo) =>
              reportBuilderRenderError({
                surface: "builder-block-preview",
                block: { id: block.id, type: block.type },
                error,
                errorInfo,
                context: {
                  index,
                  label: blockDef?.label ?? block.type,
                },
              })
            }
            fallback={
              <BlockPreviewFallback
                blockType={blockDef?.label ?? block.type}
                summary={summary}
                blockId={block.id}
              />
            }
          >
            <AdminBlockRenderer block={block} isAdminPreview disableSectionStyleWrap />
          </ErrorBoundary>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelect(block.id)}
        className="absolute inset-0 z-10"
        aria-label={`Select ${blockDef?.label ?? block.type} block`}
        data-testid={`select-canvas-block-${block.id}`}
      />

      <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[70%] flex-wrap items-center gap-2">
        <Badge className="bg-slate-900/80 text-white hover:bg-slate-900/80">{index + 1}</Badge>
        <Badge variant="secondary" className="bg-background/90 backdrop-blur">
          {blockDef?.label ?? block.type}
        </Badge>
        {isDynamic && (
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50/90 text-amber-800 backdrop-blur dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
          >
            <Lock className="mr-1 h-2.5 w-2.5" />
            Dynamic
          </Badge>
        )}
        {block.props.isActive === false && (
          <Badge
            variant="outline"
            className="border-slate-300 bg-slate-50/90 text-slate-700 backdrop-blur dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300"
          >
            Inactive
          </Badge>
        )}
        {summary && (
          <span className="truncate rounded-full bg-background/90 px-2 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
            {summary}
          </span>
        )}
      </div>

      <div
        className={cn(
          "canvas-block-actions absolute right-3 top-3 z-20 flex items-center gap-1 transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 cursor-grab shadow-sm active:cursor-grabbing"
          draggable
          onDragStart={(event) => {
            event.stopPropagation();
            onCanvasDragStart(event, block.id);
          }}
          onDragEnd={(event) => {
            event.stopPropagation();
            onCanvasDragEnd();
          }}
          data-testid={`canvas-drag-${block.id}`}
          title="Drag to move"
          aria-label="Drag block to move"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-sm"
          onClick={(event) => {
            event.stopPropagation();
            onToggleActive(block.id);
          }}
          data-testid={`canvas-toggle-active-${block.id}`}
          title={block.props.isActive === false ? "Show on public site" : "Hide from public site"}
          aria-label={
            block.props.isActive === false
              ? "Show block on public site"
              : "Hide block from public site"
          }
        >
          {block.props.isActive === false ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-sm"
          onClick={(event) => {
            event.stopPropagation();
            onSelect(block.id);
          }}
          data-testid={`canvas-edit-${block.id}`}
          aria-label="Edit block"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-sm"
          onClick={(event) => {
            event.stopPropagation();
            onMove(block.id, "up");
          }}
          data-testid={`canvas-move-up-${block.id}`}
          aria-label="Move block up"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-sm"
          onClick={(event) => {
            event.stopPropagation();
            onMove(block.id, "down");
          }}
          data-testid={`canvas-move-down-${block.id}`}
          aria-label="Move block down"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-sm"
          onClick={(event) => {
            event.stopPropagation();
            onAddBelow(block.id);
          }}
          data-testid={`canvas-add-below-${block.id}`}
          aria-label="Add block below"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-sm"
          onClick={(event) => {
            event.stopPropagation();
            onDuplicate(block.id);
          }}
          data-testid={`canvas-duplicate-${block.id}`}
          aria-label="Duplicate block"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-8 w-8 shadow-sm"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(block.id);
          }}
          data-testid={`canvas-delete-${block.id}`}
          aria-label="Delete block"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export interface VisualCanvasProps {
  blocks: BlockInstance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleActive: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onAddBelow: (id: string) => void;
  registerBlockRef: (id: string, node: HTMLDivElement | null) => void;
  onCanvasDragStart: (event: DragEvent, blockId: string) => void;
  onCanvasDragEnd: () => void;
  draggedBlockId: string | null;
  hasActiveDragPayload: boolean;
  dropTarget: { id: string; position: "before" | "after" } | null;
  onBlockDragOver: (event: DragEvent, targetId: string) => void;
  onBlockDrop: (event: DragEvent, targetId: string) => void;
  onBlockDragEnd: () => void;
  canvasDropIndex: number | null;
  onCanvasDropZoneDragOver: (event: DragEvent, index: number) => void;
  onCanvasDropZoneDrop: (event: DragEvent, index: number) => void;
  desktopFrameClassName?: string;
}

export function VisualCanvas({
  blocks,
  selectedId,
  onSelect,
  onToggleActive,
  onDuplicate,
  onDelete,
  onMove,
  onAddBelow,
  registerBlockRef,
  onCanvasDragStart,
  onCanvasDragEnd,
  draggedBlockId,
  hasActiveDragPayload,
  dropTarget,
  onBlockDragOver,
  onBlockDrop,
  onBlockDragEnd,
  canvasDropIndex,
  onCanvasDropZoneDragOver,
  onCanvasDropZoneDrop,
  desktopFrameClassName,
}: VisualCanvasProps) {
  let nonFullWidthIndex = 0;

  return (
    <div className="h-full bg-[radial-gradient(circle_at_top,_rgba(137,205,161,0.12),_transparent_45%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(248,250,252,0.98))] p-2 sm:p-5">
      <div
        className={cn(
          "mx-auto flex min-h-full max-w-full flex-col overflow-hidden rounded-[28px] border border-border/60 bg-background shadow-[0_20px_70px_rgba(15,23,42,0.08)] transition-[max-width] duration-200",
          desktopFrameClassName,
        )}
      >
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Visual Canvas</p>
            <p className="text-xs text-muted-foreground">
              This editing surface uses the published page renderer, then layers selection and
              editing tools on top.
            </p>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {blocks.length === 0 ? (
            <div
              className="flex min-h-[640px] items-center justify-center p-10"
              onDragOver={(event) => onCanvasDropZoneDragOver(event, 0)}
              onDrop={(event) => onCanvasDropZoneDrop(event, 0)}
              data-testid="canvas-empty-drop-zone"
            >
              <div className="max-w-md rounded-2xl border border-dashed border-border/80 bg-background/90 p-8 text-center shadow-sm">
                <Layers className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-base font-semibold">Your page canvas is empty</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a block or insert a saved section from the left panel to begin building
                  visually.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              <CanvasDropZone
                index={0}
                active={canvasDropIndex === 0}
                onDragOver={onCanvasDropZoneDragOver}
                onDrop={onCanvasDropZoneDrop}
              />
              {blocks.map((block, index) => {
                const isFullWidth = FULL_WIDTH_BLOCK_TYPES.has(block.type);
                const sectionStyleConfig = getSectionStyleConfig(block.props);
                const hasCustomSectionStyle =
                  block.type !== "hero" && hasSectionStyleConfig(sectionStyleConfig);
                const visualIndex = isFullWidth ? nonFullWidthIndex : nonFullWidthIndex++;
                const isAlternate = visualIndex % 2 === 1 && !hasCustomSectionStyle;

                const framedBlock = (
                  <CanvasBlockFrame
                    block={block}
                    index={index}
                    isSelected={selectedId === block.id}
                    onSelect={onSelect}
                    onToggleActive={onToggleActive}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                    onMove={onMove}
                    onAddBelow={onAddBelow}
                    registerBlockRef={registerBlockRef}
                    onCanvasDragStart={onCanvasDragStart}
                    onCanvasDragEnd={onCanvasDragEnd}
                    draggedBlockId={draggedBlockId}
                    hasActiveDragPayload={hasActiveDragPayload}
                    dropTarget={dropTarget}
                    onBlockDragOver={onBlockDragOver}
                    onBlockDrop={onBlockDrop}
                    onBlockDragEnd={onBlockDragEnd}
                  />
                );

                if (hasCustomSectionStyle) {
                  return (
                    <div key={block.id}>
                      <SectionStyleWrapper
                        props={block.props}
                        className="rounded-none"
                        contentClassName={
                          isFullWidth ? undefined : getSectionPaddingClasses(block.props)
                        }
                      >
                        {isFullWidth ? (
                          framedBlock
                        ) : (
                          <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
                            {framedBlock}
                          </div>
                        )}
                      </SectionStyleWrapper>
                      <CanvasDropZone
                        index={index + 1}
                        active={canvasDropIndex === index + 1}
                        onDragOver={onCanvasDropZoneDragOver}
                        onDrop={onCanvasDropZoneDrop}
                      />
                    </div>
                  );
                }

                if (isFullWidth) {
                  return (
                    <div key={block.id}>
                      {framedBlock}
                      <CanvasDropZone
                        index={index + 1}
                        active={canvasDropIndex === index + 1}
                        onDragOver={onCanvasDropZoneDragOver}
                        onDrop={onCanvasDropZoneDrop}
                      />
                    </div>
                  );
                }

                return (
                  <div key={block.id}>
                    <section className={cn("relative", isAlternate && "bg-muted/30")}>
                      <div
                        className={cn(
                          "relative mx-auto max-w-7xl px-4 sm:px-6",
                          getSectionPaddingClasses(block.props),
                        )}
                      >
                        {framedBlock}
                      </div>
                    </section>
                    <CanvasDropZone
                      index={index + 1}
                      active={canvasDropIndex === index + 1}
                      onDragOver={onCanvasDropZoneDragOver}
                      onDrop={onCanvasDropZoneDrop}
                    />
                  </div>
                );
              })}
              <div aria-hidden className="h-28 sm:h-40 xl:h-56 2xl:h-72" />
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
