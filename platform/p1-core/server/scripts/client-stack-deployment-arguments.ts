import type { ClientStackRequirements } from "../config/client-stack";

const booleanFlags = new Map<string, keyof ClientStackRequirements>([
  ["--require-ecommerce", "ecommerce"],
  ["--require-email", "email"],
  ["--require-backups", "backups"],
  ["--require-observability", "observability"],
  ["--require-client-form-proxy", "clientFormProxy"],
  ["--require-separate-origins", "separatePublicAndAdminOrigins"],
]);

export interface ClientStackDeploymentArguments {
  requirements: ClientStackRequirements;
  releaseManifestPath?: string;
  errors: string[];
}

export function parseClientStackDeploymentArguments(
  arguments_: string[],
): ClientStackDeploymentArguments {
  const requirements: ClientStackRequirements = {};
  const seenFlags = new Set<string>();
  const errors: string[] = [];
  let releaseManifestPath: string | undefined;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--release-manifest") {
      const candidate = arguments_[index + 1];
      if (!candidate || candidate.startsWith("--")) {
        errors.push("--release-manifest requires a file path");
      } else {
        if (seenFlags.has(argument)) {
          errors.push("--release-manifest may be provided only once");
        } else {
          releaseManifestPath = candidate;
          seenFlags.add(argument);
        }
        index += 1;
      }
      continue;
    }

    const requirement = booleanFlags.get(argument);
    if (requirement) {
      if (seenFlags.has(argument)) {
        errors.push(`${argument} may be provided only once`);
      } else {
        requirements[requirement] = true;
        seenFlags.add(argument);
      }
      continue;
    }

    errors.push(`Unknown option: ${argument}`);
  }

  return { requirements, releaseManifestPath, errors };
}
