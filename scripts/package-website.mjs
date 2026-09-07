import { cp, copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(import.meta.dirname, "..");
const destination = await mkdtemp(join(tmpdir(), "p1-public-release-"));
const prebuilt = process.argv.includes("--prebuilt");

if (prebuilt) {
  const publicOrigin = process.env.P1_PUBLIC_ORIGIN;
  if (!publicOrigin) {
    throw new Error("P1_PUBLIC_ORIGIN is required when packaging a prebuilt public release.");
  }

  await cp(join(root, "artifacts", "p1-website", "dist"), join(destination, "dist"), {
    recursive: true,
  });
  await cp(join(root, "artifacts", "p1-website", "server"), join(destination, "server"), {
    recursive: true,
  });
  await cp(join(root, "artifacts", "p1-website", "config"), join(destination, "config"), {
    recursive: true,
  });

  const manifestPath = join(destination, "config", "client-site-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.origins.publicSite = publicOrigin;
  manifest.origins.admin = process.env.P1_ADMIN_ORIGIN || publicOrigin;
  if (process.env.P1_SOURCE_REVISION) {
    manifest.client.source.revision = process.env.P1_SOURCE_REVISION;
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(
    join(destination, "Dockerfile"),
    `FROM node:22-bookworm-slim\nWORKDIR /app\nENV NODE_ENV=production PORT=4173 P1_CONTENT_CACHE_DIR=/app/data/cms\nCOPY --chown=node:node dist ./dist\nCOPY --chown=node:node server ./server\nCOPY --chown=node:node config ./config\nRUN mkdir -p /app/data && chown node:node /app/data\nUSER node\nEXPOSE 4173\nCMD [\"node\", \"server/index.mjs\"]\n`,
  );
  console.log(destination);
  process.exit(0);
}

for (const name of [
  "Dockerfile",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  "tsconfig.json",
]) {
  await copyFile(join(root, name), join(destination, name));
}

await cp(join(root, "artifacts", "p1-website"), join(destination, "artifacts", "p1-website"), {
  recursive: true,
  filter: (path) => !["node_modules", "dist", ".git"].includes(basename(path))
    && !basename(path).startsWith(".env")
    && !basename(path).endsWith(".tsbuildinfo"),
});

// The site currently does not import the dashboard client, but its workspace
// package remains a declared dependency. Retain its manifest without copying
// unrelated dashboard or API source into a public release context.
await mkdir(join(destination, "lib", "api-client-react"), { recursive: true });
await copyFile(
  join(root, "lib", "api-client-react", "package.json"),
  join(destination, "lib", "api-client-react", "package.json"),
);
await copyFile(
  join(root, "lib", "api-client-react", "tsconfig.json"),
  join(destination, "lib", "api-client-react", "tsconfig.json"),
);

await mkdir(join(destination, "attached_assets"), { recursive: true });
await copyFile(
  join(root, "attached_assets", "Asset_1_1782329698014.svg"),
  join(destination, "attached_assets", "Asset_1_1782329698014.svg"),
);

await mkdir(join(destination, "platform", "p1-core", "script"), { recursive: true });
await mkdir(join(destination, "platform", "p1-core", "config"), { recursive: true });
await copyFile(
  join(root, "platform", "p1-core", "script", "p1-manifest-config.mjs"),
  join(destination, "platform", "p1-core", "script", "p1-manifest-config.mjs"),
);

for (const name of ["api-server", "mockup-sandbox", "p1-dashboard"]) {
  await mkdir(join(destination, "artifacts", name), { recursive: true });
  await copyFile(
    join(root, "artifacts", name, "package.json"),
    join(destination, "artifacts", name, "package.json"),
  );
}

await writeFile(
  join(destination, ".dockerignore"),
  "**/node_modules\n**/.env*\n**/.git\n**/dist\n**/*.test.ts\n",
);
console.log(destination);
