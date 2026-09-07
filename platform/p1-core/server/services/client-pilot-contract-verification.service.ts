import { readFile } from "node:fs/promises";
import {
  type ClientMigrationIntake,
  validateClientMigrationIntake,
} from "../../shared/client-migration-intake";
import {
  type ClientReleaseManifest,
  validateClientReleaseManifest,
} from "../../shared/client-release-manifest";
import { loadClientSiteManifest } from "./client-site-manifest.service";
import { verifyClientSiteContract } from "./client-site-contract-verification.service";

export type ClientPilotContractVerification = {
  valid: boolean;
  stackId?: string;
  errors: Array<{ path: string; message: string }>;
};

async function loadIntake(intakePath: string): Promise<ClientMigrationIntake> {
  let input: unknown;
  try {
    input = JSON.parse(await readFile(intakePath, "utf8"));
  } catch {
    throw new Error("Client migration intake could not be read or parsed.");
  }
  const result = validateClientMigrationIntake(input);
  if (!result.success) throw new Error("Client migration intake failed validation.");
  return result.data;
}

async function loadReleaseManifest(releaseManifestPath: string): Promise<ClientReleaseManifest> {
  let input: unknown;
  try {
    input = JSON.parse(await readFile(releaseManifestPath, "utf8"));
  } catch {
    throw new Error("Client release manifest could not be read or parsed.");
  }
  const result = validateClientReleaseManifest(input);
  if (!result.success) throw new Error("Client release manifest failed validation.");
  return result.data;
}

export async function verifyClientPilotContract(params: {
  manifestPath: string;
  intakePath: string;
  releaseManifestPath: string;
  siteRoot: string;
  corePlatformVersion: string;
}): Promise<ClientPilotContractVerification> {
  const [manifest, intake, release, site] = await Promise.all([
    loadClientSiteManifest(params.manifestPath, params.corePlatformVersion),
    loadIntake(params.intakePath),
    loadReleaseManifest(params.releaseManifestPath),
    verifyClientSiteContract({
      manifestPath: params.manifestPath,
      siteRoot: params.siteRoot,
      corePlatformVersion: params.corePlatformVersion,
    }),
  ]);
  const errors: ClientPilotContractVerification["errors"] = site.errors.map((error) => ({
    path: `site.${error.ref}`,
    message: error.message,
  }));
  if (manifest.client.stackId !== intake.client.stackId) {
    errors.push({
      path: "client.stackId",
      message: "must match the client-site manifest stack ID",
    });
  }
  if (manifest.client.stackId !== release.clientStackId) {
    errors.push({
      path: "release.clientStackId",
      message: "must match the client-site manifest stack ID",
    });
  }
  if (manifest.client.source.revision !== release.candidate.siteRevision) {
    errors.push({
      path: "release.candidate.siteRevision",
      message: "must match the client-site manifest source revision",
    });
  }
  if (manifest.origins.publicSite !== release.origins.publicSite) {
    errors.push({
      path: "release.origins.publicSite",
      message: "must match the client-site manifest public origin",
    });
  }
  if (manifest.origins.admin !== release.origins.admin) {
    errors.push({
      path: "release.origins.admin",
      message: "must match the client-site manifest admin origin",
    });
  }
  const manifestRouteIds = new Set(manifest.routes.map((route) => route.id));
  intake.pilotScope.routeIds.forEach((routeId, index) => {
    if (!manifestRouteIds.has(routeId)) {
      errors.push({
        path: `pilotScope.routeIds.${index}`,
        message: "must reference a route declared by the client-site manifest",
      });
    }
  });
  const importGate = release.gates.find((gate) => gate.id === "import");
  const noImportPilot =
    intake.sourceAccess.system === "none" && intake.sourceAccess.accessMode === "not-applicable";
  const noImportMigrationPolicy =
    intake.dataMigration.historyPolicy === "none" &&
    intake.dataMigration.entities.every((entity) => entity.disposition === "excluded");

  if (noImportPilot && !noImportMigrationPolicy) {
    errors.push({
      path: "dataMigration",
      message: "a no-import intake requires no history and excluded entity dispositions",
    });
  }
  if (importGate && !importGate.required && (!noImportPilot || !noImportMigrationPolicy)) {
    errors.push({
      path: "release.gates.import",
      message: "an import gate marked not-required requires a no-import intake",
    });
  }
  if (noImportPilot && importGate?.required) {
    errors.push({
      path: "release.gates.import",
      message: "a no-import intake requires an import gate marked not-required",
    });
  }
  if (intake.status === "approved" && manifest.status !== "approved") {
    errors.push({
      path: "status",
      message: "an approved intake requires an approved client-site manifest",
    });
  }
  if (intake.status === "approved" && release.status !== "approved") {
    errors.push({
      path: "release.status",
      message: "an approved intake requires an approved client release manifest",
    });
  }
  if (release.status === "approved" && intake.status !== "approved") {
    errors.push({
      path: "status",
      message: "an approved client release manifest requires an approved intake",
    });
  }
  if (release.status === "approved" && manifest.status !== "approved") {
    errors.push({
      path: "status",
      message: "an approved client release manifest requires an approved client-site manifest",
    });
  }
  return { valid: errors.length === 0, stackId: manifest.client.stackId, errors };
}
