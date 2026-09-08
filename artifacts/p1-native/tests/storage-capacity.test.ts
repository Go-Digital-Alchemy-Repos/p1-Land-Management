import { test } from "node:test";
import assert from "node:assert/strict";
import {
  photoStagingCapacityError,
  protectedStorageMessage,
  protectedStorageStatus,
} from "../src/core/storage-capacity.ts";

test("storage status is local-only, distinguishes low capacity, and preserves pending work guidance", () => {
  const normal = protectedStorageStatus({
    queuedPhotoCount: 2,
    queuedPhotoBytes: 3 * 1024 * 1024,
    availableBytes: 2 * 1024 * 1024 * 1024,
    totalBytes: 64 * 1024 * 1024 * 1024,
  });
  assert.equal(normal.severity, "normal");
  assert.match(protectedStorageMessage(normal), /2 protected queued photos/);
  assert.equal(photoStagingCapacityError(normal, 15 * 1024 * 1024), null);

  const low = protectedStorageStatus({
    queuedPhotoCount: 1,
    queuedPhotoBytes: 1024,
    availableBytes: 200 * 1024 * 1024,
    totalBytes: 64 * 1024 * 1024 * 1024,
  });
  assert.equal(low.severity, "low");
  assert.match(protectedStorageMessage(low), /will not be removed automatically/);

  const critical = protectedStorageStatus({
    queuedPhotoCount: 1,
    queuedPhotoBytes: 1024,
    availableBytes: 20 * 1024 * 1024,
    totalBytes: 64 * 1024 * 1024 * 1024,
  });
  assert.equal(critical.severity, "critical");
  assert.match(
    photoStagingCapacityError(critical, 5 * 1024 * 1024) || "",
    /not added to the protected queue/,
  );
});

test("unavailable storage telemetry never blocks a capture by assumption", () => {
  const unavailable = protectedStorageStatus({
    queuedPhotoCount: 0,
    queuedPhotoBytes: 0,
    availableBytes: Number.NaN,
    totalBytes: Number.NaN,
  });
  assert.equal(unavailable.severity, "unavailable");
  assert.equal(photoStagingCapacityError(unavailable, 1024), null);
  assert.match(protectedStorageMessage(unavailable), /could not be read/);
});
