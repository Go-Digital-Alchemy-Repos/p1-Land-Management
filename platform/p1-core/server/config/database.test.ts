import { describe, expect, it } from "vitest";
import pg from "pg";
import { X509Certificate } from "node:crypto";
import type { ConnectionOptions, PeerCertificate } from "node:tls";
import { databasePoolConfig } from "./database";

// Public synthetic certificates only; no private key or network is needed.
// checkIP tests identity only. TLS chain verification is asserted separately.
const ipv6Certificate = new X509Certificate(`-----BEGIN CERTIFICATE-----
MIIC2zCCAcOgAwIBAgIJAMkyjJomzqH0MA0GCSqGSIb3DQEBCwUAMA4xDDAKBgNV
BAMMAzo6MTAeFw0yNjA5MDcxMDA5MTlaFw0yNjA5MDgxMDA5MTlaMA4xDDAKBgNV
BAMMAzo6MTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALwDAnx4x6Ae
ieKoN1JNgv4avg5D7PXf/D9+JtKYJPgppDJqETJ00xzqcFwcl9g9op9XdjsFO/ra
GopFrQJ6N6So8y1afQ8yxH+ZnyQPRPFHXu/eTf8pYAP2V3db4IvEWNtZHSQiZ6FG
AetUf824J0FG0v1CqqnwQxAq4h0n1eY7ycmcFgPhbVQpgC6cLUQ7maL6Gyxb8j3f
McyvQ6jpdvmImb5Blv4UXPTr97aUsZ7v8kCYaU9kBvEtNZ7oAG1Ce9sRcoEPMogb
qfdq/LAOrhVnmoyu4CJLo4XWHZkrwgadterzReHFl6F3CuHgDnlBvVrBXy8Fatfm
E9QcfzqmaqkCAwEAAaM8MDowOAYDVR0RBDEwL4cQAAAAAAAAAAAAAAAAAAAAAYcQ
IAENuAAAAAAAAAAAAAAAAYIJbG9jYWxob3N0MA0GCSqGSIb3DQEBCwUAA4IBAQCk
Aj9IjHKXj9l6/S91Q7Nm1FB10kDBV+VbXLnoDgvlQ2WVRYJa4DvNVWsp2IwvGT1N
xNO4RFVfJ+swnGtHuhvLq6YrkqRLSTGuvZ5HW+RaQ/jgvSlVAhUb8pLD0oOT/coI
IQXRnIy7D6qRh5xRdLPhemgci/KPH7HLsfYRbjaLdb3Dvbk416Fzqu0TeaUjmmtp
n5Xx32NtLGwAZ9WASiTdMU59KLqfr9wLAHRCpsVLivpoHPsPSqbjDu5HziJPXkD1
8dAuIvs+DjUo0BuAITP0g3xu2bI1O7eGEqmVYY7frfyOJJICp+wH4KLTfdBhqZWd
gdrdSqZWLeQ67t3894Fc
-----END CERTIFICATE-----
`).raw;
const dnsOnlyCertificate = new X509Certificate(`-----BEGIN CERTIFICATE-----
MIICtzCCAZ+gAwIBAgIJAPRaj+rcGLDUMA0GCSqGSIb3DQEBCwUAMA4xDDAKBgNV
BAMMAzo6MTAeFw0yNjA5MDcxMDA5MTlaFw0yNjA5MDgxMDA5MTlaMA4xDDAKBgNV
BAMMAzo6MTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAL7Mt2C/zFZm
PbX4PACz5xFccEG98G5/A2SV39/BMlg/vsn+avvjLCgIk8JrgxeQDwK4AhQ7oQkZ
DWCirU8FsERstjKmNw6/5UsiGZfbjliKhDK7ZE67LtomxrQBf74rfQkr17gHLmbl
lvwzSshlK9Nqx5kBwo80nbGgCoNqz7k/9QeQ/l3pArZT7Pxlry0VLzgBAyqqLKnM
7kqoonXnyVWvtXKF/haoRgVBIUcXivQoN7yNsHXCFZw7KoctAFZk9pADwDe/FUhA
coKAB6hXGSdFULf/OC07PdkY347PIM6OkpWD35P7Rx1h6Wh3fW1t6xfP2LBqEiO4
grHb+kkma50CAwEAAaMYMBYwFAYDVR0RBA0wC4IJbG9jYWxob3N0MA0GCSqGSIb3
DQEBCwUAA4IBAQBWXqqLO0R0G7tvGHZaOI042UHKtFvu88lLvi9OstjniLT7ATxg
nEm6HdAqsjiUN/3l74Sooyrka3lR571h59DztUvrsTCnFpq41LcMTs3CE/rkj0VQ
DpexzqrOQbATAc6CVDyV4jG9yyotOJixApfMQhYi4jCLixPLYTQfTta0ZktjmilR
hYmEG55k8wGpGb2lb1QShrrXLvyg93fQKXNHlfLMICn++SgfOQU1fF30or+FE3Nm
bQbqUNA08uFr99xpFwG0nUmN9DQtLGFvFn1wpDmLUS7rgN/b7RJYAzb+SgGUJ4tz
ThGuJ2lSf0CnmRhMVQ+LPsAVnGeEAfk2TnKa
-----END CERTIFICATE-----
`).raw;
const noSanCertificate = new X509Certificate(`-----BEGIN CERTIFICATE-----
MIICmDCCAYACCQD1VNFGeSATszANBgkqhkiG9w0BAQsFADAOMQwwCgYDVQQDDAM6
OjEwHhcNMjYwOTA3MTAxMDE5WhcNMjYwOTA4MTAxMDE5WjAOMQwwCgYDVQQDDAM6
OjEwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDgFaoFbsqYMNCfTS8j
EFCAkh3WS10SYwGmqXAXxvLEknTt3eDWq9kKqPU8xtyGTnh7gyLXKiYB4A32hTsJ
WAV3XsU4nz+DeYFXj0qF6hCZgNo8fvU3/uExvvytcW81i/A1jbg4UzDmO4MX8dxi
Y2p7qKGBB6alWwarz5KsF6jalXJVW295rxm0uG2NuWG4bK4+evzxmrdmMbAvAsXJ
qweR4iohEtrbb3uoaA8zVdwcv30jlEKbzb2cOtdR5LTw5tFF2GfZEHleUlHGmX41
li37oWykJidNoyE0gSRv77TQ0pKjJmNCwCr7c0T88hUqAekO/62wwd8Iaj9q8RUe
EoxdAgMBAAEwDQYJKoZIhvcNAQELBQADggEBAF3fH24kVb9CG3nJcxDZVHUVrz3U
BrSdp9y7DLZGr3Z6VmlPaiF7ag0UHEf4bq36mu2FfGKxl+qnjV+/var339Lx2Y/l
U2FOhrg/2hf5XUGjbbOwEK+CaSpFa+06mz22BqhPoywF7vl1Z0CO4OHFZMe02TWa
IGO/zjhBqccg/E3aBvB9+pQHrCJRSh3902x9synb8T3yiJQ/FeZxRhImzqM5mkkC
p/Qo/klPGTzy2urE3aU9GOJ3Z7/7QCm4WbD/MRWfx10fRGc5zz+GZbnUyX1qDpC9
j0hqgNgdwKL4C3ZgeoEShhl4S7i/aU1eGUwU5AWO8PcZciICjvynKXDSqv0=
-----END CERTIFICATE-----
`).raw;

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
  it.each(["[::1]", "[0:0:0:0:0:0:0:1]", "[2001:db8::1]"])(
    "accepts only a matching real IPv6 IP SAN for URL host %s",
    (host) => {
      const config = databasePoolConfig({
        DATABASE_URL: `postgres://test:test@${host}:5444/core?sslmode=verify-full&application_name=ipv6-test`,
        NODE_ENV: "production",
      });
      const ssl = config.ssl as ConnectionOptions;
      expect(ssl.rejectUnauthorized).toBe(true);
      expect(new pg.Client(config).ssl).toMatchObject({ rejectUnauthorized: true });
      expect(new URL(config.connectionString!).port).toBe("5444");
      expect(new URL(config.connectionString!).searchParams.get("application_name")).toBe(
        "ipv6-test",
      );
      expect(new URL(config.connectionString!).searchParams.has("sslmode")).toBe(false);
      expect(
        ssl.checkServerIdentity!("wrong-socket-host.test", {
          raw: ipv6Certificate,
        } as PeerCertificate),
      ).toBeUndefined();
    },
  );
  it.each([
    ["[::2]", ipv6Certificate],
    ["[2001:db8::2]", ipv6Certificate],
    ["[::1]", dnsOnlyCertificate],
    ["[::1]", noSanCertificate],
    ["[::1]", Buffer.from("malformed certificate")],
    ["[::1]", undefined],
  ])("rejects IPv6 mismatch or unusable certificate %#", (host, raw) => {
    const config = databasePoolConfig({
      DATABASE_URL: `postgres://test:test@${host}/core`,
      DATABASE_TLS_MODE: "verify-full",
    });
    // Neither forged legacy fields nor the socket hostname may override raw IP SANs.
    const certificate = {
      raw,
      subject: { CN: "::1" },
      subjectaltname: "IP Address:0:0:0:0:0:0:0:1",
    } as PeerCertificate;
    const ssl = config.ssl as ConnectionOptions;
    expect(ssl.rejectUnauthorized).toBe(true);
    expect(ssl.checkServerIdentity!("::1", certificate)).toMatchObject({
      code: "ERR_TLS_CERT_ALTNAME_INVALID",
    });
  });
  it.each(["::1", "[::gg]", "[::1", "[fe80::1%25eth0]"])(
    "rejects malformed IPv6 URL authority %s",
    (host) => {
      expect(() =>
        databasePoolConfig({
          DATABASE_URL: `postgres://test:test@${host}/core`,
          DATABASE_TLS_MODE: "verify-full",
        }),
      ).toThrow("valid PostgreSQL URL");
    },
  );
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
