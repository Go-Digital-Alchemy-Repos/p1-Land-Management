import { test } from "node:test";
import assert from "node:assert/strict";
import { validateOfflineEntry } from "../src/core/offline-entry.ts";
const now = Date.parse("2026-09-07T12:00:00Z");
const entry = {
  origin: "https://api.test",
  accountId: "A",
  displayName: "Synthetic crew",
  verifiedAt: new Date(now - 1000).toISOString(),
  expiresAt: new Date(now + 1000).toISOString(),
  sessionExpiresAt: new Date(now + 2000).toISOString(),
  sessionFingerprint: "synthetic-hash",
};
test("offline entry requires exact session/origin and known finite unexpired timestamps", () => {
  assert.equal(
    validateOfflineEntry(entry, entry.origin, entry.sessionFingerprint, now)
      .accountId,
    "A",
  );
  for (const changed of [
    { expiresAt: "unknown" },
    { expiresAt: new Date(now - 1).toISOString() },
    { verifiedAt: new Date(now + 1).toISOString() },
    { sessionExpiresAt: new Date(now - 1).toISOString() },
    { accountId: 42 },
    { sessionFingerprint: 42 },
    {
      verifiedAt: new Date(now - 100).toISOString(),
      expiresAt: new Date(now - 101).toISOString(),
    },
  ])
    assert.throws(() =>
      validateOfflineEntry(
        { ...entry, ...changed },
        entry.origin,
        entry.sessionFingerprint,
        now,
      ),
    );
  assert.throws(() =>
    validateOfflineEntry(
      entry,
      "https://other.test",
      entry.sessionFingerprint,
      now,
    ),
  );
  assert.throws(() =>
    validateOfflineEntry(entry, entry.origin, "other-session", now),
  );
});

test("multiday offline validity follows actual session expiry without a new daily cutoff", () => {
  const later = {
    ...entry,
    verifiedAt: new Date(now - 48 * 3600000).toISOString(),
    expiresAt: new Date(now + 3600000).toISOString(),
    sessionExpiresAt: new Date(now + 3600000).toISOString(),
  };
  assert.equal(
    validateOfflineEntry(later, later.origin, later.sessionFingerprint, now)
      .accountId,
    "A",
  );
});

test("noncanonical, numeric, object and normalized-invalid calendar timestamps fail closed", () => {
  for (const field of ["verifiedAt", "expiresAt", "sessionExpiresAt"])
    for (const value of [
      now,
      {},
      null,
      "2026",
      "2026-02-30T12:00:00.000Z",
      "2026-09-07T12:00:00Z",
      "2026-09-07",
    ])
      assert.throws(() =>
        validateOfflineEntry(
          { ...entry, [field]: value },
          entry.origin,
          entry.sessionFingerprint,
          now,
        ),
      );
});
