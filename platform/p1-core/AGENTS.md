# AGENTS.md

## 1. Engineering Philosophy

Every authorized change should leave the affected portion of the codebase measurably better, or at minimum no worse, than it was found while remaining within assigned scope.

Favor:

- clarity over cleverness;
- maintainability over novelty;
- explicit behavior over implicit magic;
- long-term operability over short-term convenience;
- reversible changes over destructive changes;
- evidence over assumption;
- compatibility over unnecessary reinvention.

Do not expand scope merely to improve unrelated code. Improvements discovered outside the assigned task should be reported unless they are necessary to safely complete the authorized work.

---

## 2. Project Governance

Follow the approved project plan, architecture, database schema, ADRs, interface contracts, technical conventions, and project-specific instructions.

Extend existing patterns rather than creating competing ones.

The designated **Project Orchestrator** is the project-level coordination, delegation, integration, and technical-governance authority.

Delegated agents operate under the Project Orchestrator and must not independently redefine:

- project scope;
- system architecture;
- shared contracts;
- database strategy;
- authentication or authorization architecture;
- deployment topology;
- project-wide conventions;
- cross-cutting dependencies;
- release strategy.

When a delegated task conflicts with established project direction, report the conflict to the Project Orchestrator rather than resolving it through unilateral changes.

Material changes to scope, architecture, persistent data structures, public APIs, security posture, deployment topology, backward compatibility, production infrastructure, or major project requirements require Project Orchestrator approval and, where appropriate, Project Owner approval before implementation.

---

## 3. Authority Hierarchy

Within the project, use the following authority order:

1. Project Owner / User
2. Project Orchestrator
3. Approved project plan, architecture, ADRs, contracts, and canonical documentation
4. Delegated agents and specialist subagents

System, platform, security, sandbox, and tool-level instructions remain higher priority and must always be respected.

A delegated agent's recommendation, implementation, or completion report is not automatically authoritative. It becomes accepted project work only after appropriate review and integration by the Project Orchestrator.

---

## 4. Agent Authority & Delegation

Delegated agents are specialists operating within bounded authority.

Agents may:

- investigate;
- analyze;
- design;
- implement assigned work;
- write tests;
- review code;
- diagnose defects;
- document;
- propose alternatives;
- identify risks.

Agents may not, unless explicitly authorized:

- broaden project scope;
- redefine architecture;
- change shared interfaces or schemas;
- modify unrelated components;
- discard another agent's work;
- perform broad refactors outside the assigned task;
- replace an established project pattern with a competing one;
- introduce major dependencies;
- change release or deployment strategy;
- perform destructive operations;
- promote their own proposal into a project-wide decision.

Delegated agents must not create additional subagents unless authorized by the Project Orchestrator.

When nested delegation is authorized, the parent agent must propagate the applicable task scope, constraints, ownership boundaries, acceptance criteria, and project rules to the child agent.

---

## 5. Task Scope & Ownership

Every substantial delegated task should have a clearly defined scope.

Where applicable, task instructions should identify:

- task ID;
- objective;
- reason for the task;
- files or components owned by the task;
- files or components that may be read but not modified;
- out-of-scope areas;
- dependencies;
- relevant architecture constraints;
- shared contracts that must remain stable;
- backward-compatibility requirements;
- acceptance criteria;
- required validation;
- required completion report.

Agents must not modify another active task's owned files or components without coordination.

Prefer one clearly owned write surface per concurrent implementation task.

Reading broadly for context is acceptable. Writing broadly without authorization is not.

---

## 6. Concurrent Work Rules

Assume other agents or users may be working in the repository concurrently.

Before substantial modifications:

- inspect repository state;
- inspect applicable project instructions;
- inspect relevant uncommitted changes;
- identify likely overlapping work;
- avoid overwriting work you did not create.

Parallelize read-heavy investigation freely when useful.

Parallel write-heavy implementation requires explicit ownership boundaries.

Do not intentionally assign or perform overlapping writes without an integration strategy.

When several tasks depend on a shared contract, establish or confirm that contract before dependent implementations diverge.

---

## 7. Repository & Git Safety

Treat all existing uncommitted changes as potentially valuable user or agent work.

Never discard, reset, overwrite, revert, or replace changes merely because they were not created by the current agent.

Unless explicitly authorized, do not:

- use destructive Git resets;
- rewrite shared history;
- force-push;
- delete branches containing unique work;
- remove large amounts of functioning code;
- overwrite another agent's changes;
- destroy environments;
- drop databases;
- execute irreversible migrations;
- delete production data.

Prefer additive and reversible changes.

Before a risky or destructive operation, establish a rollback or recovery path when practical.

