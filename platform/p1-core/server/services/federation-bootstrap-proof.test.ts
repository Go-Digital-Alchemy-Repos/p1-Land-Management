import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { readBootstrapProofConfig, verifyBootstrapProof } from "./federation-bootstrap-proof";
const now = Date.parse("2026-09-07T12:00:00Z");
const proof = "synthetic-only-bootstrap-proof-0000000000000000000000";
const env = {
  CORE_FEDERATION_BOOTSTRAP_ID: "11111111-1111-4111-8111-111111111111",
  CORE_FEDERATION_BOOTSTRAP_PROOF_SHA256: createHash("sha256").update(proof).digest("hex"),
  CORE_FEDERATION_BOOTSTRAP_EXPIRES_AT: "2026-09-07T13:00:00Z",
};
describe("Core-only bootstrap proof", () => {
  it("is disabled when absent and rejects partial configuration", () => {
    expect(readBootstrapProofConfig({}, now)).toBeNull();
    expect(() =>
      readBootstrapProofConfig(
        { CORE_FEDERATION_BOOTSTRAP_ID: env.CORE_FEDERATION_BOOTSTRAP_ID },
        now,
      ),
    ).toThrow("Invalid federation bootstrap configuration");
  });
  it.each([
    "2026-09-07T12:00:00Z",
    "2026-09-08T12:00:01Z",
    "2026-02-30T13:00:00Z",
    "2026-09-07T13:00:00+00:00",
    "not-a-date",
  ])("rejects expired, excessive or noncanonical UTC expiry %s", (expiry) => {
    expect(() =>
      readBootstrapProofConfig({ ...env, CORE_FEDERATION_BOOTSTRAP_EXPIRES_AT: expiry }, now),
    ).toThrow("Invalid federation bootstrap configuration");
  });
  it("accepts a valid proof only before expiry, even with previously loaded configuration", () => {
    const config = readBootstrapProofConfig(env, now);
    expect(verifyBootstrapProof(config, proof, now)).toBe(true);
    expect(
      verifyBootstrapProof(config, proof, Date.parse(env.CORE_FEDERATION_BOOTSTRAP_EXPIRES_AT)),
    ).toBe(false);
    expect(verifyBootstrapProof(config, proof, Number.NaN)).toBe(false);
    expect(verifyBootstrapProof(config, "x".repeat(43), now)).toBe(false);
    expect(verifyBootstrapProof(config, " " + proof, now)).toBe(false);
    expect(verifyBootstrapProof(config, { proof }, now)).toBe(false);
    expect(verifyBootstrapProof(null, proof, now)).toBe(false);
  });
  it("does not include configured values in errors", () => {
    expect(() =>
      readBootstrapProofConfig({ ...env, CORE_FEDERATION_BOOTSTRAP_PROOF_SHA256: proof }, now),
    ).toThrow(/^Invalid federation bootstrap configuration$/);
  });
});
