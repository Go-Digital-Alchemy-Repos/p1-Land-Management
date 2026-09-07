// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { initializeFrontendPreviewDocument } from "./page-builder-preview";

describe("initializeFrontendPreviewDocument", () => {
  it("isolates public preview roots from the admin document root", () => {
    const sourceDocument = document.implementation.createHTMLDocument("admin");
    sourceDocument.documentElement.className = "admin-mode dark";
    sourceDocument.documentElement.lang = "en";
    const style = sourceDocument.createElement("style");
    style.textContent = ":root { --primary: 210 60% 20%; }";
    sourceDocument.head.appendChild(style);

    const previewDocument = document.implementation.createHTMLDocument("preview");
    const previewRoot = initializeFrontendPreviewDocument(previewDocument, sourceDocument);

    expect(previewRoot.getAttribute("data-frontend-preview-root")).toBe("true");
    expect(previewDocument.head.querySelectorAll("style")).toHaveLength(1);
    expect(previewDocument.documentElement.className).toBe("");
    expect(sourceDocument.documentElement.className).toBe("admin-mode dark");
  });
});
