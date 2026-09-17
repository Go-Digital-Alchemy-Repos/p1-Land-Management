import { hasCapability, type Capability } from "@workspace/api-zod/business-access";
export type DashboardView =
  | "Overview"
  | "Properties"
  | "Clients"
  | "Schedule"
  | "My Day"
  | "Sales"
  | "Agreements"
  | "Billing"
  | "Requests"
  | "Recurring"
  | "Projects"
  | "Inspections"
  | "Expenses"
  | "Settings"
  | "Profile";

export type SettingsSection =
  | "people"
  | "security"
  | "integrations"
  | "preferences"
  | "term-libraries";

export type NavigationGroup =
  | "Workspace"
  | "Customers"
  | "Operations"
  | "Revenue"
  | "Settings";

export type RecordRoute =
  | { kind: "client"; id: string; tab: ClientWorkspaceTab }
  | { kind: "property"; id: string; tab: PropertyWorkspaceTab }
  | { kind: "work-order"; id: string }
  | { kind: "agreement"; id: string };

export type ClientWorkspaceTab =
  | "overview"
  | "properties"
  | "contacts"
  | "agreements"
  | "schedule"
  | "requests"
  | "projects"
  | "notes";

export type PropertyWorkspaceTab =
  | "overview"
  | "schedule"
  | "agreements"
  | "requests"
  | "projects"
  | "inspections"
  | "notes-files";

export type DashboardPageRoute = {
  view: DashboardView;
  label: string;
  path: string;
  group: NavigationGroup;
  settingsSection?: SettingsSection;
  navigation?: boolean;
};

export type DashboardRoute =
  | { kind: "page"; page: DashboardPageRoute; record?: RecordRoute }
  | { kind: "not-found" };

export const DASHBOARD_PAGES: readonly DashboardPageRoute[] = [
  { view: "Overview", label: "Overview", path: "/", group: "Workspace" },
  { view: "My Day", label: "My day", path: "/my-day", group: "Workspace" },
  { view: "Properties", label: "Properties", path: "/properties", group: "Customers" },
  { view: "Clients", label: "Clients", path: "/clients", group: "Customers" },
  { view: "Requests", label: "Requests", path: "/requests", group: "Customers" },
  { view: "Schedule", label: "Schedule", path: "/schedule", group: "Operations" },
  { view: "Recurring", label: "Recurring", path: "/recurring", group: "Operations" },
  { view: "Projects", label: "Projects", path: "/projects", group: "Operations" },
  { view: "Inspections", label: "Inspections", path: "/inspections", group: "Operations" },
  { view: "Sales", label: "Sales", path: "/sales", group: "Revenue" },
  { view: "Agreements", label: "Agreements", path: "/agreements", group: "Revenue" },
  { view: "Billing", label: "Billing", path: "/billing", group: "Revenue" },
  { view: "Expenses", label: "Expenses", path: "/expenses", group: "Revenue" },
  { view: "Profile", label: "My profile", path: "/profile", group: "Workspace", navigation: false },
  { view: "Settings", label: "User Manager", path: "/settings/people", group: "Settings", settingsSection: "people" },
  { view: "Settings", label: "Security", path: "/settings/security", group: "Settings", settingsSection: "security" },
  { view: "Settings", label: "Integrations", path: "/settings/integrations", group: "Settings", settingsSection: "integrations" },
  { view: "Settings", label: "Preferences", path: "/settings/preferences", group: "Settings", settingsSection: "preferences" },
  { view: "Settings", label: "Term libraries", path: "/settings/term-libraries", group: "Settings", settingsSection: "term-libraries" },
];

export const NAVIGATION_GROUPS: readonly NavigationGroup[] = [
  "Workspace",
  "Customers",
  "Operations",
  "Revenue",
  "Settings",
];

function normalizedPath(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/";
}

function validRecordId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function pageFor(view: DashboardView) {
  return DASHBOARD_PAGES.find((page) => page.view === view && !page.settingsSection);
}

function recordId(pathname: string, prefix: string) {
  if (!pathname.startsWith(prefix)) return null;
  const value = pathname.slice(prefix.length);
  return value && !value.includes("/") && validRecordId(value) ? value : null;
}

function workspaceRecord<T extends string>(
  pathname: string,
  prefix: string,
  tabs: readonly T[],
): { id: string; tab: T } | null {
  if (!pathname.startsWith(prefix)) return null;
  const parts = pathname.slice(prefix.length).split("/");
  if (!parts[0] || !validRecordId(parts[0]) || parts.length > 2 || (parts[1] && !tabs.includes(parts[1] as T)))
    return null;
  return { id: parts[0], tab: (parts[1] || "overview") as T };
}

