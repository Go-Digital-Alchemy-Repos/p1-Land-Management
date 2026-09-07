import { buildUploadApply } from "./build-upload-apply";
import { build as esbuild } from "esbuild";
import { buildUploadVerifier } from "./build-upload-verifier";
import { build as viteBuild } from "vite";
import { rm, cp, readFile } from "fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  ) as { version?: string };

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
      __APP_VERSION__: JSON.stringify(packageJson.version ?? "unknown"),
    },
    minify: true,
    packages: "bundle",
    // Sharp loads native bindings relative to its package. Bundling its ESM
    // loader into CJS erases import.meta.url and crashes before server startup.
    external: ["sharp"],
    logLevel: "info",
  });

  await buildUploadVerifier();
  await buildUploadApply();

  console.log("copying migrations...");
  await cp("p1-migrations", "dist/p1-migrations", { recursive: true });

  await cp("config", "dist/config", { recursive: true });

  console.log("copying docs...");
  await cp("docs", "dist/docs", { recursive: true });

  console.log("copying PDF font data...");
  await cp("node_modules/pdfkit/js/data", "dist/data", { recursive: true });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
