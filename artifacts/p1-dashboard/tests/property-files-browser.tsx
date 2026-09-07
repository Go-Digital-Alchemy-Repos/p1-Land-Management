import { createRoot } from "react-dom/client";
import { PropertyFiles } from "../src/PropertyFiles";
import "../src/style.css";
const files = [
  {
    id: "synthetic-photo",
    name: "Synthetic before photo",
    mime: "image/jpeg",
    classification: "before",
    published: false,
    created_at: "2026-09-07T12:00:00Z",
  },
];
async function request(path: string, body?: unknown) {
  if (body !== undefined)
    throw new Error("Review the associated work before publishing");
  return files;
}
createRoot(document.getElementById("root")!).render(
  <PropertyFiles
    propertyId="synthetic-property"
    canPublish={true}
    request={request}
  />,
);
