import { createLostAcknowledgement } from "./crew-joined-ack.mjs";
/** Disposable fixture only. Browser interaction is performed separately through CUA. */
import { createRequire } from "node:module";
import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { pool } from "../../artifacts/api-server/src/dashboard/database";
import { api } from "../../artifacts/api-server/src/dashboard/api";
import { operationsApi } from "../../artifacts/api-server/src/dashboard/operations";
import {
  jobsLifecycleApi,
  estimatePublicApi,
} from "../../artifacts/api-server/src/dashboard/jobs-lifecycle";
import { agreementCompositionApi } from "../../artifacts/api-server/src/dashboard/agreement-composition.routes";
import {
  createComposition,
  editComposition,
} from "../../artifacts/api-server/src/dashboard/agreement-composition.service";
import { saveCompositionPricing } from "../../artifacts/api-server/src/dashboard/agreement-pricing.service";
import { prepareAgreementCharge } from "../../artifacts/api-server/src/dashboard/service-agreement.billing";
import { generateRecurring } from "../../artifacts/api-server/src/dashboard/recurrence";
const require = createRequire(resolve("artifacts/api-server/package.json")),
  express = require("express");
const url = new URL(process.env.DASHBOARD_DATABASE_URL!);
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.pathname, "/p1_crew_joined_fixture");
const origin = process.env.DASHBOARD_ORIGIN!;
assert.equal(new URL(origin).hostname, "127.0.0.1");
const control = process.env.P1_FIXTURE_CONTROL!;
assert(control.length >= 32);
const app = express();
app.use(express.json());
let crewCookie = "",
  managerCookie = "",
  workId = "",
  agreementId = "",
  ready = false;
const lostAck = createLostAcknowledgement();
const batches = lostAck.batches;
let initialBlocked = false,
  apiOffline = false;
