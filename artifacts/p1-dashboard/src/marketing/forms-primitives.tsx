import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type HTMLAttributes,
} from "react";
import type { FormsPrimitives } from "../../../../platform/p1-core/client/src/components/shared/forms-workspace";
import { MediaLibrary } from "./MediaLibrary";
const MediaContext = createContext(false);
export function FormsMediaProvider({
  canUseMedia,
  children,
}: {
  canUseMedia: boolean;
  children: ReactNode;
}) {
  return (
    <MediaContext.Provider value={canUseMedia}>
      {children}
    </MediaContext.Provider>
  );
}
const div = (base: string) =>
  function Container({
    className = "",
    ...props
  }: Omit<HTMLAttributes<HTMLDivElement>, "style">) {
    return <div {...props} className={`${base} ${className}`} />;
  };
const TabsContext = createContext({
  value: "",
  onValueChange: (_: string) => {},
});
const Tabs: FormsPrimitives["Tabs"] = ({
  value,
  onValueChange,
  children,
  ...props
}) => (
  <TabsContext.Provider value={{ value, onValueChange }}>
    <div {...props}>{children}</div>
  </TabsContext.Provider>
);
const TabsTrigger: FormsPrimitives["TabsTrigger"] = ({
  value,
  children,
  ...props
}) => {
  const tabs = useContext(TabsContext);
  return (
    <button
      {...props}
      type="button"
      role="tab"
      id={`forms-tab-${value}`}
      aria-controls={`forms-panel-${value}`}
      tabIndex={tabs.value === value ? 0 : -1}
      aria-selected={tabs.value === value}
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
          return;
        const nodes = Array.from(
          event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
            '[role="tab"]',
          ) ?? [],
        );
        const index = nodes.indexOf(event.currentTarget);
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? nodes.length - 1
              : (index + (event.key === "ArrowRight" ? 1 : -1) + nodes.length) %
                nodes.length;
        event.preventDefault();
        nodes[next]?.focus();
        nodes[next]?.click();
      }}
      onClick={() => tabs.onValueChange(value)}
    >
      {children}
    </button>
  );
};
const TabsContent: FormsPrimitives["TabsContent"] = ({
  value,
  children,
  ...props
}) => {
  const tabs = useContext(TabsContext);
  return tabs.value === value ? (
    <div
      {...props}
      role="tabpanel"
      id={`forms-panel-${value}`}
      aria-labelledby={`forms-tab-${value}`}
    >
      {children}
    </div>
  ) : null;
};
// Keep the retained Select composition, using the browser's accessible selection control.
const SelectItem: FormsPrimitives["SelectItem"] = ({ value, children }) => (
  <option value={value}>{children}</option>
);
function options(children: ReactNode): ReactNode[] {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement<{ children?: ReactNode }>(child)) return [];
    if (child.type === SelectItem) return [child];
    return options(child.props.children);
  });
}
const Select: FormsPrimitives["Select"] = ({
  value,
  onValueChange,
  children,
  disabled,
  "aria-label": ariaLabel,
}) => (
  <select
    aria-label={ariaLabel}
    className="forms-select flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
    value={value}
    disabled={disabled}
    onChange={(e) => onValueChange?.(e.target.value)}
  >
    {options(children)}
  </select>
);
const CmsImageUpload: FormsPrimitives["CmsImageUpload"] = ({
  value,
  onChange,
  label,
}) => {
  const allowed = useContext(MediaContext),
    [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      {value && (
        <img
          src={value}
          alt={label}
          style={{ maxWidth: "100%", maxHeight: 140 }}
        />
      )}
      <input
        aria-label={`${label} URL`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {allowed && (
        <button type="button" onClick={() => setOpen((v) => !v)}>
          Choose or upload image
        </button>
      )}
      {value && (
        <button type="button" onClick={() => onChange("")}>
          Remove image
        </button>
      )}
      {open && (
        <section aria-label="Choose image">
          <button type="button" onClick={() => setOpen(false)}>
            Close Media picker
          </button>
          <MediaLibrary
            onSelect={(asset) => {
              onChange(asset.url);
              setOpen(false);
            }}
          />
        </section>
      )}
    </div>
  );
};
export const formPrimitives: FormsPrimitives = {
  Card: div(
    "forms-card rounded-xl border bg-card border-card-border text-card-foreground shadow-sm",
  ),
  CardHeader: div("flex flex-col space-y-1.5 p-6"),
  CardTitle: div("font-semibold leading-none tracking-tight"),
  CardDescription: div("text-sm text-muted-foreground"),
  CardContent: div("p-6 pt-0"),
  Button: ({
    variant = "default",
    size = "default",
    className = "",
    ...props
  }) => (
    <button
      type="button"
      {...props}
      className={`forms-button forms-button-${variant} forms-button-${size} inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium ${className}`}
    />
  ),
  Input: ({ className = "", ...props }) => (
    <input
      {...props}
      className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${className}`}
    />
  ),
  Textarea: ({ className = "", ...props }) => (
    <textarea
      {...props}
      className={`flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${className}`}
    />
  ),
  Label: ({ className = "", ...props }) => (
    <label
      {...props}
      className={`text-sm font-medium leading-none ${className}`}
    />
  ),
  Badge: ({ variant, className = "", ...props }) => (
    <div
      {...props}
      className={`forms-badge ${variant ?? ""} inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}
    />
  ),
  Switch: ({ checked, onCheckedChange, ...props }) => (
    <button
      {...props}
      type="button"
      role="switch"
      aria-checked={!!checked}
      className="forms-switch"
      onClick={() => onCheckedChange?.(!checked)}
    >
      <span />
    </button>
  ),
  Tabs,
  TabsList: ({ children, ...props }) => (
    <div
      {...props}
      className="forms-tabs inline-flex items-center gap-1 rounded-md bg-muted p-1"
      role="tablist"
    >
      {children}
    </div>
  ),
  TabsTrigger,
  TabsContent,
  Select,
  SelectItem,
  SelectContent: ({ children }) => <>{children}</>,
  SelectTrigger: () => null,
  SelectValue: () => null,
  CmsImageUpload,
  EditorLockBanner: ({ title, description, onRefresh }) => (
    <div role="status" className="forms-lock border rounded-xl p-4">
      <strong>{title}</strong>
      <p>{description}</p>
      <button type="button" onClick={onRefresh}>
        Check reservation
      </button>
    </div>
  ),
  EditorSaveIndicator: ({ state }) => (
    <span role="status" className="text-sm text-muted-foreground">
      {state === "unsaved"
        ? "Unsaved changes"
        : state === "saved"
          ? "Saved"
          : state === "saving"
            ? "Saving…"
            : state === "error"
              ? "Save failed"
              : ""}
    </span>
  ),
};
