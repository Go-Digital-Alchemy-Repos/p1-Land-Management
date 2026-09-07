import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Bookmark, ListOrdered, Monitor, Plus, Settings2, Sparkles } from "lucide-react";
import {
  ALL_BLOCKS,
  createBlock,
  getBlockDef,
  type BlockInstance,
  type BuilderContent,
} from "./block-registry";
import { createFallbackBlockDef } from "./block-editor";
import { FrontendPreviewDialog, type PreviewDevice } from "./page-builder-preview";
import type { VisualCanvasProps } from "./page-builder-canvas";
import { BlockInspectorPanel } from "./page-builder-inspector";
import { BuilderLeftRail, DesktopBuilderLayout, MobileBuilderLayout } from "./page-builder-layout";
import { InserterPanel, StructurePanel } from "./page-builder-panels";
import {
  BLOCK_CATEGORY_LABELS,
  duplicateBlockInstance,
  getBlockSummary,
  groupBlocksByCategory,
  SaveSectionDialog,
} from "./page-builder-support";

interface PageBuilderProps {
  content: BuilderContent;
  onChange: (content: BuilderContent) => void;
}

type LeftRailMode = "structure" | "inserter";
type InsertPayload =
  | { kind: "block"; type: string }
  | { kind: "section"; sectionId: string; blocks: BlockInstance[] };
