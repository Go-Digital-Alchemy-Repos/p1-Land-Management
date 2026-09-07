import { build } from "esbuild";

/** Standalone ESM entrypoint; pg and AWS SDK resolve from production dependencies. */
export async function buildUploadVerifier() {
  await build({
    entryPoints: ["server/scripts/verify-legacy-upload-migration.ts"],
    platform: "node",
    target: "node20",
    bundle: true,
    format: "esm",
    packages: "external",
    outfile: "dist/operations/verify-legacy-upload-migration.mjs",
    logLevel: "info",
  });
}
