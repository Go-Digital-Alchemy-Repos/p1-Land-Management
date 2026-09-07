import React from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { type ThemeMode, useThemeMode } from "@/components/shared/theme-mode-provider";

const OPTIONS: Array<{ mode: ThemeMode; label: string; icon: React.ElementType }> = [
  { mode: "system", label: "System", icon: Monitor },
  { mode: "light", label: "Light", icon: Sun },
  { mode: "dark", label: "Dark", icon: Moon },
];

export function ThemeModeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { mode, setMode } = useThemeMode();
  const active = OPTIONS.find((option) => option.mode === mode) ?? OPTIONS[0];
  const ActiveIcon = active.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "w-full text-muted-foreground",
            collapsed ? "justify-center" : "justify-start",
          )}
          aria-label="Theme mode"
          data-testid="button-theme-mode"
        >
          <ActiveIcon className={cn("h-4 w-4", collapsed ? "" : "mr-2")} />
          {!collapsed && <span>Theme: {active.label}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={collapsed ? "right" : "top"} align="start" className="w-40">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem
              key={option.mode}
              onSelect={() => setMode(option.mode)}
              data-testid={`option-theme-${option.mode}`}
            >
              <Icon className="h-4 w-4" />
              <span>{option.label}</span>
              {mode === option.mode && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
