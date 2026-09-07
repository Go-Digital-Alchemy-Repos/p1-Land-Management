import { readFile } from "node:fs/promises";
import {
  evaluateClientReleaseReadiness,
  validateClientReleaseManifest,
} from "../../shared/client-release-manifest";

const manifestPath = process.argv[2];

if (!manifestPath || process.argv.length !== 3) {
  console.error("Usage: npm run release:readiness -- <release-manifest.json>");
  process.exitCode = 2;
} else {
  try {
    const input: unknown = JSON.parse(await readFile(manifestPath, "utf8"));
    const result = validateClientReleaseManifest(input);
    if (!result.success) {
      console.error(JSON.stringify({ valid: false, errors: result.errors }, null, 2));
      process.exitCode = 2;
    } else {
      const readiness = evaluateClientReleaseReadiness(result.data);
      console.log(
        JSON.stringify(
          {
            valid: true,
            clientStackId: result.data.clientStackId,
            ...readiness,
          },
          null,
          2,
        ),
      );
      if (!readiness.ready) process.exitCode = 1;
    }
  } catch {
    console.error(
      JSON.stringify(
        {
          valid: false,
          errors: [{ path: "$", code: "input_error", message: "Manifest could not be read." }],
        },
        null,
        2,
      ),
    );
    process.exitCode = 2;
  }
}
