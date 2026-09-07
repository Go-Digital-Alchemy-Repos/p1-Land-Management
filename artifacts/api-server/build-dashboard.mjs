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
