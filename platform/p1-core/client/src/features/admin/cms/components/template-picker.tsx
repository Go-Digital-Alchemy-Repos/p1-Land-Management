import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, BookOpen, TrendingUp, Newspaper, Wand2, Check } from "lucide-react";
import { PAGE_TEMPLATES } from "../builder/page-templates";
import type { BuilderContent } from "../builder/block-registry";

const ICON_MAP: Record<string, React.ElementType> = {
  FileText,
  Sparkles,
  BookOpen,
  TrendingUp,
  Newspaper,
};

const CATEGORY_COLORS: Record<string, string> = {
  starter: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  marketing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  content: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (content: BuilderContent, templateName: string) => void;
  onOpenWizard: () => void;
}

export function TemplatePicker({ open, onClose, onSelect, onOpenWizard }: TemplatePickerProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleConfirm = () => {
    const tmpl = PAGE_TEMPLATES.find((t) => t.id === selected);
    if (!tmpl) return;
    const blocks = tmpl.blocks();
    onSelect({ blocks }, tmpl.name);
  };

  const selectedTemplate = PAGE_TEMPLATES.find((t) => t.id === selected);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl" data-testid="dialog-template-picker">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Pick a starting point for your new page, or use the landing page wizard for guided
            creation.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2">
          {PAGE_TEMPLATES.map((tmpl) => {
            const Icon = ICON_MAP[tmpl.icon] ?? FileText;
            const isSelected = selected === tmpl.id;
            const blockCount = tmpl.blockCount;
            return (
              <button
                key={tmpl.id}
                onClick={() => setSelected(tmpl.id)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 text-center transition-all ${
                  isSelected
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30 ring-1 ring-violet-500"
                    : "border-border hover:border-violet-300 hover:bg-muted/40"
                }`}
                data-testid={`template-card-${tmpl.id}`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-violet-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    isSelected ? "bg-violet-100 dark:bg-violet-900/50" : "bg-muted"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${isSelected ? "text-violet-600" : "text-muted-foreground"}`}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium leading-tight">{tmpl.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {tmpl.description}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 mt-auto">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[tmpl.category] ?? ""}`}
                  >
                    {tmpl.category}
                  </Badge>
                  {blockCount > 0 && (
                    <span className="text-[10px] text-muted-foreground">{blockCount} blocks</span>
                  )}
                </div>
              </button>
            );
          })}

          <button
            onClick={() => {
              onClose();
              onOpenWizard();
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-violet-300 dark:border-violet-700 text-center transition-all hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:border-violet-400"
            data-testid="button-open-wizard"
          >
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/50 dark:to-purple-900/50 flex items-center justify-center">
              <Wand2 className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-medium leading-tight">Landing Page Wizard</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Guided 4-step builder for landing pages
              </p>
            </div>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
            >
              guided
            </Badge>
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-template">
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selected} data-testid="button-use-template">
            {selectedTemplate?.id === "blank"
              ? "Start with Blank Page"
              : `Use ${selectedTemplate?.name ?? "Template"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
