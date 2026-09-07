import { timingSafeEqual } from "node:crypto";

interface RouteStat {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
}

interface MetricsStore {
  requests: Map<string, RouteStat>;
  errors: Map<number, number>;
  dbQueries: { count: number; totalMs: number; minMs: number; maxMs: number };
  emailOutcomes: { success: number; failure: number };
  domainOutcomes: Map<string, Map<string, number>>;
  startedAt: number;
}

const store: MetricsStore = {
  requests: new Map(),
  errors: new Map(),
  dbQueries: { count: 0, totalMs: 0, minMs: Infinity, maxMs: 0 },
  emailOutcomes: { success: 0, failure: 0 },
  domainOutcomes: new Map(),
  startedAt: Date.now(),
};

function routeKey(method: string, path: string): string {
  const normalized = path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id")
    .replace(/\/\d+/g, "/:id");
  return `${method} ${normalized}`;
}

export function recordRequest(
  method: string,
  path: string,
  durationMs: number,
  statusCode: number,
) {
  const key = routeKey(method, path);
  const existing = store.requests.get(key) || { count: 0, totalMs: 0, minMs: Infinity, maxMs: 0 };
  existing.count++;
  existing.totalMs += durationMs;
  existing.minMs = Math.min(existing.minMs, durationMs);
  existing.maxMs = Math.max(existing.maxMs, durationMs);
  store.requests.set(key, existing);

  if (statusCode >= 400) {
    store.errors.set(statusCode, (store.errors.get(statusCode) || 0) + 1);
  }
}

export function recordDbQuery(durationMs: number) {
  store.dbQueries.count++;
  store.dbQueries.totalMs += durationMs;
  store.dbQueries.minMs = Math.min(store.dbQueries.minMs, durationMs);
  store.dbQueries.maxMs = Math.max(store.dbQueries.maxMs, durationMs);
}

export function recordEmailOutcome(success: boolean) {
  if (success) {
    store.emailOutcomes.success++;
  } else {
    store.emailOutcomes.failure++;
  }
}

/** Records aggregate operational outcomes without IDs, amounts, or customer data. */
export function recordDomainOutcome(domain: string, outcome: string, count = 1) {
  if (!/^[a-z][a-z0-9_]{0,63}$/.test(domain)) return;
  if (!/^[a-z][a-z0-9_]{0,63}$/.test(outcome)) return;
  if (!Number.isSafeInteger(count) || count < 1) return;
  const outcomes = store.domainOutcomes.get(domain) ?? new Map<string, number>();
  outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + count);
  store.domainOutcomes.set(domain, outcomes);
}

function prometheusEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');
}

function metricLabels(clientStackId: string, extra: Record<string, string> = {}) {
  const labels = { client_stack_id: clientStackId, ...extra };
  return `{${Object.entries(labels)
    .map(([key, value]) => `${key}="${prometheusEscape(value)}"`)
    .join(",")}}`;
}

/**
 * Renders only aggregate, non-route metrics for external monitoring scrapes.
 * Per-route request data remains available in the authenticated JSON snapshot,
 * but is deliberately excluded from this transport to avoid high-cardinality
 * labels and identifier-like path segments.
 */
export function getPrometheusMetricsSnapshot(clientStackId = "unconfigured") {
  const stackId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clientStackId) ? clientStackId : "unconfigured";
  const baseLabels = metricLabels(stackId);
  const lines = [
    "# HELP core_platform_process_uptime_seconds Process uptime in seconds.",
    "# TYPE core_platform_process_uptime_seconds gauge",
    `core_platform_process_uptime_seconds${baseLabels} ${Math.floor((Date.now() - store.startedAt) / 1000)}`,
    "# HELP core_platform_db_queries_total Database queries observed by the application.",
    "# TYPE core_platform_db_queries_total counter",
    `core_platform_db_queries_total${baseLabels} ${store.dbQueries.count}`,
    "# HELP core_platform_email_outcomes_total Aggregate transactional email outcomes.",
    "# TYPE core_platform_email_outcomes_total counter",
    `core_platform_email_outcomes_total${metricLabels(stackId, { outcome: "success" })} ${store.emailOutcomes.success}`,
    `core_platform_email_outcomes_total${metricLabels(stackId, { outcome: "failure" })} ${store.emailOutcomes.failure}`,
    "# HELP core_platform_http_errors_total Aggregate HTTP errors by status code.",
    "# TYPE core_platform_http_errors_total counter",
  ];

  for (const [statusCode, count] of store.errors) {
    lines.push(
      `core_platform_http_errors_total${metricLabels(stackId, { status_code: String(statusCode) })} ${count}`,
    );
  }

  lines.push(
    "# HELP core_platform_domain_outcomes_total Aggregate client-domain operational outcomes.",
    "# TYPE core_platform_domain_outcomes_total counter",
  );
  for (const [domain, outcomes] of store.domainOutcomes) {
    for (const [outcome, count] of outcomes) {
      lines.push(
        `core_platform_domain_outcomes_total${metricLabels(stackId, { domain, outcome })} ${count}`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

function hasMatchingMetricsBearerToken(authorization: string | undefined, expectedToken: string) {
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  if (!match) return false;
  const supplied = Buffer.from(match[1]);
  const expected = Buffer.from(expectedToken);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

/**
 * Production metrics are opt-in and require a dedicated bearer token. Local
 * development retains unauthenticated access for tooling and debugging.
 */
export function isMetricsRequestAuthorized(
  authorization: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (env.NODE_ENV !== "production") return true;
  if (env.METRICS_ENABLED !== "true") return false;
  const token = env.METRICS_BEARER_TOKEN?.trim();
  return Boolean(token && hasMatchingMetricsBearerToken(authorization, token));
}

export function getMetricsSnapshot() {
  const routes: Record<string, { count: number; avgMs: number; minMs: number; maxMs: number }> = {};
  store.requests.forEach((stat, key) => {
    routes[key] = {
      count: stat.count,
      avgMs: Math.round(stat.totalMs / stat.count),
      minMs: stat.minMs === Infinity ? 0 : stat.minMs,
      maxMs: stat.maxMs,
    };
  });

  const errors: Record<string, number> = {};
  store.errors.forEach((count, code) => {
    errors[String(code)] = count;
  });

  const domains: Record<string, Record<string, number>> = {};
  store.domainOutcomes.forEach((outcomes, domain) => {
    domains[domain] = Object.fromEntries(outcomes.entries());
  });

  return {
    uptimeSeconds: Math.floor((Date.now() - store.startedAt) / 1000),
    requests: routes,
    errors,
    dbQueries: {
      count: store.dbQueries.count,
      avgMs:
        store.dbQueries.count > 0 ? Math.round(store.dbQueries.totalMs / store.dbQueries.count) : 0,
      minMs: store.dbQueries.minMs === Infinity ? 0 : store.dbQueries.minMs,
      maxMs: store.dbQueries.maxMs,
    },
    email: { ...store.emailOutcomes },
    domains,
  };
}
