import { useEffect, useRef, useState } from "react";
import {
  createOnboardingPlan,
  verifyOnboardingDns,
  evaluateOnboardingReadiness,
  getOnboardingEvidence,
} from "@workspace/api-client-react/dashboard";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
type Plan = Awaited<ReturnType<typeof createOnboardingPlan>>;
type Checks = Parameters<typeof evaluateOnboardingReadiness>[0]["checks"];
const labels: Record<keyof Checks, string> = {
  ownership: "Domain ownership",
  authoritativeDns: "Authoritative DNS",
  certificate: "HTTPS certificate",
  publicRouting: "Public routing",
  adminRouting: "Dashboard routing",
  sameOriginApi: "Same-origin /api behavior",
  applicationHealth: "Application readiness",
  canonicalRedirect: "Canonical redirect",
  rollbackPlan: "Rollback plan",
};
const initial = {
  stackId: "",
  publicDomain: "",
  adminDomain: "",
  publicTarget: "",
  wwwTarget: "",
  adminTarget: "",
  dnsOperator: "",
  launchOwner: "",
};
export default function ClientStackOnboarding() {
  const [values, setValues] = useState(initial),
    [canonical, setCanonical] = useState<"apex" | "www">("www"),
    [apex, setApex] = useState<"A" | "AAAA" | "ALIAS" | "ANAME">("ALIAS");
  const [plan, setPlan] = useState<Plan | null>(null),
    [dns, setDns] = useState<Awaited<
      ReturnType<typeof verifyOnboardingDns>
    > | null>(null),
    [readiness, setReadiness] = useState<Awaited<
      ReturnType<typeof evaluateOnboardingReadiness>
    > | null>(null);
  const [checks, setChecks] = useState<Checks>(
    Object.fromEntries(
      Object.keys(labels).map((key) => [key, "pending"]),
    ) as Checks,
  );
  const [evidenceId, setEvidenceId] = useState(""),
    [evidence, setEvidence] = useState<Awaited<
      ReturnType<typeof getOnboardingEvidence>
    > | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [checksDirty, setChecksDirty] = useState(false);
  const gate = useRef(false),
    alive = useRef(true),
    controller = useRef<AbortController | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);
  useCmsUnsavedChanges(
    dirty || checksDirty,
    "Leave onboarding? Unrecorded form changes will be lost.",
  );
  async function run(
    work: (options: { signal: AbortSignal }) => Promise<void>,
  ) {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    try {
      await work({
        signal: AbortSignal.any([
          controller.current.signal,
          AbortSignal.timeout(30000),
        ]),
      });
    } catch (e) {
      if (alive.current)
        setError(
          `${e instanceof Error ? e.message : "Operation failed"}. Inputs are retained. For an uncertain recording, inspect saved evidence before submitting again.`,
        );
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const field = (key: keyof typeof values, label: string, placeholder = "") => (
    <label key={key}>
      {label}
      <input
        required
        value={values[key]}
        placeholder={placeholder}
        disabled={busy}
        maxLength={key === "stackId" ? 120 : 253}
        onChange={(e) => {
          setValues({ ...values, [key]: e.target.value });
          setDirty(true);
        }}
      />
    </label>
  );
  return (
    <div className="onboarding-workspace">
      <p className="muted">
        Prepare a manual domain plan, check public DNS, and record launch
        evidence. These actions save evidence; they do not change DNS, configure
        hosting, or authorize a release.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Domain plan</h2>
            <p>
              Use approved hostnames and targets. Record existing DNS values
              before making changes at your provider.
            </p>
          </div>
        </div>
        <form
          className="profile-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async (options) => {
              const result = await createOnboardingPlan(
                {
                  stackId: values.stackId,
                  publicDomain: values.publicDomain,
                  adminDomain: values.adminDomain,
                  canonicalHost: canonical,
                  publicRecords: [
                    {
                      host: "@",
                      type: apex,
                      value: values.publicTarget,
                      ttl: 300,
                      proxyMode: "provider-managed",
                    },
                    {
                      host: "www",
                      type: "CNAME",
                      value: values.wwwTarget,
                      ttl: 300,
                      proxyMode: "provider-managed",
                    },
                  ],
                  adminRecord: {
                    type: "CNAME",
                    value: values.adminTarget,
                    ttl: 300,
                    proxyMode: "dns-only",
                  },
                  dnsOperator: values.dnsOperator,
                  launchOwner: values.launchOwner,
                  routingMode: "same-origin-proxy",
                },
                options,
              );
              if (!alive.current) return;
              setPlan(result);
              setDns(null);
              setReadiness(null);
              setEvidence(null);
              setEvidenceId(result.stackId);
              setChecks(
                Object.fromEntries(
                  Object.keys(labels).map((key) => [key, "pending"]),
                ) as Checks,
              );
              setDirty(false);
              setChecksDirty(false);
            });
          }}
        >
          <div className="onboarding-fields">
            {field("stackId", "Client stack ID", "p1-land-management")}
            {field(
              "publicDomain",
              "Public apex domain",
              "p1landmanagement.com",
            )}
            {field(
              "adminDomain",
              "Dashboard domain",
              "dashboard.p1landmanagement.com",
            )}
            {field(
              "publicTarget",
              "Apex record value",
              "IP address or provider hostname",
            )}
            {field(
              "wwwTarget",
              "www CNAME target",
              "public-site.up.railway.app",
            )}
            {field(
              "adminTarget",
              "Dashboard CNAME target",
              "dashboard.up.railway.app",
            )}
            {field("dnsOperator", "Manual DNS operator")}
            {field("launchOwner", "Launch owner")}
            <label>
              Apex record type
              <select
                value={apex}
                disabled={busy}
                onChange={(e) => {
                  setApex(e.target.value as typeof apex);
                  setDirty(true);
                }}
              >
                {["A", "AAAA", "ALIAS", "ANAME"].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label>
              Canonical public host
              <select
                value={canonical}
                disabled={busy}
                onChange={(e) => {
                  setCanonical(e.target.value as typeof canonical);
                  setDirty(true);
                }}
              >
                <option value="www">www</option>
                <option value="apex">Apex</option>
              </select>
            </label>
          </div>
          <button className="primary" disabled={busy}>
            Generate and record plan
          </button>
        </form>
      </section>
      {plan && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Plan for {plan.stackId}</h2>
              <p>
                {plan.publicOrigin} · {plan.adminOrigin}
              </p>
            </div>
          </div>
          <div className="profile-form">
            <p role="status">
              Recorded {new Date(plan.evidence.recordedAt).toLocaleString()}
            </p>
            {[
              ["Manual DNS instructions", plan.manualInstructions],
              ["Rollback preparation", plan.rollbackInstructions],
              ["Required verification", plan.requiredVerification],
            ].map(([title, items]) => (
              <div key={title as string}>
                <h3>{title}</h3>
                <ol>
                  {(items as string[]).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>
            ))}
            <p>
              Verification queries public DNS and saves the observed answers.
              ALIAS/ANAME records require manual provider evidence.
            </p>
            <button
              disabled={busy}
              onClick={() =>
                void run(async (options) => {
                  const result = await verifyOnboardingDns(
                    {
                      stackId: plan.stackId,
                      records: plan.records.map(({ fqdn, type, value }) => ({
                        fqdn,
                        type,
                        value,
                      })),
                    },
                    options,
                  );
                  if (alive.current) setDns(result);
                })
              }
            >
              Verify and record published DNS
            </button>
            {dns && (
              <div role="status">
                <h3>DNS: {dns.status}</h3>
                {dns.records.map((record) => (
                  <p key={`${record.fqdn}-${record.type}`}>
                    <strong>
                      {record.fqdn} ({record.type}): {record.status}
                    </strong>
                    <br />
                    {record.message}
                    <br />
                    Expected: {record.expectedValue}
                    {record.observedValues.length > 0 && (
                      <> · Observed: {record.observedValues.join(", ")}</>
                    )}
                  </p>
                ))}
              </div>
            )}
            <h3>Launch readiness</h3>
            <p>
              Record observations for this plan. A “ready” result is not
              deployment authorization.
            </p>
            <div className="onboarding-fields">
              {Object.entries(labels).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <select
                    disabled={busy}
                    value={checks[key as keyof Checks]}
                    onChange={(e) => {
                      setChecks({ ...checks, [key]: e.target.value });
                      setChecksDirty(true);
                      setReadiness(null);
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                  </select>
                </label>
              ))}
            </div>
            <button
              disabled={busy}
              onClick={() =>
                void run(async (options) => {
                  const result = await evaluateOnboardingReadiness(
                    { stackId: plan.stackId, checks },
                    options,
                  );
                  if (alive.current) {
                    setReadiness(result);
                    setChecksDirty(false);
                  }
                })
              }
            >
              Evaluate and record readiness
            </button>
            {readiness && (
              <div role="status">
                <h3>Readiness: {readiness.status}</h3>
                <p>Passed: {readiness.passed.join(", ") || "None"}</p>
                <p>Pending: {readiness.pending.join(", ") || "None"}</p>
                <p>Failed: {readiness.failed.join(", ") || "None"}</p>
              </div>
            )}
          </div>
        </section>
      )}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Saved evidence</h2>
            <p>Read previous evidence without generating a new plan.</p>
          </div>
        </div>
        <form
          className="profile-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async (options) => {
              const result = await getOnboardingEvidence(evidenceId, options);
              if (alive.current) setEvidence(result);
            });
          }}
        >
          <label>
            Evidence stack ID
            <input
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              maxLength={120}
              disabled={busy}
              value={evidenceId}
              onChange={(e) => {
                setEvidenceId(e.target.value);
                setEvidence(null);
              }}
            />
          </label>
          <button disabled={busy}>Load saved evidence</button>
          {evidence && (
            <div>
              {evidence.length === 0 ? (
                <p role="status">No evidence recorded for this stack.</p>
              ) : (
                evidence.map((record) => (
                  <details key={record.id}>
                    <summary>
                      {record.kind.replaceAll("_", " ")} ·{" "}
                      {new Date(record.recordedAt).toLocaleString()}
                    </summary>
                    <p>
                      Recorded by:{" "}
                      {record.recordedByUserId || "Historical record"}
                    </p>
                    <pre className="onboarding-evidence">
                      {JSON.stringify(record.payload, null, 2)}
                    </pre>
                  </details>
                ))
              )}
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
