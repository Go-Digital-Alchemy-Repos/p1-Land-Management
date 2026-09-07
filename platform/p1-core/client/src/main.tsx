import { createRoot } from "react-dom/client";
import App from "./App";
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

createRoot(document.getElementById("root")!).render(<App />);
