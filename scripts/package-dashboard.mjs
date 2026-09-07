import { mkdtemp, cp, copyFile, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, basename } from "node:path";
const root = resolve(import.meta.dirname, "..");
const dest = await mkdtemp(join(tmpdir(), "p1-dashboard-release-"));
for (const name of [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  "tsconfig.json",
])
  await copyFile(join(root, name), join(dest, name));
for (const name of [
  "lib",
  "scripts",
  "artifacts/api-server",
  "artifacts/p1-dashboard",
])
  await cp(join(root, name), join(dest, name), {
    recursive: true,
    filter: (p) =>
      !["node_modules", "dist", ".git", ".env", ".env.local"].includes(
        basename(p),
      ) &&
      !basename(p).endsWith(".tsbuildinfo") &&
      !basename(p).startsWith(".env"),
  });
for (const name of ["p1-website", "mockup-sandbox"]) {
  await mkdir(join(dest, "artifacts", name), { recursive: true });
  await copyFile(
    join(root, "artifacts", name, "package.json"),
    join(dest, "artifacts", name, "package.json"),
  );
}
await writeFile(
  join(dest, ".dockerignore"),
  "**/node_modules\n**/.env*\n**/.git\n**/dist\n**/*.test.ts\n",
);
console.log(dest);
