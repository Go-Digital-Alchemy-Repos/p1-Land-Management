import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, Lock, ShieldCheck, RefreshCw } from "lucide-react";

type EditorLockBannerProps = {
  variant: "active-owned" | "locked-by-other" | "lost-lock";
  title: string;
  description: string;
  isLoading?: boolean;
  onRefresh?: () => void;
};

const VARIANT_STYLES: Record<EditorLockBannerProps["variant"], string> = {
  "active-owned": "border-emerald-200 bg-emerald-50 text-emerald-900",
  "locked-by-other": "border-amber-200 bg-amber-50 text-amber-950",
  "lost-lock": "border-rose-200 bg-rose-50 text-rose-950",
};

const VARIANT_ICONS = {
  "active-owned": ShieldCheck,
  "locked-by-other": Lock,
  "lost-lock": AlertTriangle,
} as const;

export function EditorLockBanner({
  variant,
  title,
  description,
  isLoading = false,
  onRefresh,
}: EditorLockBannerProps) {
  const Icon = VARIANT_ICONS[variant];

  return (
    <div className={cn("rounded-xl border px-4 py-3", VARIANT_STYLES[variant])}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-white/70 p-2">
            <Icon className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-sm opacity-90">{description}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onRefresh ? (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
              Check Again
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
