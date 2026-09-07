import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { loadClientSiteManifest } from "../services/client-site-manifest.service";
import { verifyClientPilotContract } from "../services/client-pilot-contract-verification.service";

const root = fileURLToPath(new URL("../..", import.meta.url));
const manifestPath = path.join(root, "docs/pilots/better-farms/client-site-manifest.example.json");
const intakePath = path.join(root, "docs/pilots/better-farms/client-migration-intake.example.json");
const releaseManifestPath = path.join(
  root,
  "docs/pilots/better-farms/client-release-manifest.example.json",
);
const temporaryDirectories: string[] = [];

async function copyFixture(name: string, sourcePath: string) {
  const directory = await mkdtemp(path.join(tmpdir(), "client-pilot-contract-"));
  temporaryDirectories.push(directory);
  const target = path.join(directory, name);
  await cp(sourcePath, target);
  return target;
}

async function createSiteRoot() {
  const directory = await mkdtemp(path.join(tmpdir(), "client-pilot-site-"));
  temporaryDirectories.push(directory);
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
    const target = path.join(directory, reference);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, "fixture");
  }
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe("client pilot contract verification", () => {
  it("verifies the Better Farms manifest, intake, and source checkout together", async () => {
    const siteRoot = await createSiteRoot();
    const result = await verifyClientPilotContract({
      manifestPath,
      intakePath,
      releaseManifestPath,
      siteRoot,
      corePlatformVersion: "1.0.0",
    });

    expect(result).toEqual({ valid: true, stackId: "better-farms-foundation", errors: [] });
  });

  it("rejects intake routes that are not declared in the manifest", async () => {
    const siteRoot = await createSiteRoot();
    const modifiedIntakePath = await copyFixture("intake.json", intakePath);
    const intake = JSON.parse(await readFile(modifiedIntakePath, "utf8")) as Record<
      string,
      unknown
    >;
    const scope = intake.pilotScope as Record<string, unknown>;
    scope.routeIds = ["missing-route"];
    await writeFile(modifiedIntakePath, JSON.stringify(intake));

    const result = await verifyClientPilotContract({
      manifestPath,
      intakePath: modifiedIntakePath,
      releaseManifestPath,
      siteRoot,
      corePlatformVersion: "1.0.0",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      path: "pilotScope.routeIds.0",
      message: "must reference a route declared by the client-site manifest",
    });
  });

  it("rejects a release record pinned to another site revision", async () => {
    const siteRoot = await createSiteRoot();
    const modifiedReleasePath = await copyFixture("release.json", releaseManifestPath);
    const release = JSON.parse(await readFile(modifiedReleasePath, "utf8")) as Record<
      string,
      unknown
    >;
    const candidate = release.candidate as Record<string, unknown>;
    candidate.siteRevision = "b".repeat(40);
    await writeFile(modifiedReleasePath, JSON.stringify(release));

    const result = await verifyClientPilotContract({
      manifestPath,
      intakePath,
      releaseManifestPath: modifiedReleasePath,
      siteRoot,
      corePlatformVersion: "1.0.0",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      path: "release.candidate.siteRevision",
      message: "must match the client-site manifest source revision",
    });
  });

  it("rejects a disabled import gate unless the intake explicitly excludes all migration", async () => {
    const siteRoot = await createSiteRoot();
    const modifiedIntakePath = await copyFixture("intake.json", intakePath);
    const intake = JSON.parse(await readFile(modifiedIntakePath, "utf8")) as Record<
      string,
      unknown
    >;
    const dataMigration = intake.dataMigration as Record<string, unknown>;
    dataMigration.historyPolicy = "catalog-only";
    await writeFile(modifiedIntakePath, JSON.stringify(intake));

    const result = await verifyClientPilotContract({
      manifestPath,
      intakePath: modifiedIntakePath,
      releaseManifestPath,
      siteRoot,
      corePlatformVersion: "1.0.0",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      path: "release.gates.import",
      message: "an import gate marked not-required requires a no-import intake",
    });
  });
});
