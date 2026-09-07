import { createRoot } from "react-dom/client";
import { ServiceAgreements } from "../src/ServiceAgreements";
import "../src/style.css";
let role = new URLSearchParams(location.search).get("role") || "manager";
const uid = (n: number) =>
  "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const property = uid(1),
  recurrence = uid(2),
  estimate = uid(3),
  id = uid(4),
  period = uid(5),
  draft = uid(6),
  nextEstimate = uid(7),
  charge = uid(9),
  reviewEvent = uid(10);
let agreement = {
  id,
  propertyId: property,
  recurringServiceId: recurrence,
  estimateId: estimate,
  predecessorId: null as string | null,
  title: "Grounds maintenance",
  startsOn: "2099-01-01",
  endsOn: "2099-01-31",
  billingMode: "fixed_monthly",
  unitAmountCents: null,
  scope: "Approved mowing and inspection scope",
  estimateRevision: 1,
  status: "draft",
  version: 1,
  activatedOn: null as string | null,
  cancellationEffectiveOn: null as string | null,
  cancellationReason: null as string | null,
  periods: [
    {
      id: period,
      startsOn: "2099-01-01",
      endsOn: "2099-01-31",
      amountCents: 1000,
    },
  ],
};
let conflict = true,
  prepared = false,
  reviewVersion = 0,
  recordedOperationId: string | null = null,
  loseFirstReviewResponse = true,
  reviewState = "unreviewed" as
    | "unreviewed"
    | "kept_due"
    | "correction_required"
    | "stale_review";
