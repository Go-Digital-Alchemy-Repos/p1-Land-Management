import { verifyClientPilotContract } from "../services/client-pilot-contract-verification.service";

const [manifestPath, intakePath, releaseManifestPath, siteRoot] = process.argv.slice(2);
if (!manifestPath || !intakePath || !releaseManifestPath || !siteRoot) {
  console.error(
    "Usage: npm run pilot:contract:verify -- <site-manifest.json> <intake.json> <release-manifest.json> <site-root>",
  );
  process.exitCode = 1;
} else {
  try {
    const result = await verifyClientPilotContract({
      manifestPath,
      intakePath,
      releaseManifestPath,
      siteRoot,
      corePlatformVersion: process.env.CLIENT_SITE_CORE_VERSION || "1.0.0",
    });
    console.log(JSON.stringify(result));
    if (!result.valid) process.exitCode = 1;
  } catch (error) {
    console.error(
      JSON.stringify({
        valid: false,
        errors: [
          {
            path: "$",
            message:
              error instanceof Error
                ? error.message
                : "Client pilot contract could not be verified.",
          },
        ],
      }),
    );
    process.exitCode = 1;
  }
}
