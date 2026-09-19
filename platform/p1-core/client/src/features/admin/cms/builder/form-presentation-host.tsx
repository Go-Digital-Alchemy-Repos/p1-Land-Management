import React, { createContext, useContext } from "react";
interface Host {
  ui: Record<string, React.ComponentType<any>>;
  toast: (message: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => void;
}
const Context = createContext<Host | null>(null);
export const FormPresentationHostProvider = Context.Provider;
export function useFormPresentationHost() {
  const host = useContext(Context);
  if (!host) throw new Error("Form requires its presentation host");
  return host;
}
const view =
  <P extends object = Record<string, any>>(name: string) =>
  (props: P) => {
    const View = useFormPresentationHost().ui[name];
    return <View {...props} />;
  };
export const Button = view<
    React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }
  >("Button"),
  Input = view<React.InputHTMLAttributes<HTMLInputElement> & { autoPrependHttps?: boolean }>(
    "Input",
  ),
  Textarea = view<React.TextareaHTMLAttributes<HTMLTextAreaElement>>("Textarea"),
  Label = view<React.LabelHTMLAttributes<HTMLLabelElement>>("Label");
export const Checkbox = view<{
  checked?: boolean;
  onCheckedChange?: (value: boolean | string) => void;
  [key: string]: unknown;
}>("Checkbox");
export const Select = view<{
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}>("Select");
export const SelectContent = view("SelectContent"),
  SelectTrigger = view("SelectTrigger"),
  SelectValue = view("SelectValue"),
  SelectItem = view("SelectItem");
