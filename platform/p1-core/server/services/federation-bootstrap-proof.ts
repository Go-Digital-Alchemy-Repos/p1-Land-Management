import { createHash, timingSafeEqual } from "node:crypto";

const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;
const keys = [
  "CORE_FEDERATION_BOOTSTRAP_ID",
  "CORE_FEDERATION_BOOTSTRAP_PROOF_SHA256",
  "CORE_FEDERATION_BOOTSTRAP_EXPIRES_AT",
] as const;

export type BootstrapProofConfig = {
  id: string;
  proofHash: string;
  expiresAt: Date;
};

/** Startup validation only. Absence disables fresh-owner bootstrap. */
export function readBootstrapProofConfig(
  env: Record<string, string | undefined>,
  now = Date.now(),
): BootstrapProofConfig | null {
  if (keys.every((key) => env[key] === undefined)) return null;
  const [id, proofHash, expiry] = keys.map((key) => env[key]);
  const fail = () => new Error("Invalid federation bootstrap configuration");
  if (
    !id ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
    !proofHash ||
    !/^[a-f0-9]{64}$/.test(proofHash) ||
    !expiry ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(expiry)
  )
    throw fail();
  const expiresAt = new Date(expiry);
  if (
    !Number.isFinite(now) ||
    !Number.isFinite(expiresAt.getTime()) ||
    expiresAt.toISOString() !== (expiry.includes(".") ? expiry : expiry.replace("Z", ".000Z")) ||
    expiresAt.getTime() <= now ||
    expiresAt.getTime() - now > MAX_WINDOW_MS
  )
    throw fail();
  return { id, proofHash, expiresAt };
}

/** Recheck time at each proof acceptance; the DB still owns single-use consumption. */
export function verifyBootstrapProof(
  config: BootstrapProofConfig | null,
  proof: unknown,
  now = Date.now(),
): boolean {
  if (
    !config ||
    !Number.isFinite(now) ||
    !Number.isFinite(config.expiresAt.getTime()) ||
    config.expiresAt.getTime() <= now ||
    typeof proof !== "string" ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(proof) ||
    !/^[a-f0-9]{64}$/.test(config.proofHash)
  )
    return false;
  const actual = createHash("sha256").update(proof).digest();
  return timingSafeEqual(actual, Buffer.from(config.proofHash, "hex"));
}
