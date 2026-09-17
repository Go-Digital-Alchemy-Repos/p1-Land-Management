/** Customer review and exported documents must identify the same expiry instant. */
export function formatEstimateExpiry(value: string | Date): string {
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(value)) + " UTC"
  );
}

export type ComposedProposalDocument = {
  schemaVersion: 1;
  preparedOn: string | null;
  startsOn: string | null;
  endsOn: string | null;
  terms: string;
  scopeNotes: string;
  costNotes: string;
  packageNotes: string;
  exclusions: string;
  authorizedAmountCents: number;
  components: {
    title: string;
    basis: "one_time" | "fixed_monthly" | "per_visit";
    scope: { title: string; description: string }[];
    costs: {
      description: string;
      quantity: number;
      unit: string;
      unitPriceCents: number;
      totalCents: number;
    }[];
    rateCents: number;
    authorizedAmountCents: number;
    maximumVisits: number | null;
    periods: { startsOn: string; endsOn: string; amountCents: number }[];
    schedule: {
      cadence: "weekly" | "monthly";
      intervalCount: number;
      localTime: string;
      firstVisitOn: string;
      timeZone: "America/New_York";
    } | null;
  }[];
};
export type ProposalBlock = {
  text: string;
  kind?: "title" | "heading" | "body" | "muted";
};
const proposalMoney = (cents: number) => `$${(cents / 100).toFixed(2)} USD`;
/** One ordered customer narrative for HTML and PDF. Never includes private
 * template/source IDs, pricing review reasons, actor IDs or retry metadata. */
export function composedProposalBlocks(
  doc: ComposedProposalDocument,
): ProposalBlock[] {
  const blocks: ProposalBlock[] = [];
  if (doc.preparedOn) blocks.push({ text: `Prepared on: ${doc.preparedOn}` });
  if (doc.startsOn || doc.endsOn)
    blocks.push({
      text: `Agreement term: ${doc.startsOn || "Not specified"} through ${doc.endsOn || "Not specified"}`,
    });
  for (const component of doc.components) {
    blocks.push({ kind: "heading", text: component.title });
    for (const item of component.scope)
      blocks.push({
        text: [item.title, item.description].filter(Boolean).join("\n"),
      });
    blocks.push({ kind: "heading", text: "Cost breakdown" });
    const basis =
      component.basis === "one_time"
        ? "one time"
        : component.basis === "fixed_monthly"
          ? "per month"
          : "per visit";
    for (const item of component.costs) {
      blocks.push({ text: item.description });
      blocks.push({
        kind: "muted",
        text: `${item.quantity} ${item.unit} × ${proposalMoney(item.unitPriceCents)} = ${proposalMoney(item.totalCents)} ${basis}`,
      });
    }
    blocks.push({
      text: `Combined rate: ${proposalMoney(component.rateCents)} ${basis}`,
    });
    if (component.maximumVisits !== null)
      blocks.push({
        text: `Maximum authorized visits: ${component.maximumVisits}`,
      });
    for (const period of component.periods)
      blocks.push({
        text: `Monthly charge: ${period.startsOn} through ${period.endsOn} — ${proposalMoney(period.amountCents)}`,
      });
    blocks.push({
      kind: "heading",
      text: `Component authorization limit: ${proposalMoney(component.authorizedAmountCents)}`,
    });
    const schedule = component.schedule;
    if (schedule)
      blocks.push({
        text: `Service schedule: every ${schedule.intervalCount} ${schedule.cadence === "weekly" ? (schedule.intervalCount === 1 ? "week" : "weeks") : schedule.intervalCount === 1 ? "month" : "months"}, starting ${schedule.firstVisitOn} at ${schedule.localTime} (${schedule.timeZone}).`,
      });
  }
  for (const [heading, text] of [
    ["Scope notes", doc.scopeNotes],
    ["Exclusions", doc.exclusions],
    ["Cost notes", doc.costNotes],
    ["Package notes", doc.packageNotes],
  ])
    if (text) blocks.push({ kind: "heading", text: heading }, { text });
  blocks.push({
    kind: "heading",
    text: `Maximum authorized amount: ${proposalMoney(doc.authorizedAmountCents)}`,
  });
  blocks.push(
    { kind: "heading", text: "Agreement terms" },
    { text: doc.terms },
  );
  return blocks;
}
