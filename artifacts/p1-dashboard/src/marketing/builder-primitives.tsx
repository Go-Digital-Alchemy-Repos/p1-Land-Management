import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  forwardRef,
  type ReactNode,
} from "react";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "../../../../platform/p1-core/client/src/components/ui/resizable";
import { formPrimitives } from "./forms-primitives";
const TabsContext = createContext({
  value: "",
  id: "",
  change: (_: string) => {},
});
function Tabs({
  value,
  defaultValue = "",
  onValueChange,
  children,
  ...props
}: any) {
  const [local, setLocal] = useState(defaultValue);
  const id = useId();
  return (
    <TabsContext.Provider
      value={{
        value: value ?? local,
        id,
        change: (next) => {
          setLocal(next);
          onValueChange?.(next);
        },
      }}
    >
      <div {...props}>{children}</div>
    </TabsContext.Provider>
  );
}
function TabsTrigger({ value, children, ...props }: any) {
  const tab = useContext(TabsContext);
  return (
    <button
      {...props}
      type="button"
      role="tab"
      id={`${tab.id}-${value}-tab`}
      aria-controls={`${tab.id}-${value}-panel`}
      aria-selected={tab.value === value}
      tabIndex={tab.value === value ? 0 : -1}
      onClick={() => tab.change(value)}
      onKeyDown={(e) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
        const nodes = Array.from(
          e.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>(
            "[role=tab]",
          ),
        );
        const index = nodes.indexOf(e.currentTarget);
        const next =
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? nodes.length - 1
              : (index + (e.key === "ArrowRight" ? 1 : -1) + nodes.length) %
                nodes.length;
        e.preventDefault();
        nodes[next].click();
        nodes[next].focus();
      }}
    >
      {children}
    </button>
  );
}
function TabsContent({ value, ...props }: any) {
  const tab = useContext(TabsContext);
  return tab.value === value ? (
    <div
      {...props}
      role="tabpanel"
      id={`${tab.id}-${value}-panel`}
      aria-labelledby={`${tab.id}-${value}-tab`}
    />
  ) : null;
}
const DialogContext = createContext({ close: () => {} });
function Dialog({ open, onOpenChange, children }: any) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) ref.current?.showModal();
  }, [open]);
  return open ? (
    <DialogContext.Provider value={{ close: () => onOpenChange?.(false) }}>
      <dialog
        ref={ref}
        className="native-page-builder native-builder-dialog"
        onCancel={(e) => {
          e.preventDefault();
          onOpenChange?.(false);
        }}
      >
        {children}
      </dialog>
    </DialogContext.Provider>
  ) : null;
}
function DialogContent({ children, className = "", ...props }: any) {
  const { close } = useContext(DialogContext);
  return (
    <div {...props} className={className}>
      <button
        type="button"
        aria-label="Close dialog"
        className="native-builder-dialog-close"
        onClick={close}
      >
        ×
      </button>
      {children}
    </div>
  );
}
const container =
  (tag = "div", base = "") =>
  ({ className = "", ...props }: any) =>
    React.createElement(tag, { ...props, className: `${base} ${className}` });
const Input = forwardRef<HTMLInputElement, any>(
  ({ autoPrependHttps, ...props }, ref) => (
    <input
      {...props}
      ref={ref}
      className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${props.className ?? ""}`}
      onBlur={(e) => {
        if (
          autoPrependHttps &&
          e.target.value.trim() &&
          !/^[a-z][a-z0-9+.-]*:/i.test(e.target.value) &&
          !e.target.value.startsWith("/")
        ) {
          const setter = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value",
          )?.set;
          setter?.call(e.target, `https://${e.target.value.trim()}`);
          e.target.dispatchEvent(new Event("input", { bubbles: true }));
        }
        props.onBlur?.(e);
      }}
    />
  ),
);
function selectOptions(children: ReactNode): ReactNode[] {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement(child)) return [];
    const element = child as React.ReactElement<{
      value?: string;
      children?: ReactNode;
    }>;
    if (typeof element.props.value === "string")
      return [
        <option key={element.props.value} value={element.props.value}>
          {element.props.children}
        </option>,
      ];
    return selectOptions(element.props.children);
  });
}
function Select({
  value,
  defaultValue,
  onValueChange,
  children,
  disabled,
  ...props
}: any) {
  return (
    <select
      {...props}
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
      onChange={(event) => onValueChange?.(event.target.value)}
      className="h-9 w-full rounded-md border bg-background px-3 py-2 text-sm"
    >
      {selectOptions(children)}
    </select>
  );
}
export const builderPrimitives = {
  ...formPrimitives,
  Select,
  Input,
  Tabs,
  TabsTrigger,
  TabsContent,
  TabsList: container("div", "builder-tabs"),
  Dialog,
  DialogContent,
  DialogHeader: container("header"),
  DialogTitle: container("h2"),
  DialogFooter: container("footer", "flex justify-end gap-2"),
  Separator: container("hr", "border-t"),
  ScrollArea: forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => (
    <div
      {...props}
      ref={ref}
      style={{ ...props.style, overflow: "auto" }}
      data-radix-scroll-area-viewport
    >
      {children}
    </div>
  )),
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
};
export class BuilderErrorBoundary extends React.Component<
  {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, info: React.ErrorInfo) => void;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);
  }
  render() {
    return this.state.failed
      ? (this.props.fallback ?? (
          <p>Preview unavailable. Your block is preserved.</p>
        ))
      : this.props.children;
  }
}