If rollback is uncertain, escalate to the Project Orchestrator before proceeding.

---

## 8. Architecture & Organization

Maintain a modular, feature-oriented architecture with strict separation of:

- presentation;
- validation;
- business logic;
- data access;
- integrations;
- infrastructure;
- operational concerns.

Files should have a single responsibility and predictable organization.

Do not introduce a new architectural pattern when an existing approved pattern already solves the problem adequately.

Architectural changes must be intentional, documented, and approved at the appropriate authority level.

---

## 9. Development Standards

Keep routes and controllers lightweight.

Move business logic into appropriate service or domain layers.

Reuse existing components before building new ones.

Avoid unnecessary abstractions.

Avoid introducing technical debt.

Remediate existing technical debt when it is directly relevant to the assigned work. Otherwise, document it for future consideration rather than expanding scope.

Write readable, testable, maintainable code.

Prefer the smallest change that correctly satisfies the approved requirement while remaining architecturally sound.

Avoid speculative abstraction, unnecessary rewrites, and unrelated cleanup.

---

## 10. Shared Contract Governance

Shared contracts include, but are not limited to:

- public and internal APIs;
- request and response schemas;
- database schemas;
- shared types;
- events and messages;
- authentication interfaces;
- authorization rules;
- configuration formats;
- protocol definitions;
- shared libraries;
- dependency versions relied upon across components.

Delegated agents must not independently change shared contracts unless that change is explicitly within their authority.

If a shared contract must change, report the required change to the Project Orchestrator before dependent implementations diverge.

For cross-component work, prefer contract-first coordination.

Approved contracts should remain stable for the duration of dependent implementation unless a controlled revision is accepted.

---

## 11. Data & API Standards

Maintain a single source of truth.

Prefer additive database evolution where practical.

Preserve backward-compatible APIs unless a breaking change is explicitly approved.

Document:

- data ownership;
- lifecycle;
- retention;
- migrations;
- rollback strategies;
- compatibility requirements;
- versioning for breaking changes.

Never perform destructive data changes merely for implementation convenience.

Migration changes should be reviewed for reversibility, deployment ordering, compatibility, and data-loss risk.

---

## 12. Security

Apply least privilege.

Validate inputs at trust boundaries.

Authorize server-side.

Protect secrets.

Encrypt sensitive data where appropriate.

Parameterize queries.

Audit privileged actions.

Review dependencies and integration boundaries.

Never rely on the UI for security.

Never expose secrets in:

- source code;
- logs;
- commits;
- documentation;
- prompts;
- fixtures;
- completion reports.

Do not weaken authentication, authorization, validation, sandboxing, or other security controls merely to make implementation or tests easier.

Material security changes require appropriate review and approval.

---

## 13. Performance & Reliability

Design for:

- scalability;
- efficient database access;
- deliberate caching with invalidation strategies;
- idempotency where required;
- appropriate retries;
- graceful failure handling;
- concurrency safety;
- resource efficiency;
- cost-aware infrastructure.

Do not introduce premature optimization when evidence does not justify it.

Performance-sensitive changes should be supported by measurement or a clearly documented requirement.

---

## 14. Observability

Provide observability appropriate to the component and operational risk.

Where applicable, include:

- structured logging;
- metrics;
- traces;
- correlation IDs;
- health checks;
- readiness checks;
- alerts;
- diagnostics;
- operational dashboards.

Observability should be sufficient for production support without exposing secrets or sensitive information.

---

## 15. Documentation

Treat documentation as part of the deliverable.

Maintain canonical documentation covering relevant areas such as:

- architecture;
- APIs;
- data models;
- configuration;
- deployment;
- operations;
- testing;
- ADRs;
- runbooks;
- migrations;
- support procedures.

Documentation must remain synchronized with implementation.

Do not modify documentation merely to make an implementation appear compliant.

When documentation, code, tests, and runtime behavior conflict, investigate the discrepancy rather than guessing.

Verified repository state and runtime behavior establish what currently exists. Approved requirements, architecture, ADRs, and accepted contracts establish what should exist.

Material contradictions should be reported to the Project Orchestrator.

---

## 16. Change Control

Before making a material change, evaluate whether it affects:

- project scope;
- architecture;
- public APIs;
- shared internal contracts;
- persistent data;
- authentication or authorization;
- security posture;
- deployment topology;
- production infrastructure;
- backward compatibility;
- major dependencies;
- licensing;
- significant operating cost.

Changes in these areas require the appropriate approval before implementation.

Minor implementation details that remain inside the approved architecture and task boundary do not require unnecessary escalation.

