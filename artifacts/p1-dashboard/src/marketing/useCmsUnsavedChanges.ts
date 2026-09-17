import { useEffect } from "react";
export function useCmsUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const savedPath = location.pathname + location.search;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: Event) => {
      if (!window.confirm("Discard your unsaved website changes?")) {
        event.preventDefault();
        history.replaceState(null, "", savedPath);
      }
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener("p1:before-navigation", navigate);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("p1:before-navigation", navigate);
    };
  }, [dirty]);
}
