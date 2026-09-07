import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { loadClientSiteManifest } from "../services/client-site-manifest.service";
import { verifyClientSiteContract } from "../services/client-site-contract-verification.service";

const manifestPath = fileURLToPath(
  new URL("../../docs/pilots/better-farms/client-site-manifest.example.json", import.meta.url),
);
const directories: string[] = [];

async function createSiteRoot() {
  const root = await mkdtemp(path.join(tmpdir(), "client-site-contract-"));
  directories.push(root);
  const manifest = await loadClientSiteManifest(manifestPath, "1.0.0");
  const references = [
    ...manifest.routes.map((route) => route.componentRef.split("#", 1)[0]),
    ...manifest.assets.map((asset) => asset.sourceRef),
    manifest.theme.tokenSource,
    ...manifest.puck.editableComponents.flatMap((component) => [
      component.rendererRef.split("#", 1)[0],
      component.fieldSchemaRef.split("#", 1)[0],
    ]),
  ];
  for (const reference of new Set(references)) {
    const target = path.join(root, reference);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, "fixture");
  }
  return root;
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("client site contract verification", () => {
  it("verifies every manifest reference against a site checkout", async () => {
    const siteRoot = await createSiteRoot();

    const result = await verifyClientSiteContract({
      manifestPath,
      siteRoot,
      corePlatformVersion: "1.0.0",
    });

    expect(result.valid).toBe(true);
    expect(result.stackId).toBe("better-farms-foundation");
    expect(result.checkedFiles).toContain("client/src/pages/FundAFarm.tsx");
  });

  it("reports a declared source file that is missing from the site checkout", async () => {
    const siteRoot = await createSiteRoot();
    await rm(path.join(siteRoot, "client/src/pages/FundAFarm.tsx"));

    const result = await verifyClientSiteContract({
      manifestPath,
      siteRoot,
      corePlatformVersion: "1.0.0",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      ref: "client/src/pages/FundAFarm.tsx",
      message: "does not exist in the site checkout",
    });
  });
});

it("rejects source symlinks escaping the checkout", async () => {
  const siteRoot = await createSiteRoot();
  const outside = await createSiteRoot();
  const ref = "client/src/pages/FundAFarm.tsx";
  await rm(path.join(siteRoot, ref));
  await symlink(path.join(outside, ref), path.join(siteRoot, ref));
  const result = await verifyClientSiteContract({
    manifestPath,
    siteRoot,
    corePlatformVersion: "1.0.0",
  });
  expect(result.errors).toContainEqual({ ref, message: "resolves outside the site checkout" });
  expect(result.valid).toBe(false);
});

it("rejects directories in place of declared files", async () => {
  const siteRoot = await createSiteRoot();
  const ref = "client/src/pages/FundAFarm.tsx";
  await rm(path.join(siteRoot, ref));
  await mkdir(path.join(siteRoot, ref));
  const result = await verifyClientSiteContract({
    manifestPath,
    siteRoot,
    corePlatformVersion: "1.0.0",
  });
  expect(result.errors).toContainEqual({ ref, message: "must reference a regular file" });
});

it("checks the declared field schema and permits internal file symlinks", async () => {
  const siteRoot = await createSiteRoot();
  const manifest = await loadClientSiteManifest(manifestPath, "1.0.0");
  const ref = manifest.puck.editableComponents[0].fieldSchemaRef.split("#", 1)[0];
  await rm(path.join(siteRoot, ref));
  const missing = await verifyClientSiteContract({
    manifestPath,
    siteRoot,
    corePlatformVersion: "1.0.0",
  });
  expect(missing.errors).toContainEqual({ ref, message: "does not exist in the site checkout" });
  await symlink(path.join(siteRoot, "client/src/pages/FundAFarm.tsx"), path.join(siteRoot, ref));
  const valid = await verifyClientSiteContract({
    manifestPath,
    siteRoot,
    corePlatformVersion: "1.0.0",
  });
  expect(valid.valid).toBe(true);
});
