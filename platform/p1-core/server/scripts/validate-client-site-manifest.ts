import { readFile } from "node:fs/promises";
import { validateClientSiteManifest } from "../../shared/client-site-manifest";

const manifestPath = process.argv[2];

if (!manifestPath || process.argv.length !== 3) {
  console.error("Usage: npm run manifest:validate -- <manifest.json>");
  process.exitCode = 2;
} else {
  try {
    const input: unknown = JSON.parse(await readFile(manifestPath, "utf8"));
    const result = validateClientSiteManifest(input);
    if (!result.success) {
      console.error(JSON.stringify({ valid: false, errors: result.errors }, null, 2));
      process.exitCode = 1;
    } else {
      console.log(
        JSON.stringify({
          valid: true,
          schemaVersion: result.data.schemaVersion,
          clientStackId: result.data.client.stackId,
        }),
      );
    }
  } catch (error) {
    const message =
      error instanceof SyntaxError ? "Manifest is not valid JSON." : "Manifest could not be read.";
    console.error(
      JSON.stringify(
        { valid: false, errors: [{ path: "$", code: "input_error", message }] },
        null,
        2,
      ),
    );
    process.exitCode = 2;
  }
}
