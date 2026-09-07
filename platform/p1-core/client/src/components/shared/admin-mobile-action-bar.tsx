import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminMobileActionBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "admin-mobile-action-bar border-t bg-background/95 px-3 pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur",
        className,
      )}
      role="toolbar"
      aria-label="Editor actions"
    >
      <div className="mx-auto flex max-w-lg items-center justify-end gap-2">{children}</div>
    </div>
  );
}
