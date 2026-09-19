import React, { type ReactNode } from "react";
import { formPrimitives } from "./forms-primitives";
import type { SidebarPrimitives } from "../../../../platform/p1-core/client/src/components/shared/sidebar-editor-presentation";
function options(children: ReactNode): ReactNode[] {
  return React.Children.toArray(children).flatMap<ReactNode>((child) => {
    if (!React.isValidElement<{ children?: ReactNode }>(child)) return [];
    if (child.type === formPrimitives.SelectItem) return [child];
    return options(child.props.children);
  });
}
export const sidebarPrimitives: SidebarPrimitives = {
  ...formPrimitives,
  Input: ({ autoPrependHttps, onFocus, onChange, ...props }) => {
    const Input = formPrimitives.Input;
    return (
      <Input
        {...props}
        onChange={onChange}
        onFocus={(event: React.FocusEvent<HTMLInputElement>) => {
          if (autoPrependHttps && event.currentTarget.value === "") {
            event.currentTarget.value = "https://";
            onChange?.(event);
          }
          onFocus?.(event);
        }}
      />
    );
  },
  Select: ({
    children,
    value,
    onValueChange,
    "aria-label": label,
    disabled,
  }) => (
    <select
      aria-label={label}
      disabled={disabled}
      className="sidebar-select flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      value={value}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {value === "" && (
        <option value="" disabled>
          {label === "Add widget" ? "Add widget..." : "Choose a form"}
        </option>
      )}
      {options(children)}
    </select>
  ),
  CardHeader: ({ className = "", ...props }) => (
    <div {...props} className={`sidebar-card-header p-6 pb-4 ${className}`} />
  ),
  CardContent: ({ className = "", ...props }) => (
    <div {...props} className={`sidebar-card-content p-6 pt-0 ${className}`} />
  ),
};
