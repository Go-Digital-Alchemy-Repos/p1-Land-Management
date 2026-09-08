import { test } from "node:test";
import assert from "node:assert/strict";
import {
  listCommercialInquiries,
  updateCommercialFollowUp,
  listCommercialAssessmentBaselines,
  createCommercialAssessmentBaseline,
  getCommercialAssessmentBaseline,
  updateCommercialAssessmentBaseline,
  reviewCommercialAssessmentBaseline,
  archiveCommercialAssessmentBaseline,
  getSchedule,
  rescheduleWork,
  updateWorkReadiness,
  listAgreementPreparationJobs,
  previewAgreementPreparationRetry,
  retryAgreementPreparation,
  listServiceRequestLifecycle,
  getServiceRequestLifecycle,
  transitionServiceRequest,
  getServiceRequestHistory,
  previewServiceRequestConversion,
  convertServiceRequest,
  listProjectPhases,
  createProjectPhase,
  getProjectPhase,
  updateProjectPhase,
  transitionProjectPhase,
  publishProjectPhase,
  getProjectPhaseHistory,
  listProjectPhaseBillingIntents,
  createProjectPhaseBillingIntent,
  listProjects,
  createProject,
  updateProject,
  listExpenses,
  createExpense,
  listSalesLeads,
  createSalesLead,
  convertSalesLead,
  createSalesEstimate,
  recordEstimateDecision,
  reviseEstimate,
  createEstimateChangeOrder,
  listDashboardClients,
  createDashboardClient,
  updateDashboardClient,
  createDashboardProperty,
  updateDashboardProperty,
  createWorkOrder,
  updateWorkOrderStatus,
  publishWorkOrder,
  createRecurringService,
  pauseRecurringService,
} from "@workspace/api-client-react/dashboard";
test("generated dashboard client preserves cursor filters, explicit nulls and conflict errors", async () => {
  const original = globalThis.fetch;
  const calls: { url: string; init?: RequestInit }[] = [];
  let fail = false;
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return fail
      ? Response.json(
          { error: "Inquiry changed; refresh before saving" },
          { status: 409 },
        )
      : Response.json({ items: [], nextCursor: null, id: "test", version: 2 });
  };
  try {
    await listCommercialInquiries({
      status: "contacted",
      ownerId: "unassigned",
      overdue: "true",
      cursor: "opaque_cursor",
    });
    const url = new URL(calls.at(-1)!.url, "https://example.test");
    assert.equal(url.pathname, "/api/v1/commercial-inquiries");
    assert.equal(url.searchParams.get("cursor"), "opaque_cursor");
    assert.equal(url.searchParams.get("ownerId"), "unassigned");
    assert.equal(url.searchParams.get("overdue"), "true");
    await updateCommercialFollowUp("lead-id", {
      expectedVersion: 1,
      ownerId: null,
      nextAction: "Call office",
      nextActionDueAt: null,
      status: "contacted",
    });
    assert.equal(calls.at(-1)!.init?.method, "PATCH");
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), {
      expectedVersion: 1,
      ownerId: null,
      nextAction: "Call office",
      nextActionDueAt: null,
      status: "contacted",
    });
    const assessmentLeadId = "00000000-0000-4000-8000-000000000001";
    const assessmentId = "00000000-0000-4000-8000-000000000002";
    await listCommercialAssessmentBaselines(assessmentLeadId);
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      `/api/v1/commercial-inquiries/${assessmentLeadId}/assessment-baselines`,
    );
    const createAssessment = {
      operationId: "00000000-0000-4000-8000-000000000003",
      expectedLeadVersion: 2,
      title: "Initial exterior baseline",
      scopeNote: null,
    };
    await createCommercialAssessmentBaseline(assessmentLeadId, createAssessment);
    assert.equal(calls.at(-1)!.init?.method, "POST");
    assert.deepEqual(
      JSON.parse(String(calls.at(-1)!.init?.body)),
      createAssessment,
    );
    await getCommercialAssessmentBaseline(assessmentLeadId, assessmentId);
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      `/api/v1/commercial-inquiries/${assessmentLeadId}/assessment-baselines/${assessmentId}`,
    );
    const updateAssessment = {
      expectedVersion: 1,
      title: "Initial exterior baseline",
      scopeNote: "Documented before proposal.",
      findings: [],
      recommendations: [],
    };
    await updateCommercialAssessmentBaseline(assessmentLeadId, assessmentId, updateAssessment);
    assert.equal(calls.at(-1)!.init?.method, "PUT");
    assert.deepEqual(
      JSON.parse(String(calls.at(-1)!.init?.body)),
      updateAssessment,
    );
    await reviewCommercialAssessmentBaseline(assessmentLeadId, assessmentId, {
      expectedVersion: 2,
    });
    assert.equal(calls.at(-1)!.init?.method, "POST");
    assert.match(String(calls.at(-1)!.url), /\/review$/);
    await archiveCommercialAssessmentBaseline(assessmentLeadId, assessmentId, {
      expectedVersion: 3,
      reason: "Superseded by a later site walk.",
    });
    assert.equal(calls.at(-1)!.init?.method, "POST");
    assert.match(String(calls.at(-1)!.url), /\/archive$/);
    await getSchedule({
      from: "2026-09-07",
      through: "2026-09-13",
      unscheduled: "true",
    });
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").searchParams.get(
        "unscheduled",
      ),
      "true",
    );
    await rescheduleWork("work-id", {
      scheduledAt: "2026-09-07T12:00:00Z",
      version: 1,
      reason: "Client request",
    });
    assert.equal(
      Object.hasOwn(JSON.parse(String(calls.at(-1)!.init?.body)), "assignedTo"),
      false,
    );
    await rescheduleWork("work-id", {
      scheduledAt: "2026-09-07T12:00:00Z",
      assignedTo: null,
      version: 1,
      reason: "Reassign",
    });
    assert.equal(JSON.parse(String(calls.at(-1)!.init?.body)).assignedTo, null);
    await updateWorkReadiness("work-id", {
      version: 4,
      prerequisites: [{ label: "Equipment: inspection", done: true }],
      reason: "Inspection completed",
    });
    assert.equal(calls.at(-1)!.init?.method, "POST");
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      "/api/v1/work-orders/work-id/readiness",
    );
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), {
      version: 4,
      prerequisites: [{ label: "Equipment: inspection", done: true }],
      reason: "Inspection completed",
    });
    await listAgreementPreparationJobs({
      agreementId: "00000000-0000-4000-8000-000000000001",
      status: "failed",
      after: "opaque_cursor",
      limit: 25,
    });
    {
      const url = new URL(calls.at(-1)!.url, "https://example.test");
      assert.equal(url.pathname, "/api/v1/agreement-preparation-jobs");
      assert.equal(url.searchParams.get("agreementId"), "00000000-0000-4000-8000-000000000001");
      assert.equal(url.searchParams.get("status"), "failed");
      assert.equal(url.searchParams.get("after"), "opaque_cursor");
    }
    await previewAgreementPreparationRetry("00000000-0000-4000-8000-000000000002", {
      expectedRevision: 3,
    });
    assert.equal(calls.at(-1)!.init?.method, "POST");
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), {
      expectedRevision: 3,
    });
    await retryAgreementPreparation("00000000-0000-4000-8000-000000000002", {
      operationId: "00000000-0000-4000-8000-000000000003",
      expectedRevision: 3,
      eligibilityFingerprint: "a".repeat(64),
      reason: "Manager corrected the prerequisite.",
    });
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      "/api/v1/agreement-preparation-jobs/00000000-0000-4000-8000-000000000002/retries",
    );
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), {
      operationId: "00000000-0000-4000-8000-000000000003",
      expectedRevision: 3,
      eligibilityFingerprint: "a".repeat(64),
      reason: "Manager corrected the prerequisite.",
    });
    const requestId = "00000000-0000-4000-8000-000000000004";
    await listServiceRequestLifecycle();
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      "/api/v1/service-requests",
    );
    await getServiceRequestLifecycle(requestId);
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      `/api/v1/service-requests/${requestId}`,
    );
    await transitionServiceRequest(requestId, {
      expectedVersion: 2,
      status: "triaged",
      reason: "Office review completed.",
    });
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), {
      expectedVersion: 2,
      status: "triaged",
      reason: "Office review completed.",
    });
    await getServiceRequestHistory(requestId);
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      `/api/v1/service-requests/${requestId}/history`,
    );
    const draft = {
      title: "Inspect north drive",
      scope: "Assess drainage.",
      checklist: [{ label: "Photo record", done: false }],
      prerequisites: [{ label: "Gate access", done: false }],
    };
    await previewServiceRequestConversion(requestId, draft);
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      `/api/v1/service-requests/${requestId}/conversion-preview`,
    );
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), draft);
    await convertServiceRequest(requestId, {
      ...draft,
      operationId: "00000000-0000-4000-8000-000000000005",
      expectedRequestVersion: 3,
    });
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      `/api/v1/service-requests/${requestId}/conversions`,
    );
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), {
      ...draft,
      operationId: "00000000-0000-4000-8000-000000000005",
      expectedRequestVersion: 3,
    });
    const projectId = "00000000-0000-4000-8000-000000000006";
    const phaseId = "00000000-0000-4000-8000-000000000007";
    const phaseDetails = {
      title: "Driveway restoration",
      scope: "Repair drainage and gravel.",
      plannedStart: "2026-09-08",
      plannedEnd: "2026-09-10",
      prerequisites: [{ label: "Gate access", done: true }],
    };
    await listProjectPhases(projectId);
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      `/api/v1/projects/${projectId}/phases`,
    );
    await createProjectPhase(projectId, { ...phaseDetails, position: 2 });
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), {
      ...phaseDetails,
      position: 2,
    });
    await getProjectPhase(phaseId);
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      `/api/v1/project-phases/${phaseId}`,
    );
    await updateProjectPhase(phaseId, {
      ...phaseDetails,
      expectedVersion: 2,
      reason: "Client confirmed the access window.",
    });
    assert.equal(calls.at(-1)!.init?.method, "PATCH");
    await transitionProjectPhase(phaseId, {
      expectedVersion: 3,
      status: "ready",
      reason: "Prerequisites checked.",
    });
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      `/api/v1/project-phases/${phaseId}/transitions`,
    );
    await publishProjectPhase(phaseId, {
      expectedVersion: 4,
      summary: "Access and drainage preparation are complete.",
    });
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), {
      expectedVersion: 4,
      summary: "Access and drainage preparation are complete.",
    });
    await getProjectPhaseHistory(phaseId);
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      `/api/v1/project-phases/${phaseId}/history`,
    );
    await listProjectPhaseBillingIntents(phaseId);
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      `/api/v1/project-phases/${phaseId}/billing-intents`,
    );
    await createProjectPhaseBillingIntent(phaseId, {
      operationId: "00000000-0000-4000-8000-000000000008",
      expectedPhaseVersion: 5,
      estimateId: "00000000-0000-4000-8000-000000000009",
      title: "Driveway restoration deposit",
      amountCents: 250000,
      kind: "deposit",
    });
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), {
      operationId: "00000000-0000-4000-8000-000000000008",
      expectedPhaseVersion: 5,
      estimateId: "00000000-0000-4000-8000-000000000009",
      title: "Driveway restoration deposit",
      amountCents: 250000,
      kind: "deposit",
    });
    const projectPropertyId = "00000000-0000-4000-8000-000000000010";
    await listProjects();
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      "/api/v1/projects",
    );
    const project = {
      propertyId: projectPropertyId,
      name: "Driveway restoration",
      scope: "Repair drainage and gravel.",
      phases: [{ name: "Mobilization", complete: false }],
    };
    await createProject(project);
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), project);
    await updateProject("project-id", {
      name: "Driveway restoration",
      scope: "Repair drainage and gravel.",
      expectedVersion: 2,
    });
    assert.equal(calls.at(-1)!.init?.method, "POST");
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      "/api/v1/projects/project-id",
    );
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), {
      name: "Driveway restoration",
      scope: "Repair drainage and gravel.",
      expectedVersion: 2,
    });
    await listExpenses();
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      "/api/v1/expenses",
    );
    const expense = {
      propertyId: projectPropertyId,
      amountCents: 12500,
      category: "Materials",
      description: "Drainage gravel",
      incurredOn: "2026-09-08",
    };
    await createExpense(expense);
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), expense);
    const leadId = "00000000-0000-4000-8000-000000000010";
    const propertyId = "00000000-0000-4000-8000-000000000011";
    const estimateId = "00000000-0000-4000-8000-000000000012";
    await listSalesLeads();
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      "/api/v1/leads",
    );
    const lead = {
      name: "Jordan Smith",
      email: "jordan@example.test",
      phone: "864-555-0100",
      location: "Greenville, SC",
      description: "Seasonal estate management",
      source: "office",
    };
    await createSalesLead(lead);
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), lead);
    await convertSalesLead(leadId, {
      propertyName: "Smith Estate",
      address: "100 Example Lane",
    });
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      `/api/v1/leads/${leadId}/convert`,
    );
    const estimate = {
      propertyId,
      title: "Seasonal grounds plan",
      scope: "Monthly mowing and inspection.",
      amountCents: 125000,
    };
    await createSalesEstimate(estimate);
    assert.equal(calls.at(-1)!.init?.method, "POST");
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), estimate);
    await recordEstimateDecision(estimateId, {
      status: "sent",
      revision: 1,
    });
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      `/api/v1/estimates/${estimateId}/decision`,
    );
    const revised = {
      revision: 1,
      title: "Seasonal grounds plan",
      scope: "Monthly mowing and inspection with storm checks.",
      amountCents: 150000,
    };
    await reviseEstimate(estimateId, revised);
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      `/api/v1/estimates/${estimateId}/revise`,
    );
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), revised);
    const changeOrder = {
      title: "Storm cleanup allowance",
      scope: "Remove fallen limbs after a named storm.",
      amountCents: 50000,
    };
    await createEstimateChangeOrder(estimateId, changeOrder);
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      `/api/v1/estimates/${estimateId}/change-order`,
    );
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), changeOrder);
    const clientId = "00000000-0000-4000-8000-000000000013";
    await listDashboardClients();
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      "/api/v1/clients",
    );
    const primaryContact = {
      firstName: "Avery",
      lastName: "Morgan",
      email: "avery@example.test",
      position: "Property manager",
      phone: "803-555-0199",
    };
    await createDashboardClient({
      name: "Pine Ridge Holdings",
      address: "123 Fieldstone Road",
      phone: "803-555-0199",
      primaryContact,
    });
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), {
      name: "Pine Ridge Holdings",
      address: "123 Fieldstone Road",
      phone: "803-555-0199",
      primaryContact,
    });
    await updateDashboardClient(clientId, {
      name: "Pine Ridge Holdings",
      address: "123 Fieldstone Road",
      phone: "803-555-0199",
      email: null,
      version: 1,
      primaryContact,
    });
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      `/api/v1/clients/${clientId}`,
    );
    await createDashboardProperty({
      clientId,
      name: "Pine Ridge",
      address: "123 Fieldstone Road",
      acreage: 125,
      accessInstructions: "Call before entry.",
    });
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), {
      clientId,
      name: "Pine Ridge",
      address: "123 Fieldstone Road",
      acreage: 125,
      accessInstructions: "Call before entry.",
    });
    await updateDashboardProperty("property-id", {
      name: "Pine Ridge",
      address: "123 Fieldstone Road",
      acreage: null,
      accessInstructions: "Call before entry.",
      version: 3,
    });
    assert.equal(calls.at(-1)!.init?.method, "POST");
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      "/api/v1/properties/property-id",
    );
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), {
      name: "Pine Ridge",
      address: "123 Fieldstone Road",
      acreage: null,
      accessInstructions: "Call before entry.",
      version: 3,
    });
    const workOrderId = "00000000-0000-4000-8000-000000000015";
    const workPropertyId = "00000000-0000-4000-8000-000000000016";
    const workOrder = {
      propertyId: workPropertyId,
      title: "Driveway inspection",
      scope: "Inspect drainage and gravel.",
      assignedTo: "crew-member-id",
      scheduledAt: "2026-09-10T13:00:00.000Z",
      checklist: [{ label: "Photo record", done: false }],
      prerequisites: [{ label: "Gate access", done: true }],
    };
    await createWorkOrder(workOrder);
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      "/api/v1/work-orders",
    );
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), workOrder);
    await updateWorkOrderStatus(workOrderId, {
      status: "ready",
      version: 2,
      overrideReason: "Manager verified alternate equipment.",
    });
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      `/api/v1/work-orders/${workOrderId}/status`,
    );
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), {
      status: "ready",
      version: 2,
      overrideReason: "Manager verified alternate equipment.",
    });
    await publishWorkOrder(workOrderId);
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      `/api/v1/work-orders/${workOrderId}/publish`,
    );
    assert.equal(calls.at(-1)!.init?.body, undefined);
    const recurringId = "00000000-0000-4000-8000-000000000015";
    const recurring = {
      propertyId: workPropertyId,
      title: "Seasonal grounds care",
      scope: "Mowing and perimeter inspection.",
      cadence: "monthly" as const,
      intervalCount: 1,
      nextDate: "2026-10-01",
      localTime: "08:00",
      assignedTo: "crew-member-id",
      billingMode: "fixed_monthly" as const,
    };
    await createRecurringService(recurring);
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      "/api/v1/recurring-services",
    );
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), recurring);
    await pauseRecurringService(recurringId, { paused: true });
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      `/api/v1/recurring-services/${recurringId}/pause`,
    );
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), {
      paused: true,
    });
    fail = true;
    await assert.rejects(
      listCommercialInquiries(),
      (e: unknown) =>
        e instanceof Error &&
        "status" in e &&
        e.status === 409 &&
        e.message.includes("Inquiry changed"),
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("generated identity transport preserves nullable role and optional MFA state without granting assurance", async () => {
  const { getDashboardMe } =
    await import("@workspace/api-client-react/dashboard");
  const original = globalThis.fetch;
  let response: Record<string, unknown> = {
    id: "inactive",
    name: "Fixture",
    email: "fixture@example.test",
    role: null,
    mfaRequired: false,
    ownerMfaRequired: false,
  };
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "/api/v1/me");
    assert.equal(init?.method, "GET");
    assert.equal(init?.body, undefined);
    return Response.json(response);
  };
  try {
    assert.deepEqual(await getDashboardMe(), response);
    response = {
      ...response,
      role: "owner",
      twoFactorEnabled: null,
      mfaRequired: true,
      ownerMfaRequired: true,
    };
    const owner = await getDashboardMe();
    assert.equal(owner.mfaRequired, true);
    assert.equal(owner.ownerMfaRequired, true);
    assert.equal(owner.twoFactorEnabled, null);
  } finally {
    globalThis.fetch = original;
  }
});

