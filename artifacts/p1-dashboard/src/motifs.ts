import type { DashboardView, SettingsSection } from "./dashboard-routes";

const illustration = (name: string) => `url("/images/illustrations/${name}.webp")`;

const pageIllustrations: Record<Exclude<DashboardView, "Settings">, string> = {
  Overview: illustration("overview"),
  Properties: illustration("properties"),
  Clients: illustration("clients"),
  Schedule: illustration("schedule"),
  "My Day": illustration("my-day"),
  Sales: illustration("sales"),
  Agreements: illustration("agreements"),
  Billing: illustration("billing"),
  Requests: illustration("requests"),
  Recurring: illustration("recurring"),
  Projects: illustration("projects"),
  Inspections: illustration("inspections"),
  Expenses: illustration("expenses"),
  Profile: illustration("settings-security"),
};

const settingsIllustrations: Record<SettingsSection, string> = {
  people: illustration("settings-people"),
  security: illustration("settings-security"),
  integrations: illustration("settings-integrations"),
  preferences: illustration("settings-preferences"),
};

export function motifForPage(view: DashboardView, settingsSection?: SettingsSection) {
  return view === "Settings"
    ? settingsIllustrations[settingsSection || "people"]
    : pageIllustrations[view];
}

export function motifForWorkspace(kind: "client" | "property") {
  return illustration(`${kind}-workspace`);
}
