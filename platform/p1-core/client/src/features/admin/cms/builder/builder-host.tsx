import React, {
  createContext,
  useContext,
  forwardRef,
  type ComponentType,
  type ReactNode,
} from "react";
import type { BlockDef, BlockInstance } from "./block-registry";
import type { CmsSection } from "../../../../../../shared/schema/cms-sections";
export type BuilderPrimitive = ComponentType<any>;
export interface BuilderHost {
  ui: Record<string, BuilderPrimitive>;
  blocks: BlockDef[];
  getBlockDef: (type: string) => BlockDef | undefined;
  createBlock: (type: string) => BlockInstance;
  canUseSections: boolean;
  useCatalog: (needs?: {
    forms?: boolean;
    pages?: boolean;
    galleries?: boolean;
    team?: boolean;
  }) => {
    forms: any[];
    pages: any[];
    galleries: any[];
    team: any[];
    teamLoading?: boolean;
    teamError?: boolean;
  };
  useSections: () => { sections: CmsSection[]; isLoading: boolean; error?: string };
  saveSection: (input: {
    name: string;
    description: string;
    category: string;
    blocks: BlockInstance[];
  }) => Promise<unknown>;
  notice: (message: string, error?: boolean) => void;
  components: Record<string, BuilderPrimitive>;
}
const Context = createContext<BuilderHost | null>(null);
export const BuilderHostProvider = Context.Provider;
export function useBuilderHost() {
  const host = useContext(Context);
  if (!host) throw new Error("PageBuilder requires a host adapter");
  return host;
}
function component<P extends object = Record<string, any>>(
  name: string,
  collection: "ui" | "components" = "ui",
) {
  return forwardRef<any, P>((props, ref) => {
    const host = useBuilderHost();
    const View = host[collection][name];
    if (!View) throw new Error(`Missing builder host component: ${name}`);
    return <View {...props} ref={ref} />;
  });
}
export const Button = component<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }
>("Button");
export const Input = component<
  React.InputHTMLAttributes<HTMLInputElement> & { autoPrependHttps?: boolean }
>("Input");
export const Textarea = component<React.TextareaHTMLAttributes<HTMLTextAreaElement>>("Textarea");
export const Label = component<React.LabelHTMLAttributes<HTMLLabelElement>>("Label");
export const Badge = component<React.HTMLAttributes<HTMLDivElement> & { variant?: string }>(
  "Badge",
);
export const ScrollArea = component<React.HTMLAttributes<HTMLDivElement>>("ScrollArea");
export const Separator = component("Separator");
export const Switch = component<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    checked?: boolean;
    onCheckedChange?: (value: boolean) => void;
  }
>("Switch");
export const Select = component<{
  children: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}>("Select");
export const SelectContent = component("SelectContent"),
  SelectItem = component("SelectItem"),
  SelectTrigger = component("SelectTrigger"),
  SelectValue = component("SelectValue");
export const Tabs = component<{
  children: ReactNode;
  className?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}>("Tabs");
export const TabsList = component("TabsList"),
  TabsTrigger = component("TabsTrigger"),
  TabsContent = component("TabsContent");
export const Dialog = component<{
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}>("Dialog");
export const DialogContent = component("DialogContent"),
  DialogHeader = component("DialogHeader"),
  DialogTitle = component("DialogTitle"),
  DialogFooter = component("DialogFooter");
export const ResizablePanelGroup = component("ResizablePanelGroup"),
  ResizablePanel = component("ResizablePanel"),
  ResizableHandle = component("ResizableHandle");
export const CmsImageUpload = component<{
  value?: string;
  onChange: (value: string) => void;
  [key: string]: unknown;
}>("CmsImageUpload", "components");
export const CmsRichTextEditor = component<{
  value: string;
  onChange: (value: string) => void;
  [key: string]: unknown;
}>("CmsRichTextEditor", "components");
export const ImagePositionPicker = component("ImagePositionPicker", "components");
export const AdminBlockRenderer = component("AdminBlockRenderer", "components");
export const FrontendPreviewDialog = component("FrontendPreviewDialog", "components");
export const ErrorBoundary = component<{
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}>("ErrorBoundary", "components");
export { cn } from "../../../../lib/utils";
