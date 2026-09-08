# Security Review: P1 Land Mangement

## Scope

Bounded source-led security audit of current P1 worktree; production-boundary and developer configuration focus.

- Scan mode: repository
- Target kind: git_worktree
- Target ID: target_sha256_5a042267d09e22854b0798ed0983178627fb4356131b4aa6b540d200beb25d75
- Revision: 6ae56f8541020891e030c99d485aa10af260cd37
- Snapshot digest: codex-security-snapshot/v1:sha256:8377a67e2ca22975deaebe4eb5764b86f6bb9b5903737ded62ad0a90d1be7af9
- Inventory strategy: repository
- Included paths: .
- Excluded paths: none
- Runtime or test status: not recorded

Limitations and exclusions:

- Coverage partial; not an exhaustive dependency or all-files scan.
- No independent baseline due to occupied worker slots.
- Excluded external-runtime-and-git-history: No production/network access, form submissions, exploit execution, registry advisory lookup, Git-history scan or deployment credential inspection.

### Scan Summary

| Field               | Value                       |
| ------------------- | --------------------------- |
| Scan outcome        | completed                   |
| Reportable findings | 1                           |
| Severity mix        | low: 1                      |
| Confidence mix      | high: 1                     |
| Coverage            | partial                     |
| Validation mode     | offline static source trace |

Canonical artifacts: `scan-manifest.json`, `findings.json`, and `coverage.json`. This report is a deterministic projection of those files.

## Threat Model

P1 is a React/Vite marketing site prerendered to static HTML and served by Vite preview through Railway Docker (Dockerfile:12-17; artifacts/p1-website/package.json:8-10). Contact data is handed to the visitor's mail client, not an application backend (artifacts/p1-website/src/pages/contact.tsx:23-47). A separate Express starter exposes healthz only (artifacts/api-server/src/routes/health.ts:7-10).

### Assets

- Developer workspace source and unreleased mockups.
- Public website availability and content integrity.
- Prospect contact details, delivered through the user's mail application.

### Trust Boundaries

- Untrusted HTTP Host headers -\> development Vite servers with all-interface binding and host checks disabled (artifacts/p1-website/vite.config.ts:49-56; artifacts/mockup-sandbox/vite.config.ts:46-52).
- Visitor form input -\> encodeURIComponent -\> mailto handoff to fixed business email (artifacts/p1-website/src/pages/contact.tsx:23-47).
- Repository-maintainer content -\> prerender HTML with escaping and JSON-LD less-than escaping (artifacts/p1-website/scripts/prerender.mjs:77-87).
- Docker build context -\> full runtime image via COPY . . (Dockerfile:12); no .dockerignore observed.

### Attacker Capabilities

- Remote web visitor can choose URLs, Host headers and form fields; no authenticated accounts or write API are implemented.
- A malicious website can attempt DNS rebinding against a developer's running HTTP server; browser and network restrictions may prevent that path.
- No attacker control of repository, deployment credentials, DATABASE_URL or trusted build inputs is assumed.

### Security Objectives

- Protect developer source from cross-origin reading.
- Preserve integrity and availability of public content and reliable, private handling of future server-side leads.
- Exclude unnecessary source, tools and local secrets from the runtime image.

### Assumptions

- Offline source-only review; no production access, forms, network advisory database, application execution or runtime exploit testing.
- Current dirty worktree preserved; baseline 6ae56f8541020891e030c99d485aa10af260cd37.
- Production deployment, proxy header policy, secrets and authentication at Railway not inspected.
- Available worker slots exhausted; baseline and architecture passes performed sequentially, not independently.

## Findings

