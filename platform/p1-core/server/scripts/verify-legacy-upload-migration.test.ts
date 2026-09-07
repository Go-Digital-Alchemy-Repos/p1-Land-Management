import pg from "pg";
import { buildLegacyUploadMigrationPlan } from "../services/legacy-upload-migration-plan";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile, symlink, rm, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { main, readMigrationInput } from "./verify-legacy-upload-migration";
describe("read-only migration command input", () => {
  it("bounds parsing and refuses symlinks", async () => {
    const directory = await mkdtemp(join(tmpdir(), "migration-input-test-"));
    try {
      const path = join(directory, "input.json");
      await writeFile(path, '{"safe":true}', { mode: 0o600 });
      expect((await readMigrationInput(path)).value).toEqual({ safe: true });
      await chmod(path, 0o644);
      await expect(readMigrationInput(path)).rejects.toThrow();
      await chmod(path, 0o600);
      const fifo = join(directory, "fifo");
      execFileSync("mkfifo", [fifo]);
      await expect(readMigrationInput(fifo)).rejects.toThrow();
      await expect(readMigrationInput("x".repeat(4097))).rejects.toThrow();
      await symlink(path, join(directory, "link"));
      await expect(readMigrationInput(join(directory, "link"))).rejects.toThrow();
      await writeFile(path, " ".repeat(65537));
      await expect(readMigrationInput(path)).rejects.toThrow();
      await writeFile(path, "invalid");
      await expect(readMigrationInput(path)).rejects.toThrow();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("has no apply switch and returns only a generic sanitized failure", async () => {
    const output = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      expect(await main(["--apply", "secret-token"], {})).toBe(1);
      expect(String(output.mock.calls[0][0])).not.toContain("secret-token");
      expect(String(output.mock.calls[0][0])).toContain('"mode":"dry-run"');
    } finally {
      output.mockRestore();
    }
  });
  it("rejects same input/approval file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "migration-approval-test-"));
    const output = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      const path = join(directory, "plan.json");
      await writeFile(path, "{}", { mode: 0o600 });
      expect(await main(["--plan", path, "--approval", path], {})).toBe(1);
    } finally {
      output.mockRestore();
      await rm(directory, { recursive: true, force: true });
    }
  });
  it.each([
    "options=-c%20default_transaction_read_only=off",
    "statement_timeout=0&query_timeout=0",
  ])("rejects URL session overrides before creating a database pool: %s", async (query) => {
    const directory = await mkdtemp(join(tmpdir(), "migration-readonly-test-"));
    const output = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const pool = vi.spyOn(pg, "Pool");
    try {
      const plan = join(directory, "plan");
      const approval = join(directory, "approval");
      await writeFile(plan, "{}", { mode: 0o600 });
      await writeFile(approval, "{}", { mode: 0o600 });
      expect(
        await main(["--plan", plan, "--approval", approval], {
          DATABASE_URL: `postgresql://user:secret@localhost/core?${query}`,
        }),
      ).toBe(1);
      expect(pool).not.toHaveBeenCalled();
      expect(JSON.stringify(output.mock.calls)).not.toContain("secret");
    } finally {
      pool.mockRestore();
      output.mockRestore();
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("sanitizes database/idle errors and cleanup rejection", async () => {
    const directory = await mkdtemp(join(tmpdir(), "migration-db-error-test-"));
    const output = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const fake = {
      on: vi.fn((_event: string, handler: () => void) => handler()),
      query: vi.fn(async () => {
        throw new Error("secret-database-credentials");
      }),
      end: vi.fn(async () => {
        throw new Error("secret-cleanup-error");
      }),
    };
    const pool = vi.spyOn(pg, "Pool").mockImplementation(() => fake as unknown as pg.Pool);
    try {
      const sourceIdentity = {
        railwayProjectId: "project",
        railwayEnvironmentId: "env",
        railwayServiceId: "service",
        deploymentId: "deployment",
        gitCommitSha: "a".repeat(40),
        databaseIdentityReference: "sha256:" + "a".repeat(64),
      };
      const plan = buildLegacyUploadMigrationPlan({
        stackId: "core",
        bucketName: "core-media",
        sourcePrefix: "",
        destinationPrefix: "clients/core/uploads",
        entries: [{ sourceKey: "cms/a", sha256: "a".repeat(64), byteLength: 1 }],
        ownership: {
          reference: "review",
          scope: "exact-object",
          stackId: "core",
          sourcePrefix: "",
          sourceIdentity,
          record: {
            table: "cms_media",
            id: "1",
            r2Key: "cms/a",
            sha256: "a".repeat(64),
            byteLength: 1,
          },
        },
      });
      const approval = {
        schemaVersion: 1,
        planId: plan.planId,
        ownershipReference: "review",
        sourceIdentity,
        target: { stackId: "core", bucketName: "core-media", uploadPrefix: "clients/core/uploads" },
      };
      const planPath = join(directory, "plan");
      const approvalPath = join(directory, "approval");
      await writeFile(planPath, JSON.stringify(plan), { mode: 0o600 });
      await writeFile(approvalPath, JSON.stringify(approval), { mode: 0o600 });
      expect(
        await main(["--plan", planPath, "--approval", approvalPath], {
          DATABASE_URL: "postgresql://synthetic:synthetic@localhost/core",
          RAILWAY_PROJECT_ID: "project",
          RAILWAY_ENVIRONMENT_ID: "env",
          RAILWAY_SERVICE_ID: "service",
          RAILWAY_DEPLOYMENT_ID: "deployment",
          RAILWAY_GIT_COMMIT_SHA: "a".repeat(40),
        }),
      ).toBe(1);
      expect(fake.end).toHaveBeenCalledOnce();
      expect(fake.on).toHaveBeenCalledWith("error", expect.any(Function));
      expect(JSON.stringify(output.mock.calls)).not.toContain("secret-");
    } finally {
      pool.mockRestore();
      output.mockRestore();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
