import type { DashboardView, SettingsSection } from "./dashboard-routes";

const illustration = (name: string) => `url("/images/illustrations/${name}.webp")`;

const pageIllustrations: Record<Exclude<DashboardView, "Settings">, string> = {
  Analytics: "none",
  "Website Sidebars": "none",
  "Website Galleries": "none",
  "Website Careers": "none",
  "Website Events": "none",
  "Website Forms": "none",
  "CMS Pages": "none",
  "Website Sections": "none",
  "Website SEO": "none",
  "Website Blog": "none",
  "Website Team": "none",
  "Media Library": "none",
  "Website Editor": "none",
  "Website Menus": "none",
  "Search Console": "none",
  Overview: illustration("overview"),
  Properties: illustration("properties"),
  Clients: illustration("clients"),
  Schedule: illustration("schedule"),
  "My Day": illustration("my-day"),
  Sales: illustration("sales"),
  "Agreement Templates": "none",
  "Agreement Drafts": "none",
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
  "term-libraries": illustration("settings-preferences"),
};

export function motifForPage(view: DashboardView, settingsSection?: SettingsSection) {
  return view === "Settings"
    ? settingsIllustrations[settingsSection || "people"]
    : pageIllustrations[view];
}

export function motifForWorkspace(kind: "client" | "property") {
  return illustration(`${kind}-workspace`);
}