test("generated property reads preserve role-minimized snapshots and unknown historical payloads", async () => {
  const { listDashboardProperties, getPropertyTimeline, listPropertyFiles } =
    await import("@workspace/api-client-react/dashboard");
  const original = globalThis.fetch;
  const property = {
    id: "property",
    client_id: "client",
    name: "Fixture",
    address: "Synthetic",
    acreage: null,
  };
  const event = {
    id: "event",
    kind: "note",
    payload: { historicalField: "retained" },
    conflict: false,
    published: true,
    captured_at: "2026-09-07T09:00:00Z",
    title: "Visit",
  };
  const file = {
    id: "file",
    name: "before",
    mime: "image/webp",
    classification: "before",
    published: true,
    created_at: "2026-09-07T09:00:00Z",
  };
  globalThis.fetch = async (input, init) => {
    assert.equal(init?.method, "GET");
    const path = String(input);
    assert.ok(
      [
        "/api/v1/properties",
        "/api/v1/properties/property/timeline",
        "/api/v1/properties/property/files",
      ].includes(path),
    );
    return Response.json(
      path.endsWith("/timeline")
        ? [event]
        : path.endsWith("/files")
          ? [file]
          : [property],
    );
  };
  try {
    const [p] = await listDashboardProperties();
    assert.deepEqual(p, property);
    assert.equal(p.access_instructions, undefined);
    assert.equal(p.acreage, null);
    assert.deepEqual(await getPropertyTimeline("property"), [event]);
    assert.deepEqual(await listPropertyFiles("property"), [file]);
  } finally {
    globalThis.fetch = original;
  }
});

