import { verifyClientSiteContract } from "../services/client-site-contract-verification.service";

const [manifestPath, siteRoot] = process.argv.slice(2);
if (!manifestPath || !siteRoot) {
  console.error("Usage: npm run site:contract:verify -- <manifest.json> <site-root>");
  process.exitCode = 1;
} else {
  try {
    const result = await verifyClientSiteContract({
      manifestPath,
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
            ref: "manifest",
            message:
              error instanceof Error
                ? error.message
                : "Client site contract could not be verified.",
          },
        ],
      }),
    );
    process.exitCode = 1;
  }
}
