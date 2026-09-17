import { cp } from "node:fs/promises";
import { build } from "esbuild";
await build({
  entryPoints: [
    "src/dashboard/main.ts",
    "src/dashboard/worker.ts",
    "src/dashboard/migrate.ts",
  ],
  outdir: "dist/dashboard",
  platform: "node",
  format: "esm",
  bundle: true,
  packages: "external",
  sourcemap: true,
});

await cp(
  new URL("./src/dashboard/pdf-assets", import.meta.url),
  new URL("./dist/dashboard/pdf-assets", import.meta.url),
  { recursive: true },
);
