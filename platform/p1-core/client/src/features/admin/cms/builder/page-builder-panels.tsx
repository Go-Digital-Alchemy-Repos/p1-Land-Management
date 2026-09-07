import type { DragEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, Copy, GripVertical, ListOrdered, Plus, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBlockDef, isDynamicBlock, type BlockDef, type BlockInstance } from "./block-registry";
import { BlockIcon, getBlockSummary, SectionsLibrary } from "./page-builder-support";
import { FULL_WIDTH_BLOCK_TYPES } from "./page-builder-constants";

interface StructurePanelProps {
  blocks: BlockInstance[];
  visibleBlocks: BlockInstance[];
  navigatorSearch: string;
  onNavigatorSearchChange: (value: string) => void;
  selectedId: string | null;
  draggedBlockId: string | null;
  dropTarget: { id: string; position: "before" | "after" } | null;
  onSelectBlock: (id: string) => void;
  onOpenInserter: () => void;
  onMoveBlock: (id: string, direction: "up" | "down") => void;
  onDuplicateBlock: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onDragStart: (event: DragEvent, blockId: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent, targetId: string) => void;
  onDrop: (event: DragEvent, targetId: string) => void;
}

export function StructurePanel({
  blocks,
  visibleBlocks,
  navigatorSearch,
  onNavigatorSearchChange,
  selectedId,
  draggedBlockId,
  dropTarget,
  onSelectBlock,
  onOpenInserter,
  onMoveBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: StructurePanelProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-background shadow-sm">
      <div className="space-y-3 border-b border-border/70 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-violet-500" />
              <p className="text-sm font-semibold">Structure</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Reorder, duplicate, and select blocks. The canvas stays in sync.
            </p>
          </div>
          <Badge variant="outline">{blocks.length}</Badge>
        </div>

        <Button
          size="sm"
          className="w-full"
          data-testid="button-add-block"
          onClick={onOpenInserter}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Content
        </Button>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={navigatorSearch}
            onChange={(event) => onNavigatorSearchChange(event.target.value)}
            placeholder="Filter blocks..."
            className="h-9 pl-8 text-sm"
            data-testid="input-builder-filter"
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3">
          {visibleBlocks.length === 0 ? (
            <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
              {blocks.length === 0
                ? "No blocks yet. Add content to start building."
                : "No blocks match that filter."}
            </div>
          ) : (
            visibleBlocks.map((block, visibleIndex) => {
              const definition = getBlockDef(block.type);
              const blockIndex = blocks.findIndex((candidate) => candidate.id === block.id);
              const isSelected = block.id === selectedId;
              const isDynamic = isDynamicBlock(block.type);
              const summary = getBlockSummary(block);
              const showDropBefore =
                dropTarget?.id === block.id && dropTarget.position === "before";
              const showDropAfter = dropTarget?.id === block.id && dropTarget.position === "after";

              return (
                <div
                  key={block.id}
                  className={cn(
                    "rounded-xl border transition-all",
                    isSelected
                      ? "border-violet-400 bg-violet-50/80 shadow-sm dark:bg-violet-950/20"
                      : "border-border/70 bg-background",
                    draggedBlockId === block.id && "opacity-60",
                    showDropBefore && "ring-2 ring-inset ring-violet-400 ring-offset-1",
                    showDropAfter && "shadow-[inset_0_-2px_0_0_rgb(167_139_250)]",
                  )}
                  onDragOver={(event) => onDragOver(event, block.id)}
                  onDrop={(event) => onDrop(event, block.id)}
                  data-testid={`builder-structure-item-${block.id}`}
                >
                  <div className="flex items-start gap-2 px-3 py-2.5">
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => onDragStart(event, block.id)}
                      onDragEnd={onDragEnd}
                      className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground"
                      title="Drag to reorder"
                      data-testid={`drag-handle-${block.id}`}
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectBlock(block.id)}
                      className="min-w-0 flex-1 text-left"
                      data-testid={`select-structure-block-${block.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-900/30">
                          {definition && (
                            <BlockIcon
                              name={definition.iconName}
                              className="h-3 w-3 text-violet-600"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium leading-tight">
                            {definition?.label ?? block.type}
                          </p>
                          <p className="truncate text-[11px] leading-tight text-muted-foreground">
                            Block {blockIndex + 1}
                            {summary ? ` • ${summary}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <Badge variant="secondary" className="px-1 py-0 text-[9px] capitalize">
                          {definition?.category ?? "content"}
                        </Badge>
                        {isDynamic && (
                          <Badge variant="outline" className="px-1 py-0 text-[9px]">
                            Dynamic
                          </Badge>
                        )}
                        {block.props.isActive === false && (
                          <Badge variant="outline" className="px-1 py-0 text-[9px]">
                            Inactive
                          </Badge>
                        )}
                        {FULL_WIDTH_BLOCK_TYPES.has(block.type) && (
                          <Badge variant="outline" className="px-1 py-0 text-[9px]">
                            Full Width
                          </Badge>
                        )}
                        {visibleIndex > 0 && (
                          <span className="text-[9px] text-muted-foreground">
                            {visibleIndex + 1} in filtered view
                          </span>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center gap-0.5 self-start">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={blockIndex === 0}
                        onClick={() => onMoveBlock(block.id, "up")}
                        data-testid={`button-move-up-${block.id}`}
                      >
                        <ChevronDown className="h-3 w-3 rotate-180" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={blockIndex === blocks.length - 1}
                        onClick={() => onMoveBlock(block.id, "down")}
                        data-testid={`button-move-down-${block.id}`}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onDuplicateBlock(block.id)}
                        data-testid={`button-duplicate-block-${block.id}`}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => onDeleteBlock(block.id)}
                        data-testid={`button-delete-block-${block.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface BlockGroup {
  category: BlockDef["category"];
  label: string;
  items: BlockDef[];
}

interface InserterPanelProps {
  insertAtIndex: number | null;
  selectedId: string | null;
  addContentSearch: string;
  onAddContentSearchChange: (value: string) => void;
  filteredAddContentGroups: BlockGroup[];
  onAddBlock: (type: string) => void;
  onInsertBlocks: (blocks: BlockInstance[]) => void;
  onDragStart: (
    event: DragEvent,
    payload:
      | { kind: "block"; type: string }
      | { kind: "section"; sectionId: string; blocks: BlockInstance[] },
  ) => void;
  onDragEnd: () => void;
}

export function InserterPanel({
  insertAtIndex,
  selectedId,
  addContentSearch,
  onAddContentSearchChange,
  filteredAddContentGroups,
  onAddBlock,
  onInsertBlocks,
  onDragStart,
  onDragEnd,
}: InserterPanelProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-background shadow-sm">
      <div className="space-y-3 border-b border-border/70 px-4 py-4">
        <div className="space-y-2">
          <div>
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-violet-500" />
              <p className="text-sm font-semibold">Add Content</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Browse blocks and saved sections here, then click to insert quickly or drag into the
              exact position you want.
            </p>
          </div>
          {insertAtIndex !== null ? (
            <Badge variant="secondary" className="w-fit">
              Insert at {insertAtIndex + 1}
            </Badge>
          ) : selectedId ? (
            <Badge variant="outline" className="w-fit">
              After selected block
            </Badge>
          ) : (
            <Badge variant="outline" className="w-fit">
              Add to end
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Drag blocks or saved sections onto the canvas to place them precisely, or click once to
          insert at the current target.
        </p>
      </div>

      <Tabs defaultValue="blocks" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-border/70 px-4 py-3">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1">
            <TabsTrigger value="blocks" className="h-auto px-2 py-2 text-xs leading-tight">
              Block Types
            </TabsTrigger>
            <TabsTrigger
              value="sections"
              className="h-auto px-2 py-2 text-xs leading-tight"
              data-testid="tab-saved-sections"
            >
              Saved Sections
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="blocks" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col px-4 pb-4 pt-3">
            <div className="relative pb-3">
              <Search className="absolute left-2.5 top-[calc(50%-6px)] h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={addContentSearch}
                onChange={(event) => onAddContentSearchChange(event.target.value)}
                placeholder="Search block types..."
                className="h-9 pl-8 text-sm"
                data-testid="input-add-content-search"
              />
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-5 pr-1">
                {filteredAddContentGroups.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
                    No block types match that search.
                  </div>
                ) : (
                  filteredAddContentGroups.map(({ category, label, items }) => (
                    <div key={category}>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {label}
                      </h3>
                      <div className="space-y-2">
                        {items.map((definition) => (
                          <button
                            key={definition.type}
                            type="button"
                            draggable
                            onDragStart={(event) =>
                              onDragStart(event, {
                                kind: "block",
                                type: definition.type,
                              })
                            }
                            onDragEnd={onDragEnd}
                            onClick={() => onAddBlock(definition.type)}
                            className="group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                            data-testid={`block-type-${definition.type}`}
                          >
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-violet-100 transition-colors group-hover:bg-violet-200 dark:bg-violet-900/30 dark:group-hover:bg-violet-900/50">
                              <BlockIcon
                                name={definition.iconName}
                                className="h-4 w-4 text-violet-600"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-tight">
                                {definition.label}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                {definition.description}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent
          value="sections"
          className="mt-0 min-h-0 flex-1 overflow-hidden px-4 pb-4 pt-3"
        >
          <ScrollArea className="h-full">
            <SectionsLibrary
              onInsert={onInsertBlocks}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
