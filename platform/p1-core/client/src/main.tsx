import { createRoot } from "react-dom/client";
import { CMS_BUILDER_PREVIEW_PATH } from "@shared/cms-builder/preview";
import "./index.css";

const VITE_PRELOAD_RECOVERY_KEY = "vite-preload-recovery";

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();

    const hasRetried = window.sessionStorage.getItem(VITE_PRELOAD_RECOVERY_KEY) === "1";
    if (hasRetried) {
      window.sessionStorage.removeItem(VITE_PRELOAD_RECOVERY_KEY);
      return;
    }

    window.sessionStorage.setItem(VITE_PRELOAD_RECOVERY_KEY, "1");
    window.location.reload();
  });

  window.sessionStorage.removeItem(VITE_PRELOAD_RECOVERY_KEY);

  document.getElementById("seo-prerender")?.remove();
}

const root = document.getElementById("root")!;
if (window.location.pathname === CMS_BUILDER_PREVIEW_PATH) {
  void import("./features/preview/builder-preview-entry").then(({ mountBuilderPreview }) =>
    mountBuilderPreview(root),
  );
} else {
  void import("./App").then(({ default: App }) => createRoot(root).render(<App />));
}
