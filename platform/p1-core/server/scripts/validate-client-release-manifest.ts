import { readFile } from "node:fs/promises";
import { validateClientReleaseManifest } from "../../shared/client-release-manifest";

const manifestPath = process.argv[2];

if (!manifestPath || process.argv.length !== 3) {
  console.error("Usage: npm run release:manifest:validate -- <release-manifest.json>");
  process.exitCode = 2;
} else {
  try {
    const input: unknown = JSON.parse(await readFile(manifestPath, "utf8"));
    const result = validateClientReleaseManifest(input);
    if (!result.success) {
      console.error(JSON.stringify({ valid: false, errors: result.errors }, null, 2));
      process.exitCode = 1;
    } else {
      console.log(
        JSON.stringify(
          {
            valid: true,
            schemaVersion: result.data.schemaVersion,
            status: result.data.status,
            clientStackId: result.data.clientStackId,
            requiredGateCount: result.data.gates.filter((gate) => gate.required).length,
          },
          null,
          2,
        ),
      );
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
