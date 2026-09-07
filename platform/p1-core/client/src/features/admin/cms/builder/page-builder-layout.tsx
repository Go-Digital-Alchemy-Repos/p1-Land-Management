import type { ReactNode, Ref } from "react";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ChevronLeft, ChevronRight, ListOrdered, Plus } from "lucide-react";
import { VisualCanvas, type VisualCanvasProps } from "./page-builder-canvas";
import { DesktopInspectorPanel } from "./page-builder-inspector";

interface BuilderLeftRailProps {
  leftRailMode: "structure" | "inserter";
  onLeftRailModeChange: (mode: "structure" | "inserter") => void;
  structurePanel: ReactNode;
  inserterPanel: ReactNode;
}

export function BuilderLeftRail({
  leftRailMode,
  onLeftRailModeChange,
  structurePanel,
  inserterPanel,
}: BuilderLeftRailProps) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-2xl border border-border/70 bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={leftRailMode === "structure" ? "secondary" : "ghost"}
            size="sm"
            className="min-w-0 px-2 text-xs sm:text-sm"
            onClick={() => onLeftRailModeChange("structure")}
            data-testid="button-left-rail-structure"
          >
            <ListOrdered className="mr-1.5 h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Structure</span>
          </Button>
          <Button
            type="button"
            variant={leftRailMode === "inserter" ? "secondary" : "ghost"}
            size="sm"
            className="min-w-0 px-2 text-xs sm:text-sm"
            onClick={() => onLeftRailModeChange("inserter")}
            data-testid="button-left-rail-inserter"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Add Content</span>
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {leftRailMode === "structure" ? structurePanel : inserterPanel}
      </div>
    </div>
  );
}