const currentReview = () => ({
  chargeId: charge,
  agreementId: agreement.id,
  reviewVersion,
  latestReceipt:
    reviewVersion === 0
      ? null
      : {
          eventId: reviewEvent,
          chargeId: charge,
          reviewVersion,
          outcome:
            reviewState === "correction_required"
              ? "correction_required"
              : "keep_due",
          recordedAt: "2099-01-01T00:00:00.000Z",
        },
  correctionPending: reviewState === "correction_required",
  cancellationVersion: agreement.version,
  snapshot: {
    agreement: {
      id: agreement.id,
      version: agreement.version,
      cancellationDate: agreement.cancellationEffectiveOn,
      cancellationReason: agreement.cancellationReason,
    },
    charge: { id: charge, sourceKey: "period:" + period, amountCents: 1000 },
    draft: {
      id: draft,
      propertyId: property,
      estimateId: estimate,
      title: "Grounds maintenance",
      kind: "service",
      amountCents: 1000,
      status: "draft",
      postingRequestId: null,
      postingPayloadSha256: null,
      quickbooksId: null,
      balanceCents: 1000,
      ownershipVerified: true,
    },
  },
  snapshotSha256: "a".repeat(64),
  allowedOutcomes:
    reviewState === "correction_required"
      ? ["correction_required"]
      : ["keep_due", "correction_required"],
  postingBlockReason:
    reviewState === "kept_due"
      ? null
      : "Review this cancellation-affected charge before posting.",
  reviewState,
});
const trace: { path: string; method: string; body: unknown }[] = [];
(window as any).agreementTrace = trace;
const original = window.fetch;
window.fetch = async (input, options) => {
  const path = String(input);
  if (!path.startsWith("/api/v1/")) return original(input, options);
  const method = options?.method || "GET",
    body = options?.body ? JSON.parse(String(options.body)) : undefined;
  trace.push({ path, method, body });
  const projection = () =>
    role === "dispatch"
      ? Object.fromEntries(
          [
            "id",
            "propertyId",
            "recurringServiceId",
            "title",
            "startsOn",
            "endsOn",
            "status",
            "scope",
            "cancellationEffectiveOn",
          ].map((k) => [k, (agreement as any)[k]]),
        )
      : agreement;
  let data: unknown;
  if (path.startsWith("/api/v1/service-agreements?"))
    data = { items: [projection()], nextCursor: null };
  else if (path === "/api/v1/properties")
    data = [
      {
        id: property,
        client_id: uid(8),
        name: "Meadow property",
        address: "Synthetic fixture",
        acreage: null,
      },
    ];
  else if (path === "/api/v1/recurring-services")
    data = [
      {
        id: recurrence,
        property_id: property,
        title: "Monthly visits",
        billing_mode: "fixed_monthly",
        property_name: "Meadow property",
      },
    ];
  else if (path === "/api/v1/estimates")
    data = [estimate, nextEstimate].map((id, i) => ({
      id,
      property_id: property,
      title: i ? "Renewal scope" : "Original scope",
      scope: "Approved scope",
      revision: 1,
      amount_cents: "10000",
      status: "approved",
      property_name: "Meadow property",
    }));
  else if (path.startsWith("/api/v1/agreement-charge-queue"))
    data = {
      items:
        agreement.status === "draft" || reviewState === "kept_due"
          ? []
          : [
              {
                key: "period:" + period,
                propertyId: property,
                agreementId: agreement.id,
                periodStart: "2099-01-01",
                workOrderId: null,
                state:
                  agreement.status === "cancelled"
                    ? "review_required"
                    : "ready",
                reason:
                  agreement.status === "cancelled"
                    ? "Prepared charge affected by cancellation"
                    : null,
                amountCents: 1000,
                billingDraftId: prepared ? draft : null,
                chargeId: prepared ? charge : undefined,
                reviewVersion: prepared ? reviewVersion : undefined,
                reviewState: prepared ? reviewState : undefined,
                latestReviewReceipt:
                  prepared && reviewVersion
                    ? currentReview().latestReceipt
                    : undefined,
              },
            ],
      nextCursor: null,
    };
  else if (path.endsWith("/activation-preview"))
    data = {
      agreementId: agreement.id,
      version: agreement.version,
      startsOn: agreement.startsOn,
      endsOn: agreement.endsOn,
      billingMode: agreement.billingMode,
      approvedCents: 10000,
      billedCents: 0,
      remainingCents: 10000,
      plannedCents: 1000,
      perVisitCents: null,
      periods: agreement.periods,
      canActivate: true,
      blockedReasons: [],
    };
  else if (path.endsWith("/charge-preview"))
    data = {
      agreementId: agreement.id,
      sourceKey: "period:2099-01-01",
      amountCents: 1000,
      alreadyPrepared: prepared,
      billingDraftId: prepared ? draft : null,
      approvedCents: 10000,
      billedCents: prepared ? 1000 : 0,
      remainingCents: prepared ? 9000 : 10000,
    };
  else if (path === "/api/v1/agreement-charges/" + charge + "/review")
    data = currentReview();
  else if (path === "/api/v1/agreement-charges/" + charge + "/review-preview") {
    const current = currentReview();
    if (
      body.expectedReviewVersion !== current.reviewVersion ||
      body.cancellationVersion !== current.cancellationVersion ||
      body.snapshotSha256 !== current.snapshotSha256
    )
      return Response.json({ error: "Snapshot changed" }, { status: 409 });
    data = {
      current,
      wouldResolveSnapshot: body.outcome === "keep_due",
      postingWouldRemainBlocked: body.outcome === "correction_required",
    };
  } else if (path === "/api/v1/agreement-charges/" + charge + "/reviews") {
    if (recordedOperationId && body.operationId !== recordedOperationId)
      return Response.json({ error: "Operation ID changed" }, { status: 409 });
    if (!recordedOperationId) {
      recordedOperationId = body.operationId;
      reviewVersion++;
      reviewState = body.outcome;
      if (loseFirstReviewResponse) {
        loseFirstReviewResponse = false;
        return Response.json(
          { error: "Synthetic response loss after persistence" },
          { status: 503 },
        );
      }
    }
    data = {
      eventId: reviewEvent,
      chargeId: charge,
      reviewVersion,
      outcome: body.outcome,
      recordedAt: "2099-01-01T00:00:00.000Z",
    };
  } else if (
    path === "/api/v1/service-agreements/" + agreement.id + "/charges" &&
    method === "GET"
  ) {
    data = {
      items: prepared
        ? [
            {
              chargeId: charge,
              agreementId: agreement.id,
              sourceKey: "period:" + period,
              createdAt: "2099-01-01T00:00:00.000Z",
              amountCents: 1000,
              billingDraftId: draft,
              reviewVersion,
              reviewState,
              latestReceipt: currentReview().latestReceipt,
            },
          ]
        : [],
      nextCursor: null,
    };
  } else if (path.endsWith("/charges")) {
    prepared = true;
    data = {
      id: charge,
      agreementId: agreement.id,
      sourceKey: "period:2099-01-01",
      amountCents: 1000,
      billingDraftId: draft,
    };
  } else if (path.endsWith("/activate")) {
    agreement = {
      ...agreement,
      status: "active",
      activatedOn: "2099-01-01",
      version: agreement.version + 1,
    };
    data = agreement;
  } else if (path.endsWith("/cancel")) {
    agreement = {
      ...agreement,
      status: "cancelled",
      cancellationEffectiveOn: body.effectiveOn,
      cancellationReason: body.reason,
      version: agreement.version + 1,
    };
    data = agreement;
  } else if (path === "/api/v1/service-agreements" && method === "POST") {
    agreement = {
      ...agreement,
      ...body.terms,
      id: body.id,
      estimateId: body.estimateId,
      predecessorId: body.predecessorId,
      status: "draft",
      version: 1,
      activatedOn: null,
      cancellationEffectiveOn: null,
      cancellationReason: null,
      periods: body.terms.periods.map((p: any) => ({ ...p, id: period })),
    };
    data = agreement;
  } else if (
    path.startsWith("/api/v1/service-agreements/") &&
    method === "PATCH"
  ) {
    if (conflict) {
      conflict = false;
      agreement = {
        ...agreement,
        version: agreement.version + 1,
        title: "Another manager title",
      };
      return Response.json(
        { error: "Agreement changed; reload before saving" },
        { status: 409 },
      );
    }
    if (body.version !== agreement.version)
      return Response.json(
        { error: "Agreement changed; reload before saving" },
        { status: 409 },
      );
    agreement = {
      ...agreement,
      ...body.terms,
      periods: body.terms.periods.map((p: any) => ({ ...p, id: period })),
      version: agreement.version + 1,
    };
    data = agreement;
  } else if (path.startsWith("/api/v1/service-agreements/"))
    data = projection();
  else
    return Response.json(
      { error: "Unexpected fixture endpoint " + path },
      { status: 500 },
    );
  return Response.json(data, {
    status:
      method === "POST" && path === "/api/v1/service-agreements" ? 201 : 200,
  });
};
const root = createRoot(document.getElementById("root")!);
(window as any).switchAgreementRole = (next: string) => {
  role = next;
  root.render(<ServiceAgreements role={role} />);
};
root.render(<ServiceAgreements role={role} />);
