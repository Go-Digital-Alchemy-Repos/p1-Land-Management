import React, { createContext, useContext } from "react";
const Context = createContext<Record<string, React.ComponentType<any>>>({});
export const ArchivePresentationHostProvider = Context.Provider;
const view =
  <P extends object = Record<string, any>>(name: string) =>
  (props: P) => {
    const View = useContext(Context)[name];
    return <View {...props} />;
  };
export const Link = view("Link"),
  Badge = view("Badge"),
  Button = view("Button"),
  Card = view("Card"),
  CardContent = view("CardContent"),
  CardHeader = view("CardHeader"),
  CardTitle = view("CardTitle"),
  Skeleton = view("Skeleton");
export const Input = view<React.InputHTMLAttributes<HTMLInputElement>>("Input");
export const Select = view<{
    children: React.ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }>("Select"),
  SelectContent = view("SelectContent"),
  SelectTrigger = view("SelectTrigger"),
  SelectItem = view("SelectItem"),
  SelectValue = view("SelectValue");
export const Tooltip = view("Tooltip"),
  TooltipTrigger = view("TooltipTrigger"),
  TooltipContent = view("TooltipContent"),
  TooltipProvider = view("TooltipProvider");

export const ArchiveNavigationProvider = createContext<(url: string) => void>(() => {});
export function useArchiveNavigate() {
  return useContext(ArchiveNavigationProvider);
}

export const CardFooter = view("CardFooter");
