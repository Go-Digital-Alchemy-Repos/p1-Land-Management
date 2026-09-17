/** Shared capability vocabulary. Persist leaf grants; never persist group wildcards. */
export const ACCESS_GROUPS = [
  {
    id: "workspace",
    label: "Workspace",
    tools: [
      { id: "workspace.overview", label: "Overview" },
      { id: "workspace.my-day", label: "My day" },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    tools: [
      { id: "customers.clients", label: "Clients" },
      { id: "customers.properties", label: "Properties" },
      { id: "customers.requests", label: "Requests" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    tools: [
      { id: "operations.schedule", label: "Schedule" },
      { id: "operations.recurring", label: "Recurring" },
      { id: "operations.projects", label: "Projects" },
      { id: "operations.inspections", label: "Inspections" },
    ],
  },
  {
    id: "revenue",
    label: "Revenue",
    tools: [
      { id: "revenue.sales", label: "Sales" },
      { id: "revenue.agreements", label: "Agreements" },
      {
        id: "revenue.agreement-templates.manage",
        label: "Manage agreement templates",
      },
      { id: "revenue.billing", label: "Billing" },
      { id: "revenue.expenses", label: "Expenses" },
    ],
  },
  {
    id: "marketing.content",
    label: "Marketing · Content",
    tools: [
      { id: "marketing.content.website", label: "Website editor" },
      { id: "marketing.content.pages", label: "Pages" },
      { id: "marketing.content.team", label: "Team biographies" },
      { id: "marketing.content.forms", label: "Forms" },
      { id: "marketing.content.blog", label: "Blog" },
      { id: "marketing.content.galleries", label: "Galleries" },
      { id: "marketing.content.media", label: "Media" },
      { id: "marketing.content.sections", label: "Sections" },
      { id: "marketing.content.seo", label: "SEO" },
      { id: "marketing.content.menus", label: "Menus" },
      { id: "marketing.content.sidebars", label: "Sidebars & widgets" },
    ],
  },
  {
    id: "marketing.design",
    label: "Marketing · Design",
    tools: [
      { id: "marketing.design.branding", label: "Branding" },
      { id: "marketing.design.colors", label: "Color palette" },
      { id: "marketing.design.social-media", label: "Social media" },
      { id: "marketing.design.typography", label: "Typography" },
    ],
  },
  {
    id: "marketing.reporting",
    label: "Marketing · Reporting",
    tools: [
      { id: "marketing.analytics.view", label: "Google Analytics" },
      { id: "marketing.search-console.view", label: "Search Console" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    tools: [
      { id: "settings.preferences", label: "Business preferences" },
      { id: "settings.term-libraries", label: "Term libraries" },
    ],
  },
] as const;

export type Capability = (typeof ACCESS_GROUPS)[number]["tools"][number]["id"];
export const CAPABILITIES: readonly Capability[] = ACCESS_GROUPS.flatMap(
  (group) => group.tools.map((tool) => tool.id),
);
const known = new Set<string>(CAPABILITIES);
export function isCapability(value: unknown): value is Capability {
  return typeof value === "string" && known.has(value);
}

export interface CapabilitySubject {
  role: string | null;
  capabilities?: readonly string[];
}

/** Missing, malformed and future capabilities fail closed, including for owners. */
export function hasCapability(
  subject: CapabilitySubject,
  capability: string,
): boolean {
  return (
    isCapability(capability) &&
    subject.role !== "client" &&
    (subject.role === "owner" ||
      Boolean(subject.role && subject.capabilities?.includes(capability)))
  );
}

/** A group operation only affects its known leaf IDs, preserving unrelated choices. */
export function selectAccessGroup(
  current: readonly string[],
  groupId: string,
  checked: boolean,
): Capability[] {
  const selected = new Set(current.filter(isCapability));
  const group = ACCESS_GROUPS.find((group) => group.id === groupId);
  for (const tool of group?.tools ?? []) {
    if (checked) selected.add(tool.id);
    else selected.delete(tool.id);
  }
  return CAPABILITIES.filter((id) => selected.has(id));
}

export function accessGroupState(
  current: readonly string[],
  groupId: string,
): "none" | "some" | "all" {
  const group = ACCESS_GROUPS.find((group) => group.id === groupId);
  if (!group) return "none";
  const count = group.tools.filter((tool) => current.includes(tool.id)).length;
  return count === 0 ? "none" : count === group.tools.length ? "all" : "some";
}

/** Review suggestions only. Never used for runtime authorization or automatic grants. */
export function suggestedLegacyCapabilities(role: string): Capability[] {
  const views: Record<string, readonly Capability[]> = {
    manager: [
      "workspace.overview",
      "workspace.my-day",
      "customers.clients",
      "customers.properties",
      "customers.requests",
      "operations.schedule",
      "operations.recurring",
      "operations.projects",
      "operations.inspections",
      "revenue.sales",
      "revenue.agreements",
      "revenue.billing",
      "revenue.expenses",
      "settings.preferences",
      "settings.term-libraries",
    ],
    dispatch: [
      "workspace.overview",
      "workspace.my-day",
      "customers.clients",
      "customers.properties",
      "customers.requests",
      "operations.schedule",
      "operations.recurring",
      "operations.projects",
      "operations.inspections",
      "revenue.agreements",
    ],
    sales: [
      "workspace.overview",
      "customers.clients",
      "customers.properties",
      "revenue.sales",
    ],
    finance: [
      "workspace.overview",
      "customers.clients",
      "customers.properties",
      "revenue.agreements",
      "revenue.billing",
      "revenue.expenses",
    ],
    crew: ["workspace.my-day", "customers.properties"],
  };
  return [...(views[role] ?? [])];
}
