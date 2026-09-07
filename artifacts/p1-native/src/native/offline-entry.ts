import { Directory, File, Paths } from "expo-file-system";
import { OfflineRevocation } from "../core/offline-revocation";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { validateOfflineEntry, type OfflineEntry } from "../core/offline-entry";
const options = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
const hash = (value: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
const storageKey = async (origin: string) =>
  "p1.offline." + (await hash(origin));
const marker = async (origin: string) => {
  const dir = new Directory(Paths.document, "p1-private");
  dir.create({ idempotent: true, intermediates: true });
  return new File(dir, "offline-revoked-" + (await hash(origin)));
};
const revocation = new OfflineRevocation({
  mark: async (origin) => {
    (await marker(origin)).write("revoked");
  },
  marked: async (origin) => (await marker(origin)).exists,
  unmark: async (origin) => {
    const file = await marker(origin);
    if (file.exists) file.delete();
  },
  deleteEntry: async (origin) => {
    await SecureStore.deleteItemAsync(await storageKey(origin), options);
  },
});
export async function rememberCrew(
  origin: string,
  accountId: string,
  displayName: string,
  token: string,
  sessionExpiresAt: string,
) {
  const now = Date.now(),
    expiry = Date.parse(sessionExpiresAt);
  if (!Number.isFinite(expiry) || expiry <= now)
    throw new Error("Session expiry could not be verified for offline access.");
  const entry: OfflineEntry = {
    origin,
    accountId,
    displayName,
    verifiedAt: new Date(now).toISOString(),
    expiresAt: new Date(expiry).toISOString(),
    sessionExpiresAt,
    sessionFingerprint: await hash(token),
  };
  validateOfflineEntry(entry, origin, entry.sessionFingerprint, now);
  await SecureStore.setItemAsync(
    await storageKey(origin),
    JSON.stringify(entry),
    options,
  );
  await revocation.verified(origin);
}
export async function recallCrew(origin: string, token: string) {
  await revocation.assertAllowed(origin);
  const raw = await SecureStore.getItemAsync(await storageKey(origin), options);
  if (!raw)
    throw new Error(
      "Reconnect and download crew work before using offline access.",
    );
  return validateOfflineEntry(JSON.parse(raw), origin, await hash(token));
}
export async function forgetCrew(origin: string) {
  await revocation.revoke(origin);
}
