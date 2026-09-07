import { describe, expect, it } from "vitest";
import {
  createClientStackDomainPlan,
  clientStackDnsVerificationEvidenceSchema,
  clientStackReadinessEvidenceSchema,
  evaluateClientStackReadiness,
  verifyClientStackDnsRecords,
} from "./client-stack-onboarding.service";

const input = {
  stackId: "better-farms-foundation",
  publicDomain: "betterfarms.org",
  adminDomain: "dashboard.betterfarms.org",
  canonicalHost: "www" as const,
  publicRecords: [
    {
      host: "@" as const,
      type: "ALIAS" as const,
      value: "public.host.example",
      ttl: 300,
      proxyMode: "provider-managed" as const,
    },
    {
      host: "www" as const,
      type: "CNAME" as const,
      value: "public.host.example",
      ttl: 300,
      proxyMode: "provider-managed" as const,
    },
  ],
  adminRecord: {
    type: "CNAME" as const,
    value: "core.railway.app",
    ttl: 300,
    proxyMode: "dns-only" as const,
  },
  dnsOperator: "DNS operator",
  launchOwner: "Launch owner",
  routingMode: "same-origin-proxy" as const,
};

describe("client stack onboarding", () => {
  it("creates deterministic credential-free manual DNS instructions", () => {
    const plan = createClientStackDomainPlan(input);
    expect(plan).toMatchObject({
      stackId: "better-farms-foundation",
      publicOrigin: "https://www.betterfarms.org",
      adminOrigin: "https://dashboard.betterfarms.org",
      routingMode: "same-origin-proxy",
      storage: {
        bucketName: "core-platform-website-backups",
        clientPrefix: "clients/betterfarms.org",
        backupPrefix: "clients/betterfarms.org/backups",
        uploadPrefix: "clients/betterfarms.org/uploads",
      },
    });
    expect(plan.records.map((record) => record.fqdn)).toEqual([
      "betterfarms.org",
      "www.betterfarms.org",
      "dashboard.betterfarms.org",
    ]);
    expect(plan.manualInstructions.join(" ")).not.toContain("credential");
    expect(plan.rollbackInstructions).toHaveLength(3);
  });

  it("rejects an unsafe apex CNAME and a non-dashboard host", () => {
    expect(() =>
      createClientStackDomainPlan({
        ...input,
        adminDomain: "admin.betterfarms.org",
        publicRecords: [{ ...input.publicRecords[0], type: "CNAME" }, input.publicRecords[1]],
      }),
    ).toThrow();
  });

  it("requires literal addresses for A and AAAA records and hostnames for aliases", () => {
    expect(() =>
      createClientStackDomainPlan({
        ...input,
        publicRecords: [{ ...input.publicRecords[0], type: "A" }, input.publicRecords[1]],
      }),
    ).toThrow(/A records require a literal IPv4 address/);
    expect(() =>
      createClientStackDomainPlan({
        ...input,
        publicRecords: [
          { ...input.publicRecords[0], type: "A", value: "203.0.113.10" },
          { ...input.publicRecords[1], type: "CNAME", value: "203.0.113.11" },
        ],
      }),
    ).toThrow(/CNAME records require a public DNS hostname target/);
  });

  it("keeps pending propagation distinct from a failed release gate", () => {
    expect(
      evaluateClientStackReadiness({
        ownership: "pass",
        authoritativeDns: "pending",
        certificate: "pending",
        publicRouting: "pending",
        adminRouting: "pending",
        sameOriginApi: "pending",
        applicationHealth: "pass",
        canonicalRedirect: "pending",
        rollbackPlan: "pass",
      }),
    ).toMatchObject({ status: "pending", failed: [] });
    expect(
      evaluateClientStackReadiness({
        ownership: "pass",
        authoritativeDns: "pass",
        certificate: "pass",
        publicRouting: "pass",
        adminRouting: "pass",
        sameOriginApi: "fail",
        applicationHealth: "pass",
        canonicalRedirect: "pass",
        rollbackPlan: "pass",
      }),
    ).toMatchObject({ status: "blocked", failed: ["Same-origin /api behavior"] });
  });

  it("checks standard DNS records through an injected read-only resolver", async () => {
    const result = await verifyClientStackDnsRecords(
      {
        records: [
          { fqdn: "www.betterfarms.org", type: "A", value: "203.0.113.10" },
          { fqdn: "admin.betterfarms.org", type: "CNAME", value: "core.railway.app" },
        ],
      },
      {
        resolve4: async () => ["203.0.113.10"],
        resolve6: async () => [],
        resolveCname: async () => ["core.railway.app."],
      },
    );

    expect(result.status).toBe("ready");
    expect(result.records.map((record) => record.status)).toEqual(["passed", "passed"]);
  });

  it("binds persisted verification evidence to a validated client stack", () => {
    expect(
      clientStackDnsVerificationEvidenceSchema.parse({
        stackId: input.stackId,
        records: [{ fqdn: "www.betterfarms.org", type: "A", value: "203.0.113.10" }],
      }),
    ).toMatchObject({ stackId: input.stackId });
    expect(() =>
      clientStackReadinessEvidenceSchema.parse({
        stackId: "not a stack id",
        checks: {
          ownership: "pass",
          authoritativeDns: "pass",
          certificate: "pass",
          publicRouting: "pass",
          adminRouting: "pass",
          sameOriginApi: "pass",
          applicationHealth: "pass",
          canonicalRedirect: "pass",
          rollbackPlan: "pass",
        },
      }),
    ).toThrow();
  });

  it("keeps unresolved and provider-specific DNS records pending while flagging mismatches", async () => {
    const pendingError = Object.assign(new Error("not found"), { code: "ENOTFOUND" });
    const result = await verifyClientStackDnsRecords(
      {
        records: [
          { fqdn: "www.betterfarms.org", type: "AAAA", value: "2001:db8::10" },
          { fqdn: "betterfarms.org", type: "ALIAS", value: "public.host.example" },
          { fqdn: "admin.betterfarms.org", type: "CNAME", value: "core.railway.app" },
        ],
      },
      {
        resolve4: async () => [],
        resolve6: async () => Promise.reject(pendingError),
        resolveCname: async () => ["unexpected.example"],
      },
    );

    expect(result.status).toBe("blocked");
    expect(result.records.map((record) => record.status)).toEqual([
      "pending",
      "manual-review",
      "failed",
    ]);
  });
});