const CLIENT_TABS: readonly ClientWorkspaceTab[] = [
  "overview", "properties", "contacts", "agreements", "schedule", "requests", "projects", "notes",
];
const PROPERTY_TABS: readonly PropertyWorkspaceTab[] = [
  "overview", "schedule", "agreements", "requests", "projects", "inspections", "notes-files",
];

export function routeFromPath(pathname: string): DashboardRoute {
  const path = normalizedPath(pathname);
  const page = DASHBOARD_PAGES.find((candidate) => candidate.path === path);
  if (page) return { kind: "page", page };

  const client = workspaceRecord(path, "/clients/", CLIENT_TABS);
  if (client) {
    return { kind: "page", page: pageFor("Clients")!, record: { kind: "client", ...client } };
  }
  const property = workspaceRecord(path, "/properties/", PROPERTY_TABS);
  if (property) {
    return { kind: "page", page: pageFor("Properties")!, record: { kind: "property", ...property } };
  }
  const scheduleWorkId = recordId(path, "/schedule/work-orders/");
  if (scheduleWorkId) {
    return { kind: "page", page: pageFor("Schedule")!, record: { kind: "work-order", id: scheduleWorkId } };
  }
  const dayWorkId = recordId(path, "/my-day/work-orders/");
  if (dayWorkId) {
    return { kind: "page", page: pageFor("My Day")!, record: { kind: "work-order", id: dayWorkId } };
  }
  const agreementId = recordId(path, "/agreements/");
  if (agreementId) {
    return { kind: "page", page: pageFor("Agreements")!, record: { kind: "agreement", id: agreementId } };
  }
  return { kind: "not-found" };
}

export function pathForRoute(route: Extract<DashboardRoute, { kind: "page" }>) {
  if (!route.record) return route.page.path;
  switch (route.record.kind) {
    case "client":
      return `/clients/${encodeURIComponent(route.record.id)}${route.record.tab === "overview" ? "" : `/${route.record.tab}`}`;
    case "property":
      return `/properties/${encodeURIComponent(route.record.id)}${route.record.tab === "overview" ? "" : `/${route.record.tab}`}`;
    case "work-order":
      return `${route.page.view === "My Day" ? "/my-day" : "/schedule"}/work-orders/${encodeURIComponent(route.record.id)}`;
    case "agreement":
      return `/agreements/${encodeURIComponent(route.record.id)}`;
  }
}

const viewCapability: Partial<Record<DashboardView, Capability>> = {
  Overview: "workspace.overview", "My Day": "workspace.my-day",
  Clients: "customers.clients", Properties: "customers.properties", Requests: "customers.requests",
  Schedule: "operations.schedule", Recurring: "operations.recurring", Projects: "operations.projects", Inspections: "operations.inspections",
  Sales: "revenue.sales", Agreements: "revenue.agreements", Billing: "revenue.billing", Expenses: "revenue.expenses",
};
export function defaultRouteForRole(role: string | null | undefined, capabilities?: readonly string[]) {
  const page = role === "crew" ? pageFor("My Day")! :
    DASHBOARD_PAGES.find(page => page.navigation !== false && canAccessRoute({ kind: "page", page }, role, capabilities)) ?? pageFor("Profile")!;
  return { kind: "page", page } as const;
}

export function canAccessRoute(route: DashboardRoute, role: string | null | undefined, capabilities?: readonly string[]) {
  if (route.kind !== "page" || !role) return false;
  const { view, settingsSection } = route.page;
  if (view === "Profile") return true;
  // Field and customer portals keep their existing record-scoped routes.
  if (role === "crew") return ["My Day", "Properties"].includes(view);
  if (role === "client") return ["Overview", "Properties", "Schedule", "Sales", "Billing", "Requests", "Inspections"].includes(view);
  if (settingsSection === "people" || settingsSection === "integrations" || settingsSection === "security") return role === "owner";
  const subject = { role, capabilities };
  if (settingsSection === "preferences") return hasCapability(subject, "settings.preferences");
  if (settingsSection === "term-libraries") return hasCapability(subject, "settings.term-libraries");
  if (view === "Agreements" && hasCapability(subject, "revenue.billing")) return true;
  const permission = viewCapability[view];
  return permission ? hasCapability(subject, permission) : false;
}
