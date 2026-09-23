import { createRoot } from "react-dom/client";
import { PropertyPhotos } from "../src/PropertyPhotos";
import "../src/theme.css";
import "../src/style.css";

createRoot(document.getElementById("root")!).render(
  <main style={{ maxWidth: 1080, margin: "40px auto", padding: "0 16px" }}>
    <PropertyPhotos propertyId="synthetic-property" canUpload={new URLSearchParams(window.location.search).get("role") !== "crew"} />
  </main>,
);
