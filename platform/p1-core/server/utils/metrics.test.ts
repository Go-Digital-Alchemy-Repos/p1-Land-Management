import { describe, expect, it } from "vitest";
import {
  getMetricsSnapshot,
  getPrometheusMetricsSnapshot,
  isMetricsRequestAuthorized,
  recordDomainOutcome,
} from "./metrics";

describe("domain metrics", () => {
  it("records aggregate outcomes without accepting unsafe names or counts", () => {
    const before = getMetricsSnapshot().domains.checkout?.created ?? 0;

    recordDomainOutcome("checkout", "created", 2);
    recordDomainOutcome("checkout", "failed", 1);
    recordDomainOutcome("checkout", "unsafe-value", 1);
    recordDomainOutcome("checkout", "created", 0);

    expect(getMetricsSnapshot().domains.checkout).toMatchObject({
      created: before + 2,
      failed: 1,
    });
    expect(getMetricsSnapshot().domains.checkout).not.toHaveProperty("unsafe-value");
  });

  it("renders stack-labeled Prometheus counters without route metrics", () => {
    recordDomainOutcome("checkout", "created");

    const snapshot = getPrometheusMetricsSnapshot("pilot-acme");

    expect(snapshot).toContain(
      'core_platform_process_uptime_seconds{client_stack_id="pilot-acme"}',
    );
    expect(snapshot).toContain(
      'core_platform_domain_outcomes_total{client_stack_id="pilot-acme",domain="checkout",outcome="created"}',
    );
    expect(snapshot).not.toContain("core_platform_http_requests_total");
  });

  it("requires an opt-in dedicated bearer token in production", () => {
    const env = {
      NODE_ENV: "production",
      METRICS_ENABLED: "true",
      METRICS_BEARER_TOKEN: "a".repeat(32),
    };

    expect(isMetricsRequestAuthorized(`Bearer ${"a".repeat(32)}`, env)).toBe(true);
    expect(isMetricsRequestAuthorized("Bearer incorrect", env)).toBe(false);
    expect(isMetricsRequestAuthorized(undefined, env)).toBe(false);
    expect(isMetricsRequestAuthorized(undefined, { NODE_ENV: "development" })).toBe(true);
  });
});
