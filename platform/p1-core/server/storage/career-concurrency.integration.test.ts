import { it, expect, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
// Explicit opt-in: creates and removes only its own disposable Docker database.
it.skipIf(process.env.P1_CAREER_CONCURRENCY_TEST !== "true")(
  "CareerStorage serializes stale saves at JSON timestamp precision",
  async () => {
    const name = "p1-career-cas-" + randomUUID().slice(0, 8),
      password = randomUUID();
    let created = false;
    let pool: import("pg").Pool | undefined;
    const docker = (...args: string[]) =>
      execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    try {
      docker(
        "run",
        "--detach",
        "--rm",
        "--name",
        name,
        "-e",
        "POSTGRES_DB=career_test",
        "-e",
        "POSTGRES_PASSWORD=" + password,
        "-p",
        "127.0.0.1::5432",
        "postgres:17-alpine",
      );
      created = true;
      let ready = false;
      for (let i = 0; i < 60; i++) {
        try {
          docker("exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "postgres");
          ready = true;
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 250));
        }
      }
      if (!ready) throw new Error("Synthetic PostgreSQL did not start");
      const port = JSON.parse(docker("inspect", name))[0].NetworkSettings.Ports["5432/tcp"][0]
        .HostPort;
      vi.stubEnv("DATABASE_URL", `postgresql://postgres:${password}@127.0.0.1:${port}/career_test`);
      vi.stubEnv("NODE_ENV", "test");
      const database = await import("../db");
      pool = database.pool;
      await pool.query(
        "CREATE TABLE users(id varchar PRIMARY KEY); CREATE TABLE therapist_profiles(id varchar PRIMARY KEY)",
      );
      const migration = await readFile(
        new URL("../../migrations/0042_career_directory_locations.sql", import.meta.url),
        "utf8",
      );
      await pool.query(migration);
      await pool.query(migration);
      const { CareerStorage } = await import("./career.storage");
      const storage = new CareerStorage();
      const original = await storage.createJob({
        title: "Synthetic concurrent job",
        slug: "synthetic-concurrent-job",
      });
      // Preserve the original microseconds, then round-trip the timestamp as JSON does.
      const expected = original.updatedAt.toISOString();
      const writes = await Promise.all([
        storage.updateJob(original.id, { summary: "A" }, expected),
        storage.updateJob(original.id, { summary: "B" }, expected),
      ]);
      expect(writes.filter(Boolean)).toHaveLength(1);
      let current = (await storage.getJob(original.id))!;
      expect(current.updatedAt.getTime()).toBeGreaterThan(original.updatedAt.getTime());
      expect(await storage.updateJob(original.id, { summary: "Stale" }, expected)).toBeUndefined();
      for (let i = 0; i < 8; i++) {
        const prior = current.updatedAt.toISOString();
        current = (await storage.updateJob(original.id, { summary: "Serial " + i }, prior))!;
        expect(current.updatedAt.getTime()).toBeGreaterThan(new Date(prior).getTime());
        expect(
          await storage.updateJob(original.id, { summary: "Repeated" }, prior),
        ).toBeUndefined();
      }
      const beforeLegacy = current.updatedAt.toISOString();
      await storage.updateJob(original.id, { summary: "Legacy caller" });
      expect(
        await storage.updateJob(original.id, { summary: "Old native form" }, beforeLegacy),
      ).toBeUndefined();
      expect((await storage.getJob(original.id))!.summary).toBe("Legacy caller");
    } finally {
      if (pool) await pool.end();
      vi.unstubAllEnvs();
      if (created) docker("stop", name);
    }
  },
  60000,
);
