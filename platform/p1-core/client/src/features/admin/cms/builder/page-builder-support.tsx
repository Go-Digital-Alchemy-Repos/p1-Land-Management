import { useState, type DragEvent, type ElementType } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Blocks,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  FlaskConical,
  GalleryHorizontal,
  Globe,
  Grid2X2,
  Grid3X3,
  Heading,
  HelpCircle,
  Image,
  Layers,
  LayoutGrid,
  LayoutTemplate,
  List,
  ListChecks,
  ListOrdered,
  Lock,
  Map as MapIcon,
  Megaphone,
  Minus,
  MousePointerClick,
  Newspaper,
  Phone,
  Play,
  Quote,
  Rss,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus2,
  Users,
  Workflow,
} from "lucide-react";
import type { CmsSection } from "@shared/schema";
import type { BlockCategory, BlockDef, BlockInstance } from "./block-registry";
import { getBlockDef } from "./block-registry";

const ICON_MAP: Record<string, ElementType> = {
  Sparkles,
  FileText,
  LayoutTemplate,
  Megaphone,
  LayoutGrid,
  HelpCircle,
  Quote,
  UserCheck,
  CalendarDays,
  BookOpen,
  MousePointerClick,
  Image,
  Play,
  Minus,
  Heading,
  Globe,
  Phone,
  Map: MapIcon,
  Mail: Globe,
  UserPlus: UserPlus2,
  Lock,
  List,
  ShieldCheck,
  ArrowRight,
  Shield,
  Newspaper,
  TrendingUp,
  Grid3X3,
  GalleryHorizontal,
  BarChart3,
  Grid2X2,
  ListChecks,
  FlaskConical,
  ClipboardCheck,
  BadgeCheck,
  Workflow,
  ListOrdered,
  Rss,
  Users,
};

const SECTION_CATEGORIES = [
  "general",
  "hero",
  "cta",
  "testimonials",
  "faq",
  "features",
  "content",
  "team",
];
const SYSTEM_SECTION_NAME_PREFIX = "Starter - ";

export const BLOCK_CATEGORY_LABELS: Record<BlockCategory, string> = {
  hero: "Hero",
  layout: "Layout",
  content: "Content",
  media: "Media",
  "social-proof": "Social Proof",
  conversion: "Conversion",
  data: "Data / Live",
  dynamic: "Dynamic / Interactive",
};

const BLOCK_CATEGORY_ORDER: BlockCategory[] = [
  "hero",
  "layout",
  "content",
  "media",
  "social-proof",
  "conversion",
  "data",
  "dynamic",
];

export function groupBlocksByCategory(
  blocks: BlockDef[],
): { category: BlockCategory; label: string; items: BlockDef[] }[] {
  const grouped = new Map<BlockCategory, BlockDef[]>();
  for (const block of blocks) {
    const category = block.category;
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category)!.push(block);
  }

  return BLOCK_CATEGORY_ORDER.filter((category) => grouped.has(category)).map((category) => ({
    category,
    label: BLOCK_CATEGORY_LABELS[category],
    items: grouped.get(category)!,
  }));
}

export function BlockIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Layers;
  return <Icon className={className} />;
}

function cloneProps<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export function duplicateBlockInstance(block: BlockInstance): BlockInstance {
  return {
    id: crypto.randomUUID(),
    type: block.type,
    props: cloneProps(block.props),
  };
}

export function getBlockSummary(block: BlockInstance) {
  const candidates = [
    block.props.title,
    block.props.heading,
    block.props.sectionEyebrow,
    block.props.badge,
    block.props.ctaText,
  ];
  const summary = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim().length > 0,
  );
  return typeof summary === "string" ? summary : "";
}

interface SaveSectionDialogProps {
  block: BlockInstance;
  onClose: () => void;
}

export function SaveSectionDialog({ block, onClose }: SaveSectionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/cms/sections", {
        name,
        description,
        category,
        blocks: [block],
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/sections"] });
      toast({ title: "Saved as reusable section" });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save section",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label>Section Name</Label>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Homepage Hero"
          data-testid="input-save-section-name"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger data-testid="select-save-section-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SECTION_CATEGORIES.map((value) => (
              <SelectItem key={value} value={value} className="capitalize">
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>
          Description <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="When to use this section..."
          rows={2}
          data-testid="input-save-section-description"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!name.trim() || saveMutation.isPending}
          data-testid="button-confirm-save-section"
        >
          {saveMutation.isPending ? "Saving..." : "Save Section"}
        </Button>
      </DialogFooter>
    </div>
  );
}

type InsertPayload =
  | { kind: "block"; type: string }
  | { kind: "section"; sectionId: string; blocks: BlockInstance[] };

export function SectionsLibrary({
  onInsert,
  onDragStart,
  onDragEnd,
}: {
  onInsert: (blocks: BlockInstance[]) => void;
  onDragStart: (event: DragEvent, payload: InsertPayload) => void;
  onDragEnd: () => void;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: sections = [], isLoading } = useQuery<CmsSection[]>({
    queryKey: ["/api/admin/cms/sections"],
  });

  const filteredSections = sections.filter((section) => {
    const sectionBlocks = Array.isArray(section.blocks) ? (section.blocks as BlockInstance[]) : [];
    const containsDynamicStarterBlock =
      section.name.startsWith(SYSTEM_SECTION_NAME_PREFIX) &&
      sectionBlocks.some((block) => getBlockDef(block.type)?.isDynamic);

    if (containsDynamicStarterBlock) return false;

    const matchesSearch = !search || section.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || section.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const remapSectionBlocks = (section: CmsSection) => {
    const blocks = Array.isArray(section.blocks) ? (section.blocks as BlockInstance[]) : [];
    return blocks.map((block) => ({ ...block, id: crypto.randomUUID() }));
  };

  const insertSection = (section: CmsSection) => {
    onInsert(remapSectionBlocks(section));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search saved sections..."
            className="h-8 pl-8 text-sm"
            data-testid="input-library-search"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 w-32 text-xs" data-testid="select-library-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All
            </SelectItem>
            {SECTION_CATEGORIES.map((value) => (
              <SelectItem key={value} value={value} className="text-xs capitalize">
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : filteredSections.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
          <Blocks className="h-8 w-8 opacity-30" />
          <p className="text-sm font-medium">
            {search ? "No sections match" : "No saved sections yet"}
          </p>
          <p className="text-xs">
            {search
              ? "Try a different search"
              : "Save a block as a reusable section from the visual builder"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filteredSections.map((section) => {
            const blockCount = Array.isArray(section.blocks) ? section.blocks.length : 0;
            return (
              <button
                key={section.id}
                type="button"
                draggable
                onDragStart={(event) =>
                  onDragStart(event, {
                    kind: "section",
                    sectionId: section.id,
                    blocks: remapSectionBlocks(section),
                  })
                }
                onDragEnd={onDragEnd}
                onClick={() => insertSection(section)}
                className="group flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                data-testid={`insert-section-${section.id}`}
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-900/30">
                  <Layers className="h-3.5 w-3.5 text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight">{section.name}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Badge variant="secondary" className="px-1 py-0 text-[9px] capitalize">
                      {section.category ?? "general"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {blockCount} block{blockCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