test("generated property-area transport preserves authorized route and optional details", async () => {
  const { listPropertyAreas, createPropertyArea } =
    await import("@workspace/api-client-react/dashboard");
  const original = globalThis.fetch;
  const calls: { url: string; init?: RequestInit }[] = [];
  const area = {
    id: "area",
    property_id: "property",
    name: "North pasture",
    description: "Seasonal drainage watch.",
    acreage: "12.5",
  };
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return Response.json([area]);
  };
  try {
    assert.deepEqual(await listPropertyAreas("property"), [area]);
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      "/api/v1/properties/property/areas",
    );
    assert.equal(calls.at(-1)!.init?.method, "GET");
    await createPropertyArea("property", {
      name: "North pasture",
      description: "Seasonal drainage watch.",
      acreage: 12.5,
    });
    assert.equal(calls.at(-1)!.init?.method, "POST");
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), {
      name: "North pasture",
      description: "Seasonal drainage watch.",
      acreage: 12.5,
    });
  } finally {
    globalThis.fetch = original;
  }
});

test("generated binary upload preserves exact bytes, typed target headers and native auth headers", async () => {
  const { uploadFieldPhoto, getPrivateFileContent } =
    await import("@workspace/api-client-react/dashboard");
  const original = globalThis.fetch;
  const bytes = new Uint8Array([137, 80, 78, 71, 0, 255, 3]);
  const blob = new Blob([bytes], { type: "image/png" });
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    calls++;
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      "Bearer synthetic-test-token",
    );
    if (String(input).endsWith("/content"))
      return new Response(blob, { headers: { "Content-Type": "image/png" } });
    assert.equal(init?.method, "POST");
    assert.equal(init?.body, blob);
    assert.deepEqual(
      new Uint8Array(await (init?.body as Blob).arrayBuffer()),
      bytes,
    );
    const h = new Headers(init?.headers);
    assert.equal(h.get("Content-Type"), "image/png");
    assert.equal(h.get("x-p1-property"), "property");
    assert.equal(h.get("x-p1-work"), "work");
    assert.equal(h.get("x-p1-classification"), "before");
    return Response.json({ id: "photo", status: "accepted" }, { status: 201 });
  };
  const options = {
    headers: new Headers({ Authorization: "Bearer synthetic-test-token" }),
  };
  try {
    assert.deepEqual(
      await uploadFieldPhoto(
        "photo",
        blob,
        {
          "x-p1-property": "property",
          "x-p1-work": "work",
          "x-p1-classification": "before",
        },
        options,
      ),
      { id: "photo", status: "accepted" },
    );
    const downloaded = await getPrivateFileContent("photo", options);
    assert.deepEqual(new Uint8Array(await downloaded.arrayBuffer()), bytes);
    await assert.rejects(
      uploadFieldPhoto(
        "photo",
        new Blob([bytes]),
        { "x-p1-property": "property", "x-p1-work": "work" },
        options,
      ),
      /must declare/,
    );
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
  }
});
