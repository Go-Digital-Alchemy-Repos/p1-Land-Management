import type { ComponentType, HTMLAttributes, ReactNode } from "react";
import type { FormsPrimitives } from "./forms-workspace";
export type PageTemplatePrimitives = Pick<
  FormsPrimitives,
  "Button" | "Badge" | "Input" | "Textarea" | "Label"
> & {
  Dialog: ComponentType<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
  }>;
  DialogContent: ComponentType<Omit<HTMLAttributes<HTMLDivElement>, "style">>;
  DialogHeader: ComponentType<Omit<HTMLAttributes<HTMLDivElement>, "style">>;
  DialogTitle: ComponentType<Omit<HTMLAttributes<HTMLHeadingElement>, "style">>;
  DialogFooter: ComponentType<Omit<HTMLAttributes<HTMLDivElement>, "style">>;
  Separator: ComponentType<{ className?: string }>;
};