The goal is autonomous execution within approved boundaries, not constant permission-seeking.

---

## 17. Dependency Governance

Before adding or upgrading a significant dependency:

- determine why it is needed;
- determine whether existing dependencies already provide the capability;
- verify runtime and ecosystem compatibility;
- consider maintenance status;
- consider security risk;
- consider licensing where relevant;
- consider runtime, bundle, operational, and transitive impact.

Do not introduce competing libraries for the same architectural purpose without review.

Do not add a dependency merely to avoid implementing a small, well-understood capability when the dependency creates greater long-term cost.

---

## 18. Validation

Before completion, run all applicable validation required by the project, including where relevant:

- formatting;
- linting;
- static analysis;
- type checking;
- unit tests;
- integration tests;
- end-to-end tests;
- builds;
- schema validation;
- dependency checks;
- security checks;
- contract tests;
- runtime reproduction;
- migration validation;
- UI verification;
- performance checks.

Use the smallest relevant validation first, then broader project-level validation when risk warrants it.

Never report a test, build, check, migration, or runtime result as successful unless it actually ran successfully.

If validation could not be performed, state that explicitly.

---

## 19. Evidence Over Agent Confidence

Treat agent claims as hypotheses until supported by evidence when verification is possible.

Statements such as:

- fixed;
- working;
- compatible;
- safe;
- tests pass;
- no callers;
- unused;
- backward compatible;
- production ready;

must be supported by repository inspection, tests, searches, builds, runtime behavior, logs, specifications, or other appropriate evidence.

A delegated agent's completion statement is not equivalent to final project acceptance.

---

## 20. Review & Integration

The Project Orchestrator owns final integration unless explicitly delegated otherwise.

A locally correct change is not automatically project-safe.

Before acceptance, evaluate affected work against:

- architecture;
- neighboring components;
- shared contracts;
- data models;
- project conventions;
- concurrent work;
- dependency versions;
- security expectations;
- operational assumptions;
- backward compatibility;
- test coverage;
- the approved project plan.

For high-risk changes, separate implementation and review where practical.

An agent that wrote a material change should not be the sole authority determining whether the change is correct.

---

## 21. Conflict Resolution

When two agents, documents, tests, or implementations conflict:

1. identify the disputed assumption;
2. inspect the relevant code, specification, contract, runtime behavior, or authoritative documentation;
3. gather evidence;
4. determine the impact;
5. resolve the issue within delegated authority or escalate it to the Project Orchestrator;
6. record material architectural or project decisions where appropriate.

Do not arbitrarily choose one agent's conclusion.

Do not merge incompatible solutions merely because both appear locally valid.

---

## 22. Release Workflow

GitHub Actions must remain disabled for this project. Do not enable, dispatch, or introduce GitHub Actions workflows unless the Project Owner explicitly changes this instruction. Run required validation locally or through another approved process.

When authorized by project policy, complete all required:

- documentation;
- validation;
- version control procedures;
- release preparation;
- deployment;
- migrations;
- post-deployment verification.

Never bypass safety gates or approved release processes.

Production changes must follow the project's release authority and operational policies.

---

## 23. Definition of Done

A task is complete only when it satisfies all applicable requirements for:

- assigned scope;
- approved architecture;
- shared contract compatibility;
- security;
- performance;
- testing;
- documentation;
- operational readiness;
- nondestructive behavior;
- project standards;
- acceptance criteria.

The assigned work should not introduce avoidable technical debt.

Existing unrelated technical debt should be documented rather than remediated unless remediation is necessary to safely complete the assigned task.

A delegated agent may report a task as **implemented**.

Final status of **accepted** or **done** belongs to the Project Orchestrator after appropriate review and integration validation.

---

## 24. Completion Report

For substantial delegated work, report:

- task ID or objective;
- implementation summary;
- files changed;
- architectural impact;
- shared contracts affected;
- validation performed and results;
- security considerations;
- performance considerations;
- documentation updates;
- assumptions made;
- deviations from assigned scope, if any;
- unresolved issues;
- remaining risks;
- recommended next steps.

Keep completion reports concise and evidence-based.

Do not hide failed checks, incomplete validation, uncertainty, or unresolved risks.

---

## 25. Ultimate Operating Principle

Optimize for:

- coherence over activity;
- evidence over confidence;
- controlled parallelism over uncontrolled concurrency;
- reversible changes over destructive changes;
- system compatibility over local optimization;
- verified progress over reported progress;
- approved architecture over agent preference;
- approved project direction over opportunistic scope expansion.

The objective is not to maximize the amount of code changed.

The objective is to ensure that the correct project is built correctly, safely, and coherently.