| Finding                                                         | Severity | Confidence | Detailed write-up |
| --------------------------------------------------------------- | -------- | ---------- | ----------------- |
| [Development servers accept arbitrary Host headers](#finding-1) | low      | high       | inline below      |

### Confidence Scale

| Label  | Meaning                                                                                  |
| ------ | ---------------------------------------------------------------------------------------- |
| high   | Direct evidence supports the finding with no material unresolved blocker.                |
| medium | Evidence supports a plausible issue, but material runtime or reachability proof remains. |
| low    | Evidence is incomplete and the item is retained only for explicit follow-up.             |

<a id="finding-1"></a>

### [1] Development servers accept arbitrary Host headers

**Status: remediated.** The public-site and mockup Vite configs now default to
loopback binding and a local Host allowlist. Controlled remote previews require
an explicit binding and hostname allowlist. The historical evidence below
describes the configuration present when this audit was written.

| Field                | Value                                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity             | low                                                                                                                                                             |
| Confidence           | high                                                                                                                                                            |
| Confidence rationale | Both repository configs explicitly set allowedHosts:true; installed Vite source confirms this bypasses host validation. Runtime exploitation was not attempted. |
| Category             | security-misconfiguration                                                                                                                                       |
| CWE                  | CWE-346                                                                                                                                                         |
| Affected lines       | artifacts/p1-website/vite.config.ts:53, artifacts/mockup-sandbox/vite.config.ts:49                                                                              |

#### Summary

Opening a malicious website while a P1 development server is running can expose workspace source through DNS rebinding when the browser and network permit it. Both development configs disable Vite's Host-header protection.

#### Root Cause

Both development entry points bind to all interfaces and set allowedHosts to true. Vite consumes that boolean by omitting host-validation middleware, so requests bearing an attacker-controlled hostname can reach development source serving. Filesystem strict mode limits reachable files but does not restore origin validation.

**Public-site development server disables host checks** — `artifacts/p1-website/vite.config.ts:49-56`

An attacker-controlled Host value is accepted by the all-interface HTTP development server; filesystem strict mode limits file scope but does not validate the browser origin.

```
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
```

**Mockup server disables the same control** — `artifacts/mockup-sandbox/vite.config.ts:46-52`

The mockup development server also accepts arbitrary Host values and can serve unreleased source under a rebound attacker origin.

```
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
```

#### Validation

Inspected both complete Vite configs and installed Vite 7.3.3 config.js:25616; middleware installation is guarded by allowedHosts !== true. Confirmed development scripts invoke Vite with these configs. No application or exploit was run.

Validation method: static source trace

**Public-site development server disables host checks** — `artifacts/p1-website/vite.config.ts:49-56`

An attacker-controlled Host value is accepted by the all-interface HTTP development server; filesystem strict mode limits file scope but does not validate the browser origin.

```
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
```

**Mockup server disables the same control** — `artifacts/mockup-sandbox/vite.config.ts:46-52`

The mockup development server also accepts arbitrary Host values and can serve unreleased source under a rebound attacker origin.

```
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
```

Limitations:

- Browser local-network protections, DNS behavior, developer browsing and server reachability govern exploitability.
- The production preview serves built public files; this finding concerns development source confidentiality.

#### Dataflow

Attacker Host header -\> disabled Vite Host-validation middleware -\> development source serving.

- **Source:** attacker-controlled Host header

- **Sink:** Vite development source response

- **Outcome:** source readable through attacker origin

#### Reachability

Requires a running development server and successful browser/network rebinding; no privileged account required.

- **Attacker:** malicious website operator

- **Entry point:** HTTP development server

- **Outcome:** disclosure of development-served source

#### Severity

**Low** — Conditional developer-only source disclosure requires a running HTTP development server and successful browser/network rebinding. No production secret access or code execution established.

Additional runtime or deployment evidence could raise or lower this severity.

Impact assessment:

- **Level:** medium
- **Why:** Workspace source or unreleased mockups may be read; no secrets or host execution established.

Likelihood assessment:

- **Level:** low
- **Why:** Requires developer interaction and a permissive browser/network path.

#### Remediation

Restore Vite Host validation in both development configs, default to loopback binding, and explicitly allow only controlled development hostnames when remote previews are required.

Tests:

- With each dev config, an unrecognized Host header returns 403 while localhost and explicitly configured development hosts still work.
- Verify remote preview requirements with a narrow controlled hostname allowlist; do not use allowedHosts:true.

Preventive controls:

- Keep development servers private and separate from the public static production server.

## Reviewed Surfaces

| Surface                              | Risk Area    | Outcome         | Notes                                                                                                                                                                                                                                                  |
| ------------------------------------ | ------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Development host/origin boundary     | not recorded | Reported        | Both development configs disable host validation. Installed Vite consumer inspected.                                                                                                                                                                   |
| Contact handoff and API              | not recorded | No issue found  | Full contact form and all Express routes reviewed. URI-encoded mailto fields do not reach SQL or HTML. Public healthz is the only route; wildcard CORS does not expose a protected resource here.                                                      |
| HTML generation and frontend sinks   | not recorded | No issue found  | SEO component, head collector, renderer, prerender script, routing, schema helpers and chart helper reviewed. HTML and JSON-LD escaping are present; chart config has no untrusted caller established. API bearer getter has no application call site. |
| Container and build trust boundaries | not recorded | Needs follow-up | Dockerfile copies the full context into a single-stage root runtime and runs Vite preview. No .dockerignore or repository header policy observed. Treat runtime minimization/secret exclusion/header configuration as hardening, not a proven exploit. |
| Contact handoff and public API       | not recorded | No issue found  | Form data is encoded into fixed mailto target; API exposes health only. No injection or authorization bypass established.                                                                                                                              |

## Open Questions And Follow Up

- Are production headers enforced at Railway or another edge?
- Do any developer previews run remotely with private workspace material?
- Does CI scan dependencies/secrets and container images outside this repository?
- What contact-data retention and delivery controls will accompany a real server-side lead endpoint?
- Bounded security pass prioritized trust-boundary code. Remaining marketing pages, duplicated UI components, binary content assets, and complete dependency implementations were not exhaustively reviewed.
  - Follow-up prompt: Review deferred unit unreviewed-low-priority-source and close its stated proof gap. Paths: artifacts/p1-website/src/pages, artifacts/p1-website/src/components/ui, artifacts/mockup-sandbox/src/components, attached_assets, pnpm-lock.yaml.
