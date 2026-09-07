import { build } from "esbuild";

/** Separate opt-in operator entrypoint; never wired into normal application startup. */
export async function buildUploadApply() {
  await build({
    entryPoints: ["server/scripts/apply-legacy-upload-migration.ts"],
    platform: "node",
    target: "node20",
    bundle: true,
    format: "esm",
    packages: "external",
    outfile: "dist/operations/apply-legacy-upload-migration.mjs",
    logLevel: "info",
  });
}
