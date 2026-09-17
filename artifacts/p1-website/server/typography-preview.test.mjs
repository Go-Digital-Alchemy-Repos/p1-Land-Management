import test from "node:test";
import assert from "node:assert/strict";
import { typographyPreview } from "./typography-preview.mjs";
test("stateless specimen uses website defaults and selected families without script or form content", () => {
  const defaults = typographyPreview(new URLSearchParams());
  assert(defaults.includes("--app-font-sans:'Manrope',sans-serif"));
  assert(defaults.includes("--app-font-display:'Fraunces',serif"));
  const draft = typographyPreview(
    new URLSearchParams({
      body: "Open Sans",
      bodyType: "sans-serif",
      heading: "Lora",
      headingType: "serif",
    }),
  );
  assert(draft.includes("family=Open%20Sans"));
  assert(draft.includes("--app-font-display:'Lora',serif"));
  assert(draft.includes("Draft font specimen"));
  assert(!/<script|<form|<iframe|<img/.test(draft));
  assert(draft.includes("noindex,nofollow"));
});
test("preview rejects arbitrary markup, font sources, repeated fields and incomplete selections", () => {
  for (const query of [
    "body=Inter",
    "bodyType=serif",
    "body=Inter&bodyType=serif&body=Roboto",
    "parent=https://evil.test",
    "body=%3Cscript%3E&bodyType=serif",
    "body=Inter&bodyType=url(evil)",
    "heading=" + "x".repeat(61) + "&headingType=serif",
    "body=Inter&bodyType=serif&text=private",
  ])
    assert.throws(() => typographyPreview(new URLSearchParams(query)), query);
});