function RailToggleButton({
  side,
  collapsed,
  onClick,
  label,
}: {
  side: "left" | "right";
  collapsed: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className="absolute top-6 z-20 flex h-7 w-7 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-all hover:text-foreground hover:shadow-md"
      style={side === "left" ? { left: -14 } : { right: -14 }}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      data-testid={
        side === "left" ? "button-toggle-structure-panel" : "button-toggle-inspector-panel"
      }
    >
      {side === "left" ? (
        collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )
      ) : collapsed ? (
        <ChevronLeft className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
    </button>
  );
}

function CanvasShell({
  canvasPanelRef,
  canvasProps,
  leftToggle,
  rightToggle,
}: {
  canvasPanelRef: Ref<HTMLDivElement>;
  canvasProps: VisualCanvasProps;
  leftToggle?: ReactNode;
  rightToggle?: ReactNode;
}) {
  return (
    <div className="h-full min-h-0 p-3">
      <div
        ref={canvasPanelRef}
        className="relative h-full overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm"
      >
        {leftToggle}
        {rightToggle}
        <VisualCanvas {...canvasProps} />
      </div>
    </div>
  );
}

interface DesktopBuilderLayoutProps {
  structurePanelOpen: boolean;
  advancedInspectorOpen: boolean;
  leftRailPanel: ReactNode;
  inspectorPanel: ReactNode;
  canvasPanelRef: Ref<HTMLDivElement>;
  inspectorShellRef: Ref<HTMLDivElement>;
  desktopInspectorOffset: number;
  onSetStructurePanelOpen: (open: boolean) => void;
  onSetAdvancedInspectorOpen: (open: boolean) => void;
  canvasProps: VisualCanvasProps;
}

export function DesktopBuilderLayout({
  structurePanelOpen,
  advancedInspectorOpen,
  leftRailPanel,
  inspectorPanel,
  canvasPanelRef,
  inspectorShellRef,
  desktopInspectorOffset,
  onSetStructurePanelOpen,
  onSetAdvancedInspectorOpen,
  canvasProps,
}: DesktopBuilderLayoutProps) {
  return (
    <div className="hidden xl:sticky xl:top-6 xl:block">
      {structurePanelOpen && advancedInspectorOpen ? (
        <ResizablePanelGroup
          key="desktop-layout-both-open"
          direction="horizontal"
          className="h-[calc(100vh-170px)] min-h-[700px] overflow-hidden rounded-2xl border border-border/60 bg-muted/10"
        >
          <ResizablePanel defaultSize={18} minSize={14}>
            <div className="h-full min-h-0 p-3">{leftRailPanel}</div>
          </ResizablePanel>
          <ResizableHandle>
            <RailToggleButton
              side="left"
              collapsed={false}
              onClick={() => onSetStructurePanelOpen(false)}
              label="Collapse structure panel"
            />
          </ResizableHandle>
          <ResizablePanel defaultSize={60} minSize={32}>
            <CanvasShell canvasPanelRef={canvasPanelRef} canvasProps={canvasProps} />
          </ResizablePanel>
          <ResizableHandle>
            <RailToggleButton
              side="right"
              collapsed={false}
              onClick={() => onSetAdvancedInspectorOpen(false)}
              label="Collapse inspector panel"
            />
          </ResizableHandle>
          <ResizablePanel defaultSize={22} minSize={18}>
            <DesktopInspectorPanel shellRef={inspectorShellRef} offset={desktopInspectorOffset}>
              {inspectorPanel}
            </DesktopInspectorPanel>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : structurePanelOpen ? (
        <ResizablePanelGroup
          key="desktop-layout-structure-open"
          direction="horizontal"
          className="h-[calc(100vh-170px)] min-h-[700px] overflow-hidden rounded-2xl border border-border/60 bg-muted/10"
        >
          <ResizablePanel defaultSize={18} minSize={14}>
            <div className="h-full min-h-0 p-3">{leftRailPanel}</div>
          </ResizablePanel>
          <ResizableHandle>
            <RailToggleButton
              side="left"
              collapsed={false}
              onClick={() => onSetStructurePanelOpen(false)}
              label="Collapse structure panel"
            />
          </ResizableHandle>
          <ResizablePanel defaultSize={82} minSize={48}>
            <CanvasShell
              canvasPanelRef={canvasPanelRef}
              canvasProps={canvasProps}
              rightToggle={
                <RailToggleButton
                  side="right"
                  collapsed
                  onClick={() => onSetAdvancedInspectorOpen(true)}
                  label="Show inspector panel"
                />
              }
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : advancedInspectorOpen ? (
        <ResizablePanelGroup
          key="desktop-layout-inspector-open"
          direction="horizontal"
          className="h-[calc(100vh-170px)] min-h-[700px] overflow-hidden rounded-2xl border border-border/60 bg-muted/10"
        >
          <ResizablePanel defaultSize={78} minSize={45}>
            <CanvasShell
              canvasPanelRef={canvasPanelRef}
              canvasProps={canvasProps}
              leftToggle={
                <RailToggleButton
                  side="left"
                  collapsed
                  onClick={() => onSetStructurePanelOpen(true)}
                  label="Show structure panel"
                />
              }
            />
          </ResizablePanel>
          <ResizableHandle>
            <RailToggleButton
              side="right"
              collapsed={false}
              onClick={() => onSetAdvancedInspectorOpen(false)}
              label="Collapse inspector panel"
            />
          </ResizableHandle>
          <ResizablePanel defaultSize={22} minSize={18}>
            <DesktopInspectorPanel shellRef={inspectorShellRef} offset={desktopInspectorOffset}>
              {inspectorPanel}
            </DesktopInspectorPanel>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div
          key="desktop-layout-canvas-only"
          className="h-[calc(100vh-170px)] min-h-[700px] overflow-hidden rounded-2xl border border-border/60 bg-muted/10 p-3"
        >
          <div
            ref={canvasPanelRef}
            className="relative h-full overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm"
          >
            <RailToggleButton
              side="left"
              collapsed
              onClick={() => onSetStructurePanelOpen(true)}
              label="Show structure panel"
            />
            <RailToggleButton
              side="right"
              collapsed
              onClick={() => onSetAdvancedInspectorOpen(true)}
              label="Show inspector panel"
            />
            <VisualCanvas {...canvasProps} />
          </div>
        </div>
      )}
    </div>
  );
}

interface MobileBuilderLayoutProps {
  structurePanelOpen: boolean;
  advancedInspectorOpen: boolean;
  leftRailPanel: ReactNode;
  inspectorPanel: ReactNode;
  canvasProps: VisualCanvasProps;
}

export function MobileBuilderLayout({
  structurePanelOpen,
  advancedInspectorOpen,
  leftRailPanel,
  inspectorPanel,
  canvasProps,
}: MobileBuilderLayoutProps) {
  return (
    <div className="space-y-4 xl:hidden">
      {structurePanelOpen ? (
        leftRailPanel
      ) : (
        <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
          The left sidebar is hidden. Tap "Show Structure" to bring back the builder rail.
        </div>
      )}
      <div className="rounded-2xl border border-border/70 bg-background shadow-sm">
        <VisualCanvas {...canvasProps} />
      </div>
      {advancedInspectorOpen ? (
        inspectorPanel
      ) : (
        <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
          The docked inspector is hidden. Use the section toolbar to select content, then tap "Show
          Inspector" for the full editing form.
        </div>
      )}
    </div>
  );
}