const actor = {
  id: randomUUID(),
  name: "Fixture Manager",
  role: "manager" as const,
  capabilities: ["revenue.billing" as const],
};
const protectedControl = (req: any, res: any, next: any) => {
  const token = String(req.headers["x-fixture-control"] || "");
  if (
    token.length !== control.length ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(control))
  )
    return res.sendStatus(403);
  next();
};
app.get("/__fixture/crew", (req: any, res: any) => {
  if (!ready) return res.sendStatus(503);
  res.setHeader("Set-Cookie", crewCookie + "; Path=/; HttpOnly; SameSite=Lax");
  res.redirect("/my-day");
});
app.post("/__fixture/network", protectedControl, (req: any, res: any) => {
  assert.equal(typeof req.body.offline, "boolean");
  apiOffline = req.body.offline;
  res.json({
    apiUnavailable: apiOffline,
    scope: "simulated API outage, not browser offline mode",
  });
});
app.get("/__fixture/status", async (_req: any, res: any) => {
  if (!ready) return res.json({ ready: false });
  const work = (
    await pool.query("SELECT status,version FROM work_order WHERE id=$1", [
      workId,
    ])
  ).rows[0];
  res.json({
    ready: true,
    workId,
    work,
    batches: batches.map((b) => b.length),
    initialBillingBlocked: initialBlocked,
  });
});
const call = async (path: string, body: any, cookie = managerCookie) => {
  const r = await fetch(origin + path, {
    method: "POST",
    headers: { cookie, origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  assert(r.ok, `Fixture request failed ${r.status}`);
  return r.json() as any;
};
app.post(
  "/__fixture/verify",
  protectedControl,
  async (_req: any, res: any, next: any) => {
    try {
      const work = (
        await pool.query("SELECT status,version FROM work_order WHERE id=$1", [
          workId,
        ])
      ).rows[0];
      assert.equal(work.status, "completed");
      assert(batches.length >= 2);
      assert.deepEqual(batches[0], batches[1]);
      const events = (
        await pool.query(
          "SELECT id,kind FROM field_event WHERE work_order_id=$1",
          [workId],
        )
      ).rows;
      assert.equal(events.length, batches[0].length);
      assert.deepEqual(events.map((e) => e.id).sort(), [...batches[0]].sort());
      assert(lostAck.receipts.length >= 2);
      for (const receipt of lostAck.receipts.slice(0, 2)) {
        assert.equal(receipt.status, 200);
        assert.deepEqual(
          receipt.results.map((r: any) => r.id),
          batches[0],
        );
        assert(receipt.results.every((r: any) => r.status === "accepted"));
      }
      assert(events.some((e) => e.kind === "time"));
      assert(events.some((e) => e.kind === "complete"));
      await assert.rejects(
        prepareAgreementCharge(actor, agreementId, { workOrderId: workId }),
        /manager-reviewed/,
      );
      await call(`/api/v1/work-orders/${workId}/status`, {
        status: "reviewed",
        version: work.version,
      });
      const receipt = await prepareAgreementCharge(actor, agreementId, {
        workOrderId: workId,
      });
      assert.deepEqual(
        await prepareAgreementCharge(actor, agreementId, {
          workOrderId: workId,
        }),
        receipt,
      );
      const evidence = {
        status: "passed",
        approvalAndActivation: true,
        realCrewEvents: events.length,
        stableReplayIds: true,
        billingBlockedBeforeReview: true,
        managerReview: true,
        billingRetrySameReceipt: true,
        providerWorkerStarted: false,
      };
      writeFileSync(
        process.env.P1_FIXTURE_EVIDENCE!,
        JSON.stringify(evidence, null, 2),
        { mode: 0o600 },
      );
      res.json(evidence);
    } catch (error) {
      next(error);
    }
  },
);
app.use(
  "/api/v1",
  (req: any, res: any, next: any) => {
    if (apiOffline)
      return res.status(503).json({ error: "Fixture API outage enabled" });
    if (!["GET", "HEAD"].includes(req.method) && req.headers.origin !== origin)
      return res.sendStatus(403);
    if (req.path === "/field/sync" && req.method === "POST") {
      lostAck.record(req.body.events || []);
      const original = res.json.bind(res);
      res.json = (body: any) => {
        if (lostAck.withhold(res.statusCode, body)) {
          res.status(503);
          return original({
            error:
              "Fixture acknowledgement deliberately withheld after real server acceptance",
          });
        }
        return original(body);
      };
    }
    next();
  },
  agreementCompositionApi,
  jobsLifecycleApi,
  api,
  operationsApi,
);
app.use("/api/public", estimatePublicApi);
app.use("/api", (_req: any, res: any) => res.sendStatus(404));
const dist = resolve("artifacts/p1-dashboard/dist");
app.use(express.static(dist));
app.get("/{*path}", (_req: any, res: any) =>
  res.sendFile(resolve(dist, "index.html")),
);
app.use((_error: any, _req: any, res: any, _next: any) =>
  res
    .status(500)
    .json({ error: "Fixture assertion failed; inspect sanitized checkpoint" }),
);
const server = app.listen(Number(new URL(origin).port), "127.0.0.1");
await new Promise<void>((r) => server.once("listening", r));
async function seed() {
  await pool.query(
    "INSERT INTO installation(id,completed_at) VALUES(1,now()) ON CONFLICT(id) DO UPDATE SET completed_at=now()",
  );
  const crew = randomUUID(),
    client = randomUUID(),
    property = randomUUID(),
    contact = randomUUID();
  for (const [id, role, name] of [
    [actor.id, "manager", "Fixture Manager"],
    [crew, "crew", "Fixture Crew"],
  ]) {
    await pool.query(
      'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
      [id, name, id + "@example.test"],
    );
    await pool.query("INSERT INTO staff_profile(user_id,role) VALUES($1,$2)", [
      id,
      role,
    ]);
    const token = randomUUID();
    await pool.query(
      'INSERT INTO session(id,"expiresAt",token,"userId") VALUES($1,now()+interval \'4 hours\',$2,$3)',
      [randomUUID(), token, id],
    );
    const cookie =
      "p1-dashboard.session_token=" +
      encodeURIComponent(
        token +
          "." +
          createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
            .update(token)
            .digest("base64"),
      );
    if (id === crew) crewCookie = cookie;
    else managerCookie = cookie;
  }
  await pool.query(
    "INSERT INTO business_account_access(user_id,capabilities) VALUES($1,$2)",
    [
      actor.id,
      [
        "revenue.sales",
        "operations.recurring",
        "operations.schedule",
        "revenue.billing",
      ],
    ],
  );
  await pool.query(
    "INSERT INTO client(id,name) VALUES($1,'Joined fixture client')",
    [client],
  );
  await pool.query(
    "INSERT INTO property(id,client_id,name,address) VALUES($1,$2,'Joined fixture property','Synthetic address')",
    [property, client],
  );
  await pool.query(
    "INSERT INTO contact(id,client_id,name,email) VALUES($1,$2,'Fixture recipient','recipient@example.test')",
    [contact, client],
  );
  const today = (
    await pool.query(
      "SELECT (now() AT TIME ZONE 'America/New_York')::date::text AS d",
    )
  ).rows[0].d;
  const draft = await createComposition(actor.id, {
    operationId: randomUUID(),
    title: "Joined offline acceptance visit",
    context: { clientId: client, propertyId: property },
    selection: {},
    dates: { startsOn: today, endsOn: today },
  });
  const scope = randomUUID();
  const edit = await editComposition(actor.id, draft.id, {
    expectedVersion: draft.version,
    title: draft.title,
    dates: draft.dates,
    content: {
      terms: "Synthetic acceptance terms",
      scope: {
        items: [
          {
            id: scope,
            title: "Inspect property",
            description: "Synthetic field acceptance",
          },
        ],
        exclusions: "",
      },
      costs: {
        items: [
          {
            id: randomUUID(),
            description: "Per visit",
            quantity: 1,
            unitPriceCents: 100,
            unit: "visit",
            basis: "per_visit",
          },
        ],
      },
      notes: { scope: "", cost: "", package: "" },
    },
  });
  const priced = await saveCompositionPricing(actor.id, edit.id, {
    expectedVersion: edit.version,
    allocations: [
      { basis: "per_visit", scopeRowIds: [scope], maximumVisits: 1 },
    ],
  });
  const prepared = await call(`/api/v1/agreement-drafts/${priced.id}/prepare`, {
    expectedVersion: priced.version,
    schedules: [
      {
        basis: "per_visit",
        cadence: "weekly",
        intervalCount: 1,
        localTime: "08:00",
        firstVisitOn: today,
      },
    ],
  });
  await call(`/api/v1/estimates/${prepared.estimateId}/send`, {
    recipientContactIds: [contact],
  });
  const outbox = (
    await pool.query("SELECT payload FROM outbox WHERE dedup_key=$1", [
      `estimate:${prepared.estimateId}:${contact}:v1`,
    ])
  ).rows[0];
  const approval = outbox.payload.text.split("/estimate-approval/")[1];
  await call(`/api/public/estimates/${approval}/decision`, {
    status: "approved",
  });
  const recurrence = (
    await pool.query(
      "SELECT id,agreement_id FROM recurring_service WHERE estimate_id=$1",
      [prepared.estimateId],
    )
  ).rows[0];
  agreementId = recurrence.agreement_id;
  await call(`/api/v1/recurring-jobs/${recurrence.id}/activate`, {
    assignedTo: crew,
    nextDate: today,
    localTime: "08:00",
  });
  await generateRecurring();
  const work = (
    await pool.query(
      "SELECT id,version FROM work_order WHERE recurring_service_id=$1",
      [recurrence.id],
    )
  ).rows[0];
  workId = work.id;
  await call(`/api/v1/work-orders/${workId}/status`, {
    status: "scheduled",
    version: work.version,
  });
  await assert.rejects(
    prepareAgreementCharge(actor, agreementId, { workOrderId: workId }),
    /manager-reviewed/,
  );
  initialBlocked = true;
  ready = true;
  console.log(
    JSON.stringify({
      ready: true,
      url: origin + "/__fixture/crew",
      status: origin + "/__fixture/status",
    }),
  );
}
seed().catch(() => {
  console.error("Fixture seed failed; no private diagnostics emitted");
  process.exitCode = 1;
  server.close();
  void pool.end();
});
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(() => void pool.end().then(() => process.exit(0))),
  );
