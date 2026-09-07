import { describe, expect, it } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import {
  BrandingTab,
  ECOMMERCE_INTEGRATION_CATEGORIES,
  filterIntegrations,
  filterEmailTemplates,
  getIntegrationLibraryCounts,
  getEmailTemplateModuleCounts,
  INTEGRATIONS,
  IntegrationCard,
  isIntegrationConfigured,
  isEmailTemplateModuleEnabled,
} from "@/features/admin/settings-page";
import { DEFAULT_SITE_FEATURES } from "@shared/site-features";

describe("BrandingTab", () => {
  it("renders branding view without throwing", () => {
    (globalThis as typeof globalThis & { React?: typeof React }).React = React;
    const client = new QueryClient();

    expect(() =>
      renderToString(
        React.createElement(
          QueryClientProvider,
          { client },
          React.createElement(BrandingTab, {
            settings: {},
            initialSubtab: "branding",
            showHeader: false,
          }),
        ),
      ),
    ).not.toThrow();
  });
});

describe("IntegrationCard", () => {
  it("renders boolean integration fields as switches", () => {
    (globalThis as typeof globalThis & { React?: typeof React }).React = React;
    const client = new QueryClient();
    const merchantCenter = { ...INTEGRATIONS[0], category: "test_provider", fields: [{key:"enabled",label:"Enabled",isSecret:false,placeholder:"",type:"boolean" as const}] };

    expect(merchantCenter).toBeDefined();
    const html = renderToString(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(IntegrationCard, {
          config: merchantCenter!,
          settings: {
            test_provider: {
              enabled: { value: "false", isSecret: false },
            },
          },
        }),
      ),
    );

    expect(html).toContain('data-testid="switch-enabled"');
    expect(html).toContain("Disabled");
  });
});

describe("integration library helpers", () => {
  const settings = {
    mailgun: {
      mailgun_api_key: { value: "sk_live_saved", isSecret: true },
    },
  };
  const platformIntegrations = INTEGRATIONS.filter(
    (config) => config.category === "mailgun" || config.category === "mailchimp",
  );

  it("detects configured integrations and counts them by group", () => {
    const stripe = INTEGRATIONS.find((config) => config.category === "mailgun");
    const mailgun = INTEGRATIONS.find((config) => config.category === "mailchimp");

    expect(stripe).toBeDefined();
    expect(mailgun).toBeDefined();
    expect(isIntegrationConfigured(stripe!, settings)).toBe(true);
    expect(isIntegrationConfigured(mailgun!, settings)).toBe(false);

    const counts = getIntegrationLibraryCounts(platformIntegrations, settings);
    expect(counts.communications).toEqual({ total: 1, configured: 1 });
    expect(counts.marketing).toEqual({ total: 1, configured: 0 });
  });

  it("filters integrations by search, category, group, and status", () => {
    expect(
      filterIntegrations(platformIntegrations, settings, {
        searchQuery: "transactional",
      }).map((config) => config.category),
    ).toEqual(["mailgun"]);

    expect(
      filterIntegrations(platformIntegrations, settings, {
        groupFilter: "communications",
        statusFilter: "configured",
      }).map((config) => config.category),
    ).toEqual(["mailgun"]);

    expect(
      filterIntegrations(platformIntegrations, settings, {
        categoryFilter: "Marketing & Analytics",
        statusFilter: "not_configured",
      }).map((config) => config.category),
    ).toEqual(["mailchimp"]);
  });
});

describe("email template library helpers", () => {
  const templates = [
    {
      name: "Event Reminder",
      slug: "event-reminder",
      module: "events" as const,
      subject: "Reminder: {{eventTitle}} is coming up",
      description: "Sent before an event starts.",
      variables: ["eventTitle", "eventDate"],
      isActive: true,
    },
    {
      name: "Password Reset",
      slug: "password-reset",
      module: "users" as const,
      subject: "Reset Your Password",
      description: "Sent when a user requests a password reset.",
      variables: ["resetUrl"],
      isActive: false,
    },
    {
      name: "Managed Form Submission",
      slug: "managed-form-submission",
      module: "forms" as const,
      subject: "New Form Submission",
      description: "Sent when a managed form receives a submission.",
      variables: ["formName"],
      isActive: true,
    },
  ];

  it("counts templates by module", () => {
    const counts = getEmailTemplateModuleCounts(templates);

    expect(counts.events).toBe(1);
    expect(counts.users).toBe(1);
    expect(counts.forms).toBe(1);
    expect(counts.ecommerce).toBe(0);
  });

  it("filters by module, status, and searchable variables", () => {
    expect(
      filterEmailTemplates(templates, {
        moduleFilter: "events",
        statusFilter: "active",
      }).map((template) => template.slug),
    ).toEqual(["event-reminder"]);

    expect(
      filterEmailTemplates(templates, {
        searchQuery: "resetUrl",
      }).map((template) => template.slug),
    ).toEqual(["password-reset"]);

    expect(
      filterEmailTemplates(templates, {
        statusFilter: "inactive",
      }).map((template) => template.slug),
    ).toEqual(["password-reset"]);
  });

  it("hides templates for disabled modules", () => {
    const siteFeatures = { ...DEFAULT_SITE_FEATURES, eventsEnabled: false };

    expect(isEmailTemplateModuleEnabled("events", siteFeatures)).toBe(false);
    expect(isEmailTemplateModuleEnabled("forms", siteFeatures)).toBe(true);
    expect(
      filterEmailTemplates(templates, {
        siteFeatures,
      }).map((template) => template.slug),
    ).toEqual(["password-reset", "managed-form-submission"]);
  });
});
