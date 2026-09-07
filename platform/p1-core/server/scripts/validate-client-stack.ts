import { readFile } from "node:fs/promises";
import { validateClientStackEnvironment } from "../config/client-stack";
import {
  evaluateClientReleaseReadiness,
  validateClientReleaseManifest,
} from "../../shared/client-release-manifest";
import { parseClientStackDeploymentArguments } from "./client-stack-deployment-arguments";

const {
  errors: argumentErrors,
  releaseManifestPath,
  requirements,
} = parseClientStackDeploymentArguments(process.argv.slice(2));

if (argumentErrors.length > 0) {
  for (const error of argumentErrors) console.error(error);
  process.exitCode = 2;
} else {
  const result = validateClientStackEnvironment(process.env, {
    ...requirements,
  });

  if (releaseManifestPath) {
    try {
      const input: unknown = JSON.parse(await readFile(releaseManifestPath, "utf8"));
      const manifest = validateClientReleaseManifest(input);
      if (!manifest.success) {
        result.errors.push("Release manifest could not be validated");
      } else {
        if (result.stackId && manifest.data.clientStackId !== result.stackId) {
          result.errors.push("Release manifest clientStackId must match CLIENT_STACK_ID");
        }
        const readiness = evaluateClientReleaseReadiness(manifest.data);
        if (!readiness.ready) {
          result.errors.push(`Release manifest is not ready: ${readiness.blockers.join(", ")}`);
        }
      }
    } catch {
      result.errors.push("Release manifest could not be read");
    }
  }

  if (result.errors.length > 0) {
    console.error("Client-stack deployment preflight failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`Client-stack deployment preflight passed for ${result.stackId}.`);
    console.log(`Current Core Platform origin: ${result.corePlatformOrigin}`);
  }
}
