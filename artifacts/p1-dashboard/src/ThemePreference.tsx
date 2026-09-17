import { useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";
export const THEME_STORAGE_KEY = "p1-business-center-theme";
export function normalizeTheme(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}
function storedTheme(): ThemePreference {
  try { return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY)); }
  catch { return "system"; }
}
function applyTheme(preference: ThemePreference, systemDark: boolean) {
  const resolved = preference === "system" ? (systemDark ? "dark" : "light") : preference;
  document.documentElement.dataset.theme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#0b1120" : "#f8fafc");
}

/** A device preference independent of website branding and business permissions. */
export function ThemeControl() {
  const [preference, setPreference] = useState<ThemePreference>(storedTheme);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyTheme(preference, media.matches);
    update();
    media.addEventListener("change", update);
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) setPreference(storedTheme());
    };
    window.addEventListener("storage", sync);
    return () => { media.removeEventListener("change", update); window.removeEventListener("storage", sync); };
  }, [preference]);
  return <label className="theme-control"><span>Appearance</span><select aria-label="Appearance" value={preference} onChange={event => {
    const next = normalizeTheme(event.target.value);
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* Session preference works when storage is unavailable. */ }
    setPreference(next);
  }}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>;
}
