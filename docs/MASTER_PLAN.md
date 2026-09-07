# P1 Land & Property Management — Master Project Plan

Canonical scope register, updated September 7, 2026. Owner-approved requirements remain in force even where implementation is incomplete. This document connects the accepted website/CMS work, property operations platform, content strategy and commercial business-development initiative. It does not redefine a preview as a finished product.

## Outcomes

Win and retain qualified accounts through reliable inquiries, truthful capability/proof, commercial assessments and proposals, followed by accountable property operations and service history. Preserve existing public services/URLs and supported customer segments while strengthening the commercial/industrial relationship proposition: **Exterior Site Operations & Land Management Partner — one accountable partner for everything outside the building envelope.**

## Authoritative workstreams

| Initiative | Scope and source of truth | Current state |
|---|---|---|
| Website, CMS and CRM foundation | [Accepted implementation envelope](proposals/p1-cms-adoption.md): isolated P1 Core from aad2057, /admin, managed durable forms/CRM,34existing routes under CMS control, truthful proof, performance/SEO/accessibility/security and staged release | Implemented slices undergoing integration; website/CMS production closeout unfinished |
| Property operations platform | [Dashboard scope and remaining requirements](dashboard/README.md), [architecture](dashboard/ARCHITECTURE.md), [contracts](dashboard/API.md) | Separate dashboard and worker preview deployed; not a completed platform or accepted pilot |
| Commercial / Industrial Sales and Account Development | [Commercial initiative](initiatives/commercial-industrial-sales.md): /commercial, service architecture, Commercial Site Assessment, differentiated intake, durable sales handoff, target-account pursuit and property lifecycle | PLANNED; documentation addition approved, page/workflows not yet built |
| Evidence-led content and priority markets | [Growth-corridor strategy/proof inventory](strategy/2026-09-07-growth-corridor-content-strategy.md) | Planning/evidence work; public edits follow active technical review gates |
| Email and infrastructure | [Mailgun/DNS record](mailgun-dns-setup.md), [dashboard deployment](dashboard/DEPLOYMENT.md), copied Core operations guide | Dedicated boundaries provisioned; provider and owner activation gates remain |

[Task register](TASKS.md) owns sequencing/write ownership. [Implementation status](implementation-status.md) records evidence and limitations. The initial [website audit plan](audits/2026-09-07-implementation-plan.md) is historical proposal context; the accepted implementation envelope and subsequent owner additions control where they differ.

## Preserved architecture and product scope

- Responsive React public website and business web application; React Native / Expo iOS and Android applications remain required later work, not replaced by the web preview/PWA.
- Client, staff and crew experiences; Better Auth is the canonical P1 identity for the business web application, P1 CMS administrator area and future React Native / Expo clients. The owner explicitly confirmed on September 7, 2026 that dashboard and CMS must use the same credentials. Implement shared sign-in with account linking, explicit CMS permission mapping, MFA and revocation enforcement, tested rollout and rollback; do not copy passwords or password hashes, share session secrets, or infer CMS privileges from dashboard access or matching email alone. Existing owner setup remains valid. CMS federation is required implementation work, not yet a verified live capability. Node.js/TypeScript, PostgreSQL, Drizzle and Railway remain the platform.
- Property remains the central operational domain, with maps/areas/assets, assessments, inspections, issues, recurring services, work orders, projects, scheduling, crews, sales, finances, client portal, property history/health and future fleet/equipment management.
- Website and Core CMS are separately built behind the public /admin and /api gateway. Business dashboard lives on its separate hostname and database; native clients use its versioned contracts. Preserve public/dashboard bundle separation, least-privilege access, private evidence and explicit report/marketing publication.
- Dedicated P1 infrastructure/secrets; original Core Platform codebase/deployment/database/customer records untouched. No eCommerce, Directory, Membership or Portfolio app; Events/Careers retained disabled. Project stories use the CMS/blog model.
- Existing financial authority/idempotency, estimate revision/approval, offline replay/conflicts, client/property isolation, audit/history, notifications, consent, backup/rollback and provider/device/pilot requirements remain mandatory.

Commercial additions extend sales before operations: a prospect company/site or researched target is not yet a customer account. Domain/contract work must avoid forcing prospects into billing clients, creating fake email addresses, auto-inviting users or granting operational access to satisfy a database foreign key.

## Integrated phases

1. **Foundation and reliable intake:** Finish current website/Core integration, owner setup, isolated infrastructure, managed submissions and CRM recovery. Complete reviewed security/runtime checks, backup/restore and release receipts. Continue evidence collection and commercial entity/event contract planning alongside bounded technical work.
2. **Editable acquisition system:** Accept CMS/public/image review gates, finish content parity and truthful SEO/accessibility/performance. Implement /commercial and managed commercial intake as one acquisition release (COM-03/04), with structured CMS controls and first-party attribution. Preserve latest navigation and all existing routes.
3. **Assessment-to-operations web workflow:** Connect qualified inquiries/accounts/sites to confirmed assessment, reviewed findings/report, proposal/opportunity, explicit conversion/onboarding and recurring/corrective work. Complete all dashboard operational/financial/availability/contact/reporting requirements and authorized provider checks, then controlled crew/client pilot.
4. **Commercial pursuit and retention:** Extend account/contact/site relationships, decision-maker roles, development milestones, opportunities, procurement/renewal information and next-action queues. Preserve original lead stages; map richer pursuit stages explicitly. Publish only approved evidence-led project stories and content.
5. **Native and expanded operations:** Deliver Expo iOS/Android experiences using shared contracts and device-secure/offline mechanisms, complete physical-device acceptance, and extend portfolio reporting, property health and planned fleet/equipment capabilities. Do not delete unfinished web requirements when native work starts.

Detailed COM-01–07 ownership/dependencies/acceptance live in the commercial initiative. Current phases are dependency order, not calendar promises. Strategy registration does not freeze unrelated authorized engineering; reviews should have specific unresolved checks and be completed promptly.

## Release and business acceptance

A workstream advances only with evidence appropriate to its behavior: scoped review, type/build/contract tests, draft and access isolation, durable receipt/retry/recovery, relevant browser/mobile/screen-reader checks, staging, backup/rollback and exact deployed source receipt. Customer proof/credentials and provider activation retain their specific permission requirements. An implemented adapter is not provider validation; a deployed preview is not pilot acceptance; a GitHub push is not production release.

Track commercial inquiry acceptance, qualification, follow-up timeliness, booked/completed assessments, proposals, wins, recurring agreements, renewal and expansion. Keep call/email clicks separate from confirmed inquiries, and sales estimates separate from actual accounting revenue. Establish realistic targets after baseline/capacity evidence. No new paid analytics or automatic outbound/publication schedule is required by this addition.
