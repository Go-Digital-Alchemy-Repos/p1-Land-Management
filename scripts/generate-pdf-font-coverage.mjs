import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const apiRequire = createRequire(
  new URL("../artifacts/api-server/package.json", import.meta.url),
);
const fontkit = createRequire(apiRequire.resolve("pdfkit"))("fontkit");
const root = new URL("../artifacts/api-server/src/dashboard/", import.meta.url);
const regular = fontkit.openSync(
  fileURLToPath(new URL("pdf-assets/NotoSans-Regular.ttf", root)),
);
const bold = fontkit.openSync(
  fileURLToPath(new URL("pdf-assets/NotoSans-Bold.ttf", root)),
);
const both = new Set(bold.characterSet),
  ranges = [];
for (const code of regular.characterSet
  .filter((code) => both.has(code))
  .sort((a, b) => a - b)) {
  const last = ranges.at(-1);
  if (last && code === last[1] + 1) last[1] = code;
  else ranges.push([code, code]);
}
writeFileSync(
  new URL("pdf-font-coverage.ts", root),
  "// Generated from the vendored Noto Sans regular/bold Unicode cmap intersection.\nexport const pdfFontCoverage: readonly (readonly [number, number])[] = [\n" +
    ranges.map(([start, end]) => `  [${start}, ${end}],`).join("\n") +
    "\n];\n",
);
