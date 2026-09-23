import { Router } from "express";
import { hasCapability } from "@workspace/api-zod/business-access";
import { actor } from "./access";
import { pool } from "./database";
import { listAgreementChargeQueue } from "./service-agreement.queue";

export type NeedsYouItem = {
  kind: "completed-work" | "old-requests" | "agreement-charges" | "unassigned-work" | "new-inquiries" | "client-estimates";
  count: number;
  href: string;
};

export const overviewNeedsYouApi = Router();
const tomorrowInNewYork = () => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date());
  const value = (part: string) => parts.find((item) => item.type === part)?.value;
  return new Date(Date.UTC(Number(value("year")), Number(value("month")) - 1, Number(value("day")) + 1))
    .toISOString().slice(0, 10);
};

/** Each count has the same grant and row scope as its destination list. */
overviewNeedsYouApi.get("/overview/needs-you", async (req, res) => {
  const user = await actor(req);
  const items: NeedsYouItem[] = [];
  const add = async (kind: NeedsYouItem["kind"], href: string, query: string, values: unknown[] = []) => {
    const row = (await pool.query<{ count: number }>(query, values)).rows[0];
    const count = Number(row?.count || 0);
    if (count) items.push({ kind, count, href });
  };
  if (user.role === "client") {
    await add("client-estimates", "/sales?estimate=sent",
      `SELECT count(*)::int AS count FROM estimate e JOIN property p ON p.id=e.property_id AND p.lifecycle='operational'
       WHERE e.status='sent' AND EXISTS(SELECT 1 FROM client_access ca WHERE ca.client_id=p.client_id AND ca.user_id=$1)`, [user.id]);
  } else if (user.role !== "crew") {
    if (hasCapability(user, "operations.schedule")) {
      await add("completed-work", "/schedule?status=completed",
        `SELECT count(*)::int AS count FROM work_order w JOIN property p ON p.id=w.property_id AND p.lifecycle='operational' WHERE w.status='completed'`);
      await add("unassigned-work", `/schedule?date=${tomorrowInNewYork()}&unassigned=1`,
        `SELECT count(*)::int AS count FROM work_order w JOIN property p ON p.id=w.property_id AND p.lifecycle='operational'
         WHERE w.status='scheduled' AND w.assigned_to IS NULL
           AND (w.scheduled_at AT TIME ZONE 'America/New_York')::date=((now() AT TIME ZONE 'America/New_York')::date+1)`);
    }
    if (hasCapability(user, "customers.requests"))
      await add("old-requests", "/requests?status=new&age=48h",
        `SELECT count(*)::int AS count FROM service_request r JOIN property p ON p.id=r.property_id AND p.lifecycle='operational'
         WHERE r.status='new' AND r.created_at<now()-interval '48 hours'`);
    if (hasCapability(user, "revenue.billing")) {
      // The queue applies financial eligibility and cancellation review rules.
      // Count only review-required rows; do not expose draft amounts.
      let after: string | undefined;
      let count = 0;
      do {
        const page = await listAgreementChargeQueue(user, { limit: 100, ...(after ? { after } : {}) });
        count += page.items.filter((item) => item.state === "review_required").length;
        after = page.nextCursor || undefined;
      } while (after);
      if (count) items.push({ kind: "agreement-charges", count, href: "/agreements" });
    }
    if (hasCapability(user, "revenue.sales"))
      await add("new-inquiries", "/sales?status=new",
        `SELECT count(*)::int AS count FROM lead WHERE status='new' AND inquiry_type='commercial_site_assessment'`);
  }
  // The first rows should be the most urgent, not the order SQL completes.
  const rank: Record<NeedsYouItem["kind"], number> = {
    "completed-work": 0, "old-requests": 1, "agreement-charges": 2,
    "unassigned-work": 3, "new-inquiries": 4, "client-estimates": 5,
  };
  res.setHeader("Cache-Control", "private, no-store");
  res.json(items.sort((a, b) => rank[a.kind] - rank[b.kind]).slice(0, 6));
});
