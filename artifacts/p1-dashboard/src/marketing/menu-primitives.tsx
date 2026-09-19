import React from "react";
import { formPrimitives } from "./forms-primitives";
import type { MenuPrimitives } from "../../../../platform/p1-core/client/src/components/shared/menu-item-presentation";
export const menuPrimitives: MenuPrimitives = {
  Input: formPrimitives.Input,
  Button: formPrimitives.Button,
  DropdownMenu: ({ children }) => (
    <details className="menu-item-dropdown">{children}</details>
  ),
  DropdownMenuTrigger: ({ children }) => (
    <summary
      aria-label={children.props["aria-label"]}
      className="menu-item-summary"
    >
      {children.props.children}
    </summary>
  ),
  DropdownMenuContent: ({ children }) => (
    <div
      className="menu-item-action-list"
      role="group"
      aria-label="Menu item actions"
    >
      {children}
    </div>
  ),
  DropdownMenuItem: ({ children, onClick, disabled, className }) => (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        const details = event.currentTarget.closest("details");
        if (details) details.open = false;
      }}
    >
      {children}
    </button>
  ),
  confirmDelete: (label) =>
    window.confirm(`Remove ${label} and its nested links?`),
  requireFields: true,
  formNotice:
    "Form popups are retained for compatibility but are not supported on the P1 public website.",
};
