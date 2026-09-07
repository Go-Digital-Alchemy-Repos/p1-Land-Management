import type { ReactNode, Ref } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bookmark, ChevronDown, LocateFixed, Settings2 } from "lucide-react";
import type { BlockDef, BlockInstance } from "./block-registry";
import { ResilientBlockEditor } from "./block-editor";
import { BlockIcon } from "./page-builder-support";

interface BlockInspectorPanelProps {
  selectedBlock: BlockInstance | null;
  selectedEditorDef: BlockDef | null;
  selectedBlockIndex: number;
  onLocateBlock: () => void;
  onSaveSection: () => void;
  onClose: () => void;
  onUpdateBlockProps: (props: Record<string, unknown>) => void;
}

export function BlockInspectorPanel({
  selectedBlock,
  selectedEditorDef,
  selectedBlockIndex,
  onLocateBlock,
  onSaveSection,
  onClose,
  onUpdateBlockProps,
}: BlockInspectorPanelProps) {
  if (!selectedBlock || !selectedEditorDef) {
    return (
      <div className="flex h-full min-h-0 flex-col rounded-2xl border border-dashed border-border/70 bg-background/70 p-4 sm:p-6 text-center shadow-sm">
        <div className="m-auto max-w-sm">
          <Settings2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/35" />
          <p className="text-base font-semibold">Select a block to inspect</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Click any section directly on the canvas or from the structure panel. The docked
            inspector will open with the full editing form for that block.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm"
      data-testid="block-editor-panel"
    >
      <div className="space-y-3 border-b border-border/70 px-4 py-4">
        <div className="space-y-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-violet-500" />
              <p className="text-sm font-semibold">Contextual Inspector</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Full editing for the selected section lives here, with grouped controls for content,
              media, layout, and section settings.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onLocateBlock}
              data-testid="button-locate-block-on-canvas"
            >
              <LocateFixed className="mr-1.5 h-4 w-4" />
              Locate
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onSaveSection}>
              <Bookmark className="mr-1.5 h-4 w-4" />
              Save Section
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
              data-testid="button-close-editor-panel"
            >
              <ChevronDown className="h-4 w-4 -rotate-90" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-900/30">
            <BlockIcon name={selectedEditorDef.iconName} className="h-4 w-4 text-violet-600" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{selectedEditorDef.label}</p>
            <p className="truncate text-xs text-muted-foreground">
              {selectedEditorDef.description}
            </p>
          </div>
          <Badge variant="outline" className="ml-auto shrink-0">
            Block {selectedBlockIndex + 1}
          </Badge>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4 pb-12">
          <ResilientBlockEditor
            blockDef={selectedEditorDef}
            blockType={selectedBlock.type}
            props={selectedBlock.props}
            onChange={onUpdateBlockProps}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

interface DesktopInspectorPanelProps {
  shellRef: Ref<HTMLDivElement>;
  offset: number;
  children: ReactNode;
}

export function DesktopInspectorPanel({ shellRef, offset, children }: DesktopInspectorPanelProps) {
  return (
    <div ref={shellRef} className="h-full min-h-0 overflow-hidden p-3">
      <div
        className="flex h-full min-h-0 flex-col transition-[padding-top] duration-200 ease-out"
        style={{ paddingTop: `${offset}px` }}
      >
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
