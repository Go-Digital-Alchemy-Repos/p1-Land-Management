import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateClientMigrationIntake } from "./client-migration-intake";

const fixturePath = fileURLToPath(
  new URL("../docs/pilots/better-farms/client-migration-intake.example.json", import.meta.url),
);

async function fixture(): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(fixturePath, "utf8")) as Record<string, unknown>;
}

describe("client migration intake", () => {
  it("accepts the Better Farms draft without treating it as release approval", async () => {
    const result = validateClientMigrationIntake(await fixture());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("draft");
      expect(result.data.operations.release.status).toBe("blocked");
    }
  });

  it("fails closed when an approved intake leaves a required decision unresolved", async () => {
    const input = await fixture();
    input.status = "approved";
    const sourceAccess = input.sourceAccess as Record<string, unknown>;
    sourceAccess.accessMode = "pending";
    const dataMigration = input.dataMigration as Record<string, unknown>;
    dataMigration.status = "pending";

    const result = validateClientMigrationIntake(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "sourceAccess.accessMode" }),
          expect.objectContaining({ path: "dataMigration" }),
          expect.objectContaining({ path: "operations.release.status" }),
        ]),
      );
    }
  });

  it("rejects credential storage in the intake", async () => {
    const input = await fixture();
    const sourceAccess = input.sourceAccess as Record<string, unknown>;
    sourceAccess.credentialsStored = true;

    const result = validateClientMigrationIntake(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "sourceAccess.credentialsStored" }),
        ]),
      );
    }
  });
});
