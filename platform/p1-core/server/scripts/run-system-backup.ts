import { runSystemBackup } from "../services/system-backup.service";

async function main() {
  const manifest = await runSystemBackup("manual");
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
