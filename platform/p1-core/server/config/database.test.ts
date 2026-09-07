import { describe, expect, it } from "vitest";
import pg from "pg";
import type { ConnectionOptions, PeerCertificate } from "node:tls";
import { databasePoolConfig } from "./database";

const remote = "postgresql://operator:synthetic-password@db.example.test/core";
const railway = {
  NODE_ENV: "production",
  RAILWAY_PROJECT_ID: "test-project",
  RAILWAY_ENVIRONMENT_ID: "test-environment",
  DATABASE_URL:
    "postgresql://operator:synthetic-password@postgres.railway.internal/core?sslmode=disable",
};

describe("database transport policy", () => {
  it.each([undefined, "production", "test"])("verifies remote certificates in %s", (NODE_ENV) => {
    const config = databasePoolConfig({ DATABASE_URL: remote, NODE_ENV });
    expect(config.ssl).toMatchObject({ rejectUnauthorized: true });
    expect(new pg.Client(config).ssl).toMatchObject({ rejectUnauthorized: true });
  });
  it.each(["require", "verify-full"])("normalizes %s without discarding custom CA", (mode) => {
    const config = databasePoolConfig({
      DATABASE_URL: `${remote}?sslmode=${mode}`,
      DATABASE_TLS_CA: "test CA",
    });
    expect(config.connectionString).not.toContain("sslmode");
    expect(new pg.Client(config).ssl).toMatchObject({ rejectUnauthorized: true, ca: "test CA" });
  });
  it.each([
    ["localhost", "DNS:localhost", true],
    ["127.0.0.1", "DNS:localhost", false],
    ["127.0.0.1", "IP Address:127.0.0.1", true],
    ["[::1]", "IP Address:0:0:0:0:0:0:0:1", true],
    ["db.example.test", "DNS:localhost", false],
  ])("binds identity to URL host %s with certificate %s", (host, subjectaltname, matches) => {
    const config = databasePoolConfig({
      DATABASE_URL: `postgres://test:test@${host}/core`,
      DATABASE_TLS_MODE: "verify-full",
    });
    const ssl = config.ssl as ConnectionOptions;
    const certificate = { subject: { CN: "localhost" }, subjectaltname } as PeerCertificate;
    const result = ssl.checkServerIdentity!("localhost", certificate);
    if (matches) expect(result).toBeUndefined();
    else expect(result).toMatchObject({ code: "ERR_TLS_CERT_ALTNAME_INVALID" });
  });
  it("preserves the explicit Railway private-network production configuration", () => {
    expect(new pg.Client(databasePoolConfig(railway)).ssl).toBe(false);
    expect(databasePoolConfig({ ...railway, DATABASE_TLS_MODE: "private" }).ssl).toBe(false);
  });
  it("does not infer private plaintext merely from the hostname", () => {
    expect(
      databasePoolConfig({ ...railway, DATABASE_URL: railway.DATABASE_URL.split("?")[0] }).ssl,
    ).toMatchObject({ rejectUnauthorized: true });
  });
  it.each(["localhost", "127.0.0.1", "[::1]"])("allows local test database %s", (host) => {
    const DATABASE_URL = `postgresql://test:test@${host}/core_test`;
    expect(databasePoolConfig({ DATABASE_URL, NODE_ENV: "test" }).ssl).toBe(false);
    expect(databasePoolConfig({ DATABASE_URL, NODE_ENV: "production" }).ssl).toMatchObject({
      rejectUnauthorized: true,
    });
    expect(() =>
      databasePoolConfig({
        DATABASE_URL: `${DATABASE_URL}?sslmode=disable`,
        NODE_ENV: "production",
      }),
    ).toThrow("loopback development/test");
  });
  it.each([
    { DATABASE_URL: `${remote}?sslmode=disable` },
    { ...railway, RAILWAY_ENVIRONMENT_ID: undefined },
    {
      ...railway,
      DATABASE_URL: "postgres://test:test@evil.railway.internal.example/core?sslmode=disable",
    },
    { DATABASE_URL: remote, DATABASE_TLS_MODE: "private" },
    { DATABASE_URL: remote, DATABASE_TLS_MODE: "no-verify" },
    { DATABASE_URL: remote, PGSSLMODE: "no-verify" },
    { DATABASE_URL: `${remote}?sslmode=require`, DATABASE_TLS_MODE: "private" },
    { ...railway, DATABASE_TLS_MODE: "verify-full" },
    { ...railway, DATABASE_TLS_CA: "test CA" },
  ])("rejects unsafe or conflicting configuration %#", (env) => {
    expect(() => databasePoolConfig(env)).toThrow();
  });
  it.each([
    "sslmode=no-verify",
    "sslmode=prefer",
    "sslmode=verify-ca",
    "sslmode=",
    "sslmode=require&sslmode=disable",
    "ssl=no-verify",
    "sslrootcert=/tmp/ca",
    "sslkey=/tmp/key",
    "sslcert=/tmp/cert",
    "SSLMODE=disable",
    "host=attacker.example",
    "hostaddr=192.0.2.1",
    "uselibpqcompat=true",
  ])("rejects parser overrides %s", (query) => {
    expect(() =>
      databasePoolConfig({
        ...railway,
        DATABASE_URL: `${railway.DATABASE_URL.split("?")[0]}?${query}`,
      }),
    ).toThrow();
  });
  it.each([
    undefined,
    "not a URL synthetic-password",
    "https://user:synthetic-password@example.test/db",
  ])("keeps invalid URL errors credential free %#", (DATABASE_URL) => {
    try {
      databasePoolConfig({ DATABASE_URL });
      expect.fail("must reject invalid URL");
    } catch (error) {
      expect(String(error)).not.toContain("synthetic-password");
      expect(error).toBeInstanceOf(Error);
    }
  });
});
