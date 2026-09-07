import { readFile } from "fs/promises";
import { gunzipSync } from "zlib";
import {
  loadBackupSnapshotFromKey,
  restoreBackupSnapshot,
} from "../services/system-backup.service";
import { assertBackupRestoreIdentity } from "../services/backup-restore-identity";

function getArg(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function loadSnapshot() {
  const key = getArg("--key");
  const file = getArg("--file");

  if (!key && !file) {
    throw new Error("Provide either --key <backup-object-key> or --file <path-to-backup.json.gz>");
  }

  if (key) {
    return loadBackupSnapshotFromKey(key);
  }

  const buffer = await readFile(file!);
  return JSON.parse(gunzipSync(buffer).toString("utf8"));
}

async function main() {
  if (!process.argv.includes("--yes")) {
    throw new Error("Restore is destructive. Re-run with --yes to confirm.");
  }

  const snapshot = await loadSnapshot();
  const identity = assertBackupRestoreIdentity(snapshot.manifest, {
    targetStackId: process.env.CLIENT_STACK_ID,
    allowLegacyBackup: process.argv.includes("--allow-legacy-backup"),
  });
  await restoreBackupSnapshot(snapshot, {
    allowLegacyBackup: process.argv.includes("--allow-legacy-backup"),
  });
  console.log(
    JSON.stringify(
      {
        restored: true,
        key: snapshot.manifest.key,
        createdAt: snapshot.manifest.createdAt,
        identity: identity.kind,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