export function PageBuilder({ content, onChange }: PageBuilderProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingSectionBlockId, setSavingSectionBlockId] = useState<string | null>(null);
  const [navigatorSearch, setNavigatorSearch] = useState("");
  const [addContentSearch, setAddContentSearch] = useState("");
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [draggedInsertPayload, setDraggedInsertPayload] = useState<InsertPayload | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: "before" | "after" } | null>(
    null,
  );
  const [canvasDropIndex, setCanvasDropIndex] = useState<number | null>(null);
  const [leftRailMode, setLeftRailMode] = useState<LeftRailMode>("structure");
  const [structurePanelOpen, setStructurePanelOpen] = useState(true);
  const [advancedInspectorOpen, setAdvancedInspectorOpen] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [frontendPreviewOpen, setFrontendPreviewOpen] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
  const blockRefs = useRef(new Map<string, HTMLDivElement | null>());
  const desktopCanvasPanelRef = useRef<HTMLDivElement | null>(null);
  const desktopInspectorShellRef = useRef<HTMLDivElement | null>(null);
  const [desktopInspectorOffset, setDesktopInspectorOffset] = useState(0);

  const blocks = content.blocks ?? [];
  const selectedBlock = blocks.find((block) => block.id === selectedId) ?? null;
  const selectedDef = selectedBlock ? getBlockDef(selectedBlock.type) : null;
  const selectedEditorDef = selectedBlock
    ? (selectedDef ?? createFallbackBlockDef(selectedBlock.type, selectedBlock.props))
    : null;
  const selectedBlockIndex = selectedBlock
    ? blocks.findIndex((block) => block.id === selectedBlock.id)
    : -1;

  const selectBlock = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) {
      setAdvancedInspectorOpen(true);
    }
  }, []);

  const registerBlockRef = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) {
      blockRefs.current.set(id, node);
    } else {
      blockRefs.current.delete(id);
    }
  }, []);

  const scrollBlockIntoView = useCallback((id: string) => {
    const node = blockRefs.current.get(id);
    if (!node) return;

    const viewport = node.closest("[data-radix-scroll-area-viewport]") as HTMLElement | null;
    if (viewport) {
      const viewportRect = viewport.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      const highZoneThreshold = viewportRect.top + viewport.clientHeight * 0.14;
      const lowZoneThreshold = viewportRect.top + viewport.clientHeight * 0.68;
      const bottomSafetyThreshold =
        viewportRect.bottom - Math.min(180, viewport.clientHeight * 0.18);
      const desiredTop = viewportRect.top + Math.min(240, viewport.clientHeight * 0.34);

      if (
        nodeRect.top < highZoneThreshold ||
        nodeRect.top > lowZoneThreshold ||
        nodeRect.bottom > bottomSafetyThreshold
      ) {
        const nextScrollTop = viewport.scrollTop + (nodeRect.top - desiredTop);
        viewport.scrollTo({
          top: Math.max(0, nextScrollTop),
          behavior: "smooth",
        });
        return;
      }
    }

    node.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, []);

  const setBlocks = useCallback(
    (nextBlocks: BlockInstance[]) => {
      onChange({ ...content, blocks: nextBlocks });
    },
    [content, onChange],
  );

  const visibleBlocks = useMemo(() => {
    const term = navigatorSearch.trim().toLowerCase();
    if (!term) return blocks;
    return blocks.filter((block) => {
      const def = getBlockDef(block.type);
      const summary = getBlockSummary(block).toLowerCase();
      return (
        block.type.toLowerCase().includes(term) ||
        def?.label.toLowerCase().includes(term) ||
        summary.includes(term)
      );
    });
  }, [blocks, navigatorSearch]);

  const filteredAddContentGroups = useMemo(() => {
    const term = addContentSearch.trim().toLowerCase();
    const grouped = groupBlocksByCategory(ALL_BLOCKS);
    if (!term) return grouped;

    return grouped
      .map(({ category, label, items }) => ({
        category,
        label,
        items: items.filter((definition) => {
          const haystack = [
            definition.label,
            definition.description,
            definition.type,
            BLOCK_CATEGORY_LABELS[definition.category],
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(term);
        }),
      }))
      .filter(({ items }) => items.length > 0);
  }, [addContentSearch]);

  const desktopCanvasFrameClassName = useMemo(() => {
    if (!structurePanelOpen && !advancedInspectorOpen) return "max-w-[1280px]";
    if (structurePanelOpen && advancedInspectorOpen) return "max-w-[980px] 2xl:max-w-[1080px]";
    return "max-w-[1120px] 2xl:max-w-[1200px]";
  }, [advancedInspectorOpen, structurePanelOpen]);

  useEffect(() => {
    if (!selectedId) return;
    scrollBlockIntoView(selectedId);
  }, [scrollBlockIntoView, selectedId]);

  const updateDesktopInspectorAlignment = useCallback(() => {
    if (!advancedInspectorOpen || !selectedId) {
      setDesktopInspectorOffset(0);
      return;
    }

    const selectedNode = blockRefs.current.get(selectedId);
    const canvasViewport = desktopCanvasPanelRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement | null;
    const inspectorShell = desktopInspectorShellRef.current;

    if (!selectedNode || !canvasViewport || !inspectorShell) {
      setDesktopInspectorOffset(0);
      return;
    }

    const viewportRect = canvasViewport.getBoundingClientRect();
    const blockRect = selectedNode.getBoundingClientRect();
    const shellHeight = inspectorShell.clientHeight;

    if (shellHeight <= 0) {
      setDesktopInspectorOffset(0);
      return;
    }

    const blockAnchorRelative = blockRect.top - viewportRect.top + blockRect.height * 0.42;
    const desiredTopAnchor = Math.max(150, Math.min(250, shellHeight * 0.3));
    const minInspectorHeight = Math.min(560, Math.max(440, shellHeight * 0.62));
    const maxOffset = Math.max(0, shellHeight - minInspectorHeight);
    const nextOffset = Math.max(0, Math.min(maxOffset, blockAnchorRelative - desiredTopAnchor));

    setDesktopInspectorOffset((current) =>
      Math.abs(current - nextOffset) > 2 ? nextOffset : current,
    );
  }, [advancedInspectorOpen, selectedId]);

  useEffect(() => {
    updateDesktopInspectorAlignment();
  }, [updateDesktopInspectorAlignment, selectedId, blocks]);

  useEffect(() => {
    if (!advancedInspectorOpen || !selectedId) return;

    const canvasViewport = desktopCanvasPanelRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement | null;

    if (!canvasViewport) return;

    let frame = 0;
    const queueAlignment = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateDesktopInspectorAlignment);
    };

    canvasViewport.addEventListener("scroll", queueAlignment, { passive: true });
    window.addEventListener("resize", queueAlignment);

    queueAlignment();

    return () => {
      cancelAnimationFrame(frame);
      canvasViewport.removeEventListener("scroll", queueAlignment);
      window.removeEventListener("resize", queueAlignment);
    };
  }, [advancedInspectorOpen, selectedId, updateDesktopInspectorAlignment]);

  const resolveInsertIndex = useCallback(() => {
    if (insertAtIndex !== null) return insertAtIndex;
    if (selectedId) {
      const selectedIndex = blocks.findIndex((block) => block.id === selectedId);
      if (selectedIndex >= 0) return selectedIndex + 1;
    }
    return blocks.length;
  }, [blocks, insertAtIndex, selectedId]);

  const addBlockAtIndex = useCallback(
    (type: string, index: number) => {
      const block = createBlock(type);
      const nextBlocks = [...blocks];
      nextBlocks.splice(index, 0, block);
      setBlocks(nextBlocks);
      selectBlock(block.id);
      setInsertAtIndex(null);
      setLeftRailMode("structure");
      setStructurePanelOpen(true);
    },
    [blocks, selectBlock, setBlocks],
  );

  const addBlock = useCallback(
    (type: string) => {
      addBlockAtIndex(type, resolveInsertIndex());
    },
    [addBlockAtIndex, resolveInsertIndex],
  );

  const insertBlocksAtIndex = useCallback(
    (insertedBlocks: BlockInstance[], index: number) => {
      const nextBlocks = [...blocks];
      nextBlocks.splice(index, 0, ...insertedBlocks);
      setBlocks(nextBlocks);
      selectBlock(insertedBlocks[0]?.id ?? null);
      setInsertAtIndex(null);
      setLeftRailMode("structure");
      setStructurePanelOpen(true);
    },
    [blocks, selectBlock, setBlocks],
  );

  const insertBlocks = useCallback(
    (insertedBlocks: BlockInstance[]) => {
      insertBlocksAtIndex(insertedBlocks, resolveInsertIndex());
    },
    [insertBlocksAtIndex, resolveInsertIndex],
  );

  const openAddBelow = useCallback(
    (id: string) => {
      const sourceIndex = blocks.findIndex((block) => block.id === id);
      const nextIndex = sourceIndex < 0 ? blocks.length : sourceIndex + 1;
      setInsertAtIndex(nextIndex);
      setLeftRailMode("inserter");
      setStructurePanelOpen(true);
    },
    [blocks],
  );

  const updateBlockProps = useCallback(
    (id: string, props: Record<string, unknown>) => {
      setBlocks(blocks.map((block) => (block.id === id ? { ...block, props } : block)));
    },
    [blocks, setBlocks],
  );

  const toggleBlockActive = useCallback(
    (id: string) => {
      setBlocks(
        blocks.map((block) =>
          block.id === id
            ? {
                ...block,
                props: {
                  ...block.props,
                  isActive: block.props.isActive === false,
                },
              }
            : block,
        ),
      );
    },
    [blocks, setBlocks],
  );

  const removeBlock = useCallback(
    (id: string) => {
      if (selectedId === id) {
        const currentIndex = blocks.findIndex((block) => block.id === id);
        const fallbackSelection =
          blocks[currentIndex + 1]?.id ?? blocks[currentIndex - 1]?.id ?? null;
        selectBlock(fallbackSelection);
      }
      setBlocks(blocks.filter((block) => block.id !== id));
    },
    [blocks, selectBlock, selectedId, setBlocks],
  );

  const duplicateBlock = useCallback(
    (id: string) => {
      const sourceIndex = blocks.findIndex((block) => block.id === id);
      if (sourceIndex < 0) return;
      const copy = duplicateBlockInstance(blocks[sourceIndex]);
      const nextBlocks = [...blocks];
      nextBlocks.splice(sourceIndex + 1, 0, copy);
      setBlocks(nextBlocks);
      selectBlock(copy.id);
    },
    [blocks, selectBlock, setBlocks],
  );

  const moveBlock = useCallback(
    (id: string, direction: "up" | "down") => {
      const currentIndex = blocks.findIndex((block) => block.id === id);
      if (currentIndex < 0) return;

      const nextBlocks = [...blocks];
      if (direction === "up" && currentIndex > 0) {
        [nextBlocks[currentIndex - 1], nextBlocks[currentIndex]] = [
          nextBlocks[currentIndex],
          nextBlocks[currentIndex - 1],
        ];
      } else if (direction === "down" && currentIndex < nextBlocks.length - 1) {
        [nextBlocks[currentIndex], nextBlocks[currentIndex + 1]] = [
          nextBlocks[currentIndex + 1],
          nextBlocks[currentIndex],
        ];
      } else {
        return;
      }

      setBlocks(nextBlocks);
    },
    [blocks, setBlocks],
  );

  const reorderBlocks = useCallback(
    (sourceId: string, targetId: string, position: "before" | "after") => {
      if (sourceId === targetId) return;

      const sourceIndex = blocks.findIndex((block) => block.id === sourceId);
      const targetIndex = blocks.findIndex((block) => block.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return;

      const nextBlocks = [...blocks];
      const [movedBlock] = nextBlocks.splice(sourceIndex, 1);
      const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
      const insertIndex = position === "before" ? adjustedTargetIndex : adjustedTargetIndex + 1;

      nextBlocks.splice(insertIndex, 0, movedBlock);
      setBlocks(nextBlocks);
    },
    [blocks, setBlocks],
  );

  const moveBlockToIndex = useCallback(
    (sourceId: string, targetIndex: number) => {
      const sourceIndex = blocks.findIndex((block) => block.id === sourceId);
      if (sourceIndex < 0) return;

      const nextBlocks = [...blocks];
      const [movedBlock] = nextBlocks.splice(sourceIndex, 1);
      const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
      nextBlocks.splice(
        Math.max(0, Math.min(nextBlocks.length, adjustedTargetIndex)),
        0,
        movedBlock,
      );
      setBlocks(nextBlocks);
    },
    [blocks, setBlocks],
  );

  const clearDragState = useCallback(() => {
    setDraggedBlockId(null);
    setDraggedInsertPayload(null);
    setDropTarget(null);
    setCanvasDropIndex(null);
  }, []);

  const handleDragStart = useCallback((event: DragEvent, blockId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", blockId);
    setDraggedBlockId(blockId);
    setDraggedInsertPayload(null);
    setDropTarget(null);
  }, []);

  const handleInserterDragStart = useCallback((event: DragEvent, payload: InsertPayload) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-page-builder-insert", JSON.stringify(payload));
    setDraggedBlockId(null);
    setDraggedInsertPayload(payload);
    setDropTarget(null);
  }, []);

  const parseInsertPayload = useCallback((event: DragEvent) => {
    const rawInsertPayload = event.dataTransfer.getData("application/x-page-builder-insert");
    if (!rawInsertPayload) return null;
    try {
      return JSON.parse(rawInsertPayload) as InsertPayload;
    } catch {
      return null;
    }
  }, []);

  const handleDragOver = useCallback(
    (event: DragEvent, targetId: string) => {
      const hasExternalInsertPayload = Array.from(event.dataTransfer.types).includes(
        "application/x-page-builder-insert",
      );
      if (!draggedBlockId && !draggedInsertPayload && !hasExternalInsertPayload) return;
      if (draggedBlockId && draggedBlockId === targetId) return;

      event.preventDefault();
      event.dataTransfer.dropEffect =
        draggedInsertPayload || hasExternalInsertPayload ? "copy" : "move";

      const bounds = event.currentTarget.getBoundingClientRect();
      const offsetY = event.clientY - bounds.top;
      const position = offsetY < bounds.height / 2 ? "before" : "after";

      setDropTarget((current) =>
        current?.id === targetId && current.position === position
          ? current
          : { id: targetId, position },
      );
    },
    [draggedBlockId, draggedInsertPayload],
  );

  const handleDrop = useCallback(
    (event: DragEvent, targetId: string) => {
      event.preventDefault();

      const sourceId = draggedBlockId ?? event.dataTransfer.getData("text/plain");
      const rawInsertPayload = event.dataTransfer.getData("application/x-page-builder-insert");
      let fallbackInsertPayload: InsertPayload | null = null;
      if (rawInsertPayload) {
        try {
          fallbackInsertPayload = JSON.parse(rawInsertPayload) as InsertPayload;
        } catch {
          fallbackInsertPayload = null;
        }
      }
      const insertPayload = draggedInsertPayload ?? fallbackInsertPayload;
      const position = dropTarget?.id === targetId ? dropTarget.position : "after";
      const targetIndex = blocks.findIndex((block) => block.id === targetId);
      const insertIndex = position === "before" ? targetIndex : targetIndex + 1;

      if (insertPayload && targetIndex >= 0) {
        if (insertPayload.kind === "block") {
          addBlockAtIndex(insertPayload.type, insertIndex);
        } else {
          insertBlocksAtIndex(insertPayload.blocks, insertIndex);
        }
      } else if (sourceId && sourceId !== targetId) {
        reorderBlocks(sourceId, targetId, position);
      }

      clearDragState();
    },
    [
      addBlockAtIndex,
      blocks,
      clearDragState,
      draggedBlockId,
      draggedInsertPayload,
      dropTarget,
      insertBlocksAtIndex,
      reorderBlocks,
    ],
  );

  const handleCanvasDropZoneDragOver = useCallback(
    (event: DragEvent, index: number) => {
      const hasExternalInsertPayload = Array.from(event.dataTransfer.types).includes(
        "application/x-page-builder-insert",
      );
      const hasPayload =
        Boolean(draggedBlockId || draggedInsertPayload) || hasExternalInsertPayload;
      if (!hasPayload) return;

      event.preventDefault();
      event.dataTransfer.dropEffect =
        draggedInsertPayload || hasExternalInsertPayload ? "copy" : "move";
      setDropTarget(null);
      setCanvasDropIndex((current) => (current === index ? current : index));
    },
    [draggedBlockId, draggedInsertPayload],
  );

  const handleCanvasDropZoneDrop = useCallback(
    (event: DragEvent, index: number) => {
      event.preventDefault();

      const insertPayload = draggedInsertPayload ?? parseInsertPayload(event);
      const sourceId = draggedBlockId ?? event.dataTransfer.getData("text/plain");

      if (insertPayload) {
        if (insertPayload.kind === "block") {
          addBlockAtIndex(insertPayload.type, index);
        } else {
          insertBlocksAtIndex(insertPayload.blocks, index);
        }
      } else if (sourceId) {
        moveBlockToIndex(sourceId, index);
      }

      clearDragState();
    },
    [
      addBlockAtIndex,
      clearDragState,
      draggedBlockId,
      draggedInsertPayload,
      insertBlocksAtIndex,
      moveBlockToIndex,
      parseInsertPayload,
    ],
  );

  const savingBlock = savingSectionBlockId
    ? (blocks.find((block) => block.id === savingSectionBlockId) ?? null)
    : null;

  const structurePanel = (
    <StructurePanel
      blocks={blocks}
      visibleBlocks={visibleBlocks}
      navigatorSearch={navigatorSearch}
      onNavigatorSearchChange={setNavigatorSearch}
      selectedId={selectedId}
      draggedBlockId={draggedBlockId}
      dropTarget={dropTarget}
      onSelectBlock={selectBlock}
      onOpenInserter={() => {
        setInsertAtIndex(selectedId ? resolveInsertIndex() : null);
        setLeftRailMode("inserter");
      }}
      onMoveBlock={moveBlock}
      onDuplicateBlock={duplicateBlock}
      onDeleteBlock={removeBlock}
      onDragStart={handleDragStart}
      onDragEnd={clearDragState}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    />
  );

  const inserterPanel = (
    <InserterPanel
      insertAtIndex={insertAtIndex}
      selectedId={selectedId}
      addContentSearch={addContentSearch}
      onAddContentSearchChange={setAddContentSearch}
      filteredAddContentGroups={filteredAddContentGroups}
      onAddBlock={addBlock}
      onInsertBlocks={insertBlocks}
      onDragStart={handleInserterDragStart}
      onDragEnd={clearDragState}
    />
  );

  const leftRailPanel = (
    <BuilderLeftRail
      leftRailMode={leftRailMode}
      onLeftRailModeChange={setLeftRailMode}
      structurePanel={structurePanel}
      inserterPanel={inserterPanel}
    />
  );

  const inspectorPanel = (
    <BlockInspectorPanel
      selectedBlock={selectedBlock}
      selectedEditorDef={selectedEditorDef}
      selectedBlockIndex={selectedBlockIndex}
      onLocateBlock={() => selectedBlock && scrollBlockIntoView(selectedBlock.id)}
      onSaveSection={() => selectedBlock && setSavingSectionBlockId(selectedBlock.id)}
      onClose={() => setAdvancedInspectorOpen(false)}
      onUpdateBlockProps={(props) => selectedBlock && updateBlockProps(selectedBlock.id, props)}
    />
  );

  const canvasProps: VisualCanvasProps = {
    blocks,
    selectedId,
    onSelect: selectBlock,
    onToggleActive: toggleBlockActive,
    onDuplicate: duplicateBlock,
    onDelete: removeBlock,
    onMove: moveBlock,
    onAddBelow: openAddBelow,
    registerBlockRef,
    onCanvasDragStart: handleDragStart,
    onCanvasDragEnd: clearDragState,
    draggedBlockId,
    hasActiveDragPayload: !!draggedBlockId || !!draggedInsertPayload,
    dropTarget,
    onBlockDragOver: handleDragOver,
    onBlockDrop: handleDrop,
    onBlockDragEnd: clearDragState,
    canvasDropIndex,
    onCanvasDropZoneDragOver: handleCanvasDropZoneDragOver,
    onCanvasDropZoneDrop: handleCanvasDropZoneDrop,
    desktopFrameClassName: desktopCanvasFrameClassName,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <p className="text-sm font-semibold">Visual Builder</p>
            <Badge variant="outline">
              {blocks.length} block{blocks.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Structure on the left, real page canvas in the center, a compact section toolbar
            on-canvas, and a docked inspector for full editing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Monitor className="h-3 w-3" />
            Canvas-first editing
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="xl:hidden"
            onClick={() => setStructurePanelOpen((current) => !current)}
          >
            <ListOrdered className="mr-1.5 h-4 w-4" />
            {structurePanelOpen ? "Hide Structure" : "Show Structure"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="xl:hidden"
            onClick={() => setAdvancedInspectorOpen((current) => !current)}
            disabled={!selectedBlock}
          >
            <Settings2 className="mr-1.5 h-4 w-4" />
            {advancedInspectorOpen ? "Hide Inspector" : "Show Inspector"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFrontendPreviewOpen(true)}
            data-testid="button-open-frontend-preview"
          >
            <Monitor className="mr-1.5 h-4 w-4" />
            Frontend Preview
          </Button>
          <Button
            data-testid="button-add-block-toolbar"
            onClick={() => {
              setInsertAtIndex(selectedId ? resolveInsertIndex() : null);
              setLeftRailMode("inserter");
              setStructurePanelOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Content
          </Button>
        </div>
      </div>

      <MobileBuilderLayout
        structurePanelOpen={structurePanelOpen}
        advancedInspectorOpen={advancedInspectorOpen}
        leftRailPanel={leftRailPanel}
        inspectorPanel={inspectorPanel}
        canvasProps={canvasProps}
      />

      <DesktopBuilderLayout
        structurePanelOpen={structurePanelOpen}
        advancedInspectorOpen={advancedInspectorOpen}
        leftRailPanel={leftRailPanel}
        inspectorPanel={inspectorPanel}
        canvasPanelRef={desktopCanvasPanelRef}
        inspectorShellRef={desktopInspectorShellRef}
        desktopInspectorOffset={desktopInspectorOffset}
        onSetStructurePanelOpen={setStructurePanelOpen}
        onSetAdvancedInspectorOpen={setAdvancedInspectorOpen}
        canvasProps={canvasProps}
      />

      <Dialog
        open={!!savingSectionBlockId}
        onOpenChange={(open) => {
          if (!open) setSavingSectionBlockId(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-amber-500" />
              Save as Reusable Section
            </DialogTitle>
          </DialogHeader>
          {savingBlock && (
            <SaveSectionDialog block={savingBlock} onClose={() => setSavingSectionBlockId(null)} />
          )}
        </DialogContent>
      </Dialog>

      <FrontendPreviewDialog
        open={frontendPreviewOpen}
        onOpenChange={setFrontendPreviewOpen}
        blocks={blocks}
        previewDevice={previewDevice}
        onPreviewDeviceChange={setPreviewDevice}
      />
    </div>
  );
}
