import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeModeContextValue {
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = "core-platform-theme-mode";
const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function getSystemMode(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getStoredMode);
  const [systemMode, setSystemMode] = useState<"light" | "dark">(getSystemMode);
  const resolvedMode = mode === "system" ? systemMode : mode;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemMode = () => setSystemMode(media.matches ? "dark" : "light");
    updateSystemMode();
    media.addEventListener("change", updateSystemMode);
    return () => media.removeEventListener("change", updateSystemMode);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedMode === "dark");
  }, [resolvedMode]);

  const value = useMemo<ThemeModeContextValue>(
    () => ({
      mode,
      resolvedMode,
      setMode(nextMode) {
        window.localStorage.setItem(STORAGE_KEY, nextMode);
        setModeState(nextMode);
      },
    }),
    [mode, resolvedMode],
  );

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within ThemeModeProvider");
  }
  return context;
}
