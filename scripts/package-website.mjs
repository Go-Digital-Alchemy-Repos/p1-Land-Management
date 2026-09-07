import { cp, copyFile, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(import.meta.dirname, "..");
const destination = await mkdtemp(join(tmpdir(), "p1-public-release-"));

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
