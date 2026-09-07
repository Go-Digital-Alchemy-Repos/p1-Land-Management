import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Cloud,
  Code2,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  Loader2,
  Mail,
  Megaphone,
  Plug,
  Save,
  Search,
  Settings,
  Tag,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import {
  SiCloudflare,
  SiGoogleanalytics,
  SiMailchimp,
  SiMailgun,
  SiMeta,
  SiTiktok,
  SiX,
} from "react-icons/si";
import { useLocation, useRoute } from "wouter";
import { AdminSidebar } from "./admin-sidebar";
import { EmailTemplatesTab } from "./settings/email-templates-tab";
export { BrandingTab, type BrandingSubview } from "./settings/branding-tab";
export {
  filterEmailTemplates,
  getEmailTemplateModuleCounts,
  isEmailTemplateModuleEnabled,
} from "./settings/email-templates-tab";

export type SettingsData = Record<string, Record<string, { value: string; isSecret: boolean }>>;

type SettingsTab = "integrations" | "head-tags" | "system" | "email-templates";

const SETTINGS_TABS = new Set<SettingsTab>([
  "integrations",
  "head-tags",
  "system",
  "email-templates",
]);

function normalizeSettingsTab(tab: string | undefined): SettingsTab {
  return SETTINGS_TABS.has(tab as SettingsTab) ? (tab as SettingsTab) : "integrations";
}

interface IntegrationField {
  key: string;
  label: string;
  isSecret: boolean;
  placeholder: string;
  type?: "text" | "boolean";
}

export type IntegrationGroupKey =
  | "commerce"
  | "shipping"
  | "marketing"
  | "communications"
  | "infrastructure";

export type IntegrationLibraryCategory =
  | "Payment Gateways"
  | "POS & Merchant Services"
  | "Shipping & Fulfillment"
  | "Social Commerce"
  | "Marketing & Analytics"
  | "Product Feeds"
  | "Inventory & Operations"
  | "Tax & Compliance"
  | "Marketplaces"
  | "Other";

export interface IntegrationConfig {
  category: string;
  title: string;
  description: string;
  group: IntegrationGroupKey;
  icon: typeof CreditCard;
  brandIcon?: IconType;
  brandColor?: string;
  logoText?: string;
  badge?: string;
  accountUrl: string;
  docsUrl?: string;
  instructions: string[];
  fields: IntegrationField[];
  replitConnected?: boolean;
  supportsConnectionTest?: boolean;
  libraryCategory?: IntegrationLibraryCategory;
  capabilities?: string[];
  configurable?: boolean;
  operational?: boolean;
  requiresAdapter?: boolean;
  supportedCapabilities?: string[];
  supportedEvents?: string[];
}

export const INTEGRATION_GROUPS: Array<{
  key: IntegrationGroupKey;
  title: string;
  description: string;
}> = [
  {
    key: "commerce",
    title: "Global Payment Processors",
    description:
      "Shared transaction providers used by ecommerce, paid events, subscriptions, and future paid modules.",
  },
  {
    key: "shipping",
    title: "Shipping & Fulfillment",
    description: "Label purchasing, fulfillment automation, inventory, and delivery workflows.",
  },
  {
    key: "marketing",
    title: "Marketing & Analytics",
    description: "Measurement, advertising, attribution, and audience lifecycle tools.",
  },
  {
    key: "communications",
    title: "Communications & CRM",
    description: "Transactional email, lead intake, and customer operations integrations.",
  },
  {
    key: "infrastructure",
    title: "Storage & Infrastructure",
    description: "Platform services used by media, uploads, and deployment operations.",
  },
];

export const ECOMMERCE_INTEGRATION_CATEGORIES = new Set([
  "google_merchant_center",
  "google_ads_tag_manager",
  "microsoft_ads_merchant_center",
  "meta_ads",
  "tiktok_ads",
  "pinterest_ads",
  "x_ads",
  "klaviyo",
  "omnisend",
  "avalara_avatax",
  "taxjar",
  "shipbob",
  "amazon_marketplace",
  "walmart_marketplace",
  "easypost",
  "shipstation",
  "shippo",
  "veeqo",
  "easyship",
  "pirate_ship",
  "ups",
  "usps",
  "fedex",
  "dhl_express",
]);

type IntegrationStatusFilter = "all" | "configured" | "not_configured";

function getIntegrationGroupLabel(groupKey: IntegrationGroupKey) {
  return INTEGRATION_GROUPS.find((group) => group.key === groupKey)?.title || "Other";
}

export function isIntegrationConfigured(config: IntegrationConfig, settings: SettingsData) {
  const categorySettings = settings[config.category] || {};
  return config.fields.some((field) => {
    const setting = categorySettings[field.key];
    return Boolean(setting?.value && setting.value !== "");
  });
}

export function getIntegrationLibraryCounts(
  integrations: IntegrationConfig[],
  settings: SettingsData,
) {
  return INTEGRATION_GROUPS.reduce(
    (counts, group) => {
      const groupIntegrations = integrations.filter((config) => config.group === group.key);
      counts[group.key] = {
        total: groupIntegrations.length,
        configured: groupIntegrations.filter((config) => isIntegrationConfigured(config, settings))
          .length,
      };
      return counts;
    },
    {} as Record<IntegrationGroupKey, { total: number; configured: number }>,
  );
}

export function filterIntegrations(
  integrations: IntegrationConfig[],
  settings: SettingsData,
  filters: {
    searchQuery?: string;
    groupFilter?: IntegrationGroupKey | "all";
    categoryFilter?: IntegrationLibraryCategory | "all";
    statusFilter?: IntegrationStatusFilter;
  },
) {
  const query = (filters.searchQuery || "").trim().toLowerCase();
  const groupFilter = filters.groupFilter || "all";
  const categoryFilter = filters.categoryFilter || "all";
  const statusFilter = filters.statusFilter || "all";

  return integrations.filter((config) => {
    const configured = isIntegrationConfigured(config, settings);
    const matchesGroup = groupFilter === "all" || config.group === groupFilter;
    const matchesCategory =
      categoryFilter === "all" || (config.libraryCategory || "Other") === categoryFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "configured" && configured) ||
      (statusFilter === "not_configured" && !configured);
    const searchable = [
      config.title,
      config.category,
      config.description,
      config.libraryCategory || "",
      getIntegrationGroupLabel(config.group),
      ...(config.capabilities || []),
      ...(config.supportedCapabilities || []),
      ...(config.supportedEvents || []),
      config.operational ? "operational" : "setup ready requires adapter",
      ...config.fields.map((field) => field.label),
    ]
      .join(" ")
      .toLowerCase();
    const matchesSearch = !query || searchable.includes(query);

    return matchesGroup && matchesCategory && matchesStatus && matchesSearch;
  });
}

export const INTEGRATIONS: IntegrationConfig[] = [
  {
    category: "mailgun",
    title: "Mailgun",
    description: "Transactional email delivery service",
    group: "communications",
    icon: Mail,
    brandIcon: SiMailgun,
    brandColor: "text-[#F06B66]",
    accountUrl: "https://app.mailgun.com/app/account/security/api_keys",
    docsUrl:
      "https://help.mailgun.com/hc/en-us/articles/203380100-Where-can-I-find-my-API-keys-and-SMTP-credentials",
    instructions: [
      "Open Mailgun API Security and create or copy an API key.",
      "Open Sending > Domains and copy the verified sending domain.",
      "Enter the from address exactly as messages should appear to recipients.",
    ],
    fields: [
      {
        key: "mailgun_api_key",
        label: "API Key",
        isSecret: true,
        placeholder: "key-...",
      },
      {
        key: "mailgun_domain",
        label: "Domain",
        isSecret: false,
        placeholder: "mg.yourdomain.com",
      },
      {
        key: "mailgun_from_address",
        label: "From Address",
        isSecret: false,
        placeholder: "Core Platform <noreply@yourdomain.com>",
      },
    ],
  },
  {
    category: "mailchimp",
    title: "Mailchimp",
    description: "Audience sync used by managed forms and lifecycle tagging",
    group: "marketing",
    icon: Tag,
    brandIcon: SiMailchimp,
    brandColor: "text-[#FFE01B]",
    libraryCategory: "Marketing & Analytics",
    capabilities: ["Audience sync", "Lifecycle tagging", "Email marketing"],
    accountUrl: "https://admin.mailchimp.com/account/api/",
    docsUrl: "https://mailchimp.com/help/about-api-keys/",
    instructions: [
      "Open Mailchimp API Keys and create or copy an active API key.",
      "Use the suffix after the API key hyphen as the Server Prefix, for example us6.",
      "Open Audience settings to copy the Audience ID for the list this site should sync to.",
    ],
    fields: [
      {
        key: "mailchimp_api_key",
        label: "API Key",
        isSecret: true,
        placeholder: "xxxxxxxxxxxxxxxxxxxx-us6",
      },
      {
        key: "mailchimp_audience_id",
        label: "Audience ID",
        isSecret: false,
        placeholder: "a1b2c3d4e5",
      },
      {
        key: "mailchimp_server_prefix",
        label: "Server Prefix",
        isSecret: false,
        placeholder: "us6",
      },
    ],
  },
  {
    category: "google_analytics",
    title: "Google Analytics",
    description:
      "Reserve the GA4 tracking and reporting configuration used by future public analytics and the planned admin Analytics area.",
    group: "marketing",
    icon: BarChart3,
    brandIcon: SiGoogleanalytics,
    brandColor: "text-[#E37400]",
    libraryCategory: "Marketing & Analytics",
    capabilities: ["GA4", "Reporting", "Measurement ID"],
    accountUrl: "https://analytics.google.com/analytics/web/",
    docsUrl: "https://support.google.com/analytics/answer/9539598",
    instructions: [
      "Open Google Analytics Admin and choose the GA4 property for this site.",
      "Copy the Measurement ID from Data streams > Web stream details.",
      "For reporting access, create a Google Cloud service account and add its email to the GA4 property with viewer access.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "ga4_measurement_id",
        label: "GA4 Measurement ID",
        isSecret: false,
        placeholder: "G-XXXXXXXXXX",
      },
      {
        key: "ga4_property_id",
        label: "GA4 Property ID",
        isSecret: false,
        placeholder: "123456789",
      },
      {
        key: "ga4_reporting_client_email",
        label: "Reporting Service Account Email",
        isSecret: false,
        placeholder: "ga-reporting@your-project.iam.gserviceaccount.com",
      },
      {
        key: "ga4_reporting_private_key",
        label: "Reporting Private Key",
        isSecret: true,
        placeholder: "-----BEGIN PRIVATE KEY-----",
      },
    ],
  },

  {
    category: "meta_ads",
    title: "Meta Pixel & Conversions API",
    description:
      "Marketing pixel and server-side event credentials for Facebook and Instagram commerce campaigns",
    group: "marketing",
    icon: Megaphone,
    brandIcon: SiMeta,
    brandColor: "text-[#0467DF]",
    libraryCategory: "Social Commerce",
    capabilities: ["Meta Pixel", "Conversions API", "Facebook", "Instagram"],
    accountUrl: "https://business.facebook.com/events_manager",
    docsUrl: "https://developers.facebook.com/docs/meta-pixel/",
    instructions: [
      "Open Meta Events Manager and choose the dataset connected to this store.",
      "Copy the Pixel ID for browser PageView tracking.",
      "Create a Conversions API access token only when server-side purchase events are ready to be enabled.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "meta_pixel_id",
        label: "Pixel ID",
        isSecret: false,
        placeholder: "123456789012345",
      },
      {
        key: "meta_access_token",
        label: "Conversions API Access Token",
        isSecret: true,
        placeholder: "EAAB...",
      },
      {
        key: "meta_test_event_code",
        label: "Test Event Code",
        isSecret: false,
        placeholder: "TEST12345",
      },
    ],
  },
  {
    category: "tiktok_ads",
    title: "TikTok Pixel & Events API",
    description:
      "TikTok browser pixel and Events API credentials for catalog, checkout, and purchase tracking",
    group: "marketing",
    icon: Megaphone,
    brandIcon: SiTiktok,
    brandColor: "text-black",
    libraryCategory: "Social Commerce",
    capabilities: ["TikTok Pixel", "Events API", "Catalog events"],
    accountUrl: "https://ads.tiktok.com/i18n/events_manager",
    docsUrl: "https://business-api.tiktok.com/portal/docs?id=1739584855420929",
    instructions: [
      "Open TikTok Events Manager and choose the web event source for this store.",
      "Copy the Pixel ID for consent-based browser tracking.",
      "Create an Events API access token only when server-side purchase events are ready to be enabled.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "tiktok_pixel_id",
        label: "Pixel ID",
        isSecret: false,
        placeholder: "CXXXXXXXXXXXXXXX",
      },
      {
        key: "tiktok_access_token",
        label: "Events API Access Token",
        isSecret: true,
        placeholder: "Act...",
      },
      {
        key: "tiktok_test_event_code",
        label: "Test Event Code",
        isSecret: false,
        placeholder: "TEST12345",
      },
    ],
  },
  {
    category: "x_ads",
    title: "X Ads Website Tag",
    description:
      "Consent-based website tag configuration for X campaign measurement and remarketing",
    group: "marketing",
    icon: Megaphone,
    brandIcon: SiX,
    brandColor: "text-black",
    libraryCategory: "Social Commerce",
    capabilities: ["Website tag", "Remarketing", "Campaign measurement"],
    accountUrl: "https://ads.x.com/conversion_tracking",
    docsUrl:
      "https://business.x.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html",
    instructions: [
      "Open X Ads conversion tracking and create or select the website tag for this store.",
      "Copy the website tag ID into this card.",
      "Use the tag only after confirming marketing cookie consent requirements for the site.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "x_pixel_id",
        label: "Website Tag ID",
        isSecret: false,
        placeholder: "o1234",
      },
    ],
  },
  {
    category: "cloudflare_r2",
    title: "Cloudflare R2",
    description: "Object storage for images and file uploads",
    group: "infrastructure",
    icon: Cloud,
    brandIcon: SiCloudflare,
    brandColor: "text-[#F38020]",
    accountUrl: "https://dash.cloudflare.com/?to=/:account/r2/api-tokens",
    docsUrl: "https://developers.cloudflare.com/r2/api/s3/tokens/",
    instructions: [
      "Open Cloudflare R2 API tokens for the correct account.",
      "Create an Account API token with Object Read and Write access scoped to this bucket.",
      "Copy the Access Key ID and Secret Access Key immediately; Cloudflare only shows the secret once.",
      "Copy the Account ID from the R2 overview or account overview, then enter the bucket name.",
      "Leave Public URL blank unless you have a custom public domain. Do not use the r2.cloudflarestorage.com API endpoint as the Public URL.",
    ],
    fields: [
      {
        key: "r2_account_id",
        label: "Account ID",
        isSecret: false,
        placeholder: "Your Cloudflare Account ID",
      },
      {
        key: "r2_access_key_id",
        label: "Access Key ID",
        isSecret: true,
        placeholder: "Access key for R2",
      },
      {
        key: "r2_secret_access_key",
        label: "Secret Access Key",
        isSecret: true,
        placeholder: "Secret access key for R2",
      },
      {
        key: "r2_bucket_name",
        label: "Bucket Name",
        isSecret: false,
        placeholder: "core-platform-uploads",
      },
      {
        key: "r2_public_url",
        label: "Public URL",
        isSecret: false,
        placeholder: "https://cdn.yourdomain.com",
      },
    ],
  },
];

export function IntegrationCard({
  config,
  settings,
}: {
  config: IntegrationConfig;
  settings: SettingsData;
}) {
  const { toast } = useToast();
  const categorySettings = settings[config.category] || {};
  const [values, setValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const hasAnyValue = config.fields.some(
    (f) => categorySettings[f.key]?.value && categorySettings[f.key].value !== "",
  );

  const saveMutation = useMutation({
    mutationFn: async (field: IntegrationField) => {
      const val = values[field.key];
      if (val === undefined || val === "") return;
      await apiRequest("PUT", "/api/admin/settings", {
        key: field.key,
        value: val,
        category: config.category,
        isSecret: field.isSecret,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Setting saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error saving setting", description: err.message, variant: "destructive" });
    },
  });

  const saveAll = async () => {
    for (const field of config.fields) {
      const val = values[field.key];
      if (val !== undefined && val !== "") {
        await saveMutation.mutateAsync(field);
      }
    }
    setValues({});
  };

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/settings/test-connection", {
        integration: config.category,
      });
      return res.json();
    },
    onSuccess: (data: { success: boolean; message: string }) => {
      toast({
        title: data.success ? "Connection successful" : "Connection failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Test failed", description: err.message, variant: "destructive" });
    },
  });

  const supportsConnectionTest = config.supportsConnectionTest !== false;

  const Icon = config.icon;
  const BrandIcon = config.brandIcon;

  return (
    <Card data-testid={`card-integration-${config.category}`}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border bg-background shadow-sm">
              {BrandIcon ? (
                <BrandIcon
                  aria-label={`${config.title} logo`}
                  className={cn("h-8 w-8", config.brandColor || "text-primary")}
                />
              ) : config.logoText ? (
                <span
                  aria-label={`${config.title} logo`}
                  className={cn(
                    "px-1 text-center text-[11px] font-bold leading-tight tracking-normal",
                    config.brandColor || "text-primary",
                  )}
                >
                  {config.logoText}
                </span>
              ) : (
                <Icon className={cn("h-7 w-7", config.brandColor || "text-primary")} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{config.title}</CardTitle>
                {config.badge ? (
                  <Badge variant="secondary" className="font-normal">
                    {config.badge}
                  </Badge>
                ) : null}
              </div>
              <CardDescription>{config.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config.replitConnected && (
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                data-testid={`badge-replit-${config.category}`}
              >
                <span className="flex items-center gap-1">
                  <Link2 className="h-3 w-3" /> Auto-connected
                </span>
              </Badge>
            )}
            {config.requiresAdapter ? (
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-amber-800"
                data-testid={`badge-readiness-${config.category}`}
              >
                Setup ready
              </Badge>
            ) : config.operational ? (
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700"
                data-testid={`badge-readiness-${config.category}`}
              >
                Operational
              </Badge>
            ) : null}
            <Badge
              variant={hasAnyValue ? "default" : "outline"}
              data-testid={`badge-status-${config.category}`}
            >
              {hasAnyValue ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Configured
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> Not configured
                </span>
              )}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {config.replitConnected && (
          <div
            className="rounded-md border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400 flex items-start gap-2"
            data-testid={`notice-replit-${config.category}`}
          >
            <Link2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              This service is auto-connected via Replit integration. The fields below are optional
              overrides for custom or production keys.
            </span>
          </div>
        )}
        {config.requiresAdapter ? (
          <div
            className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            data-testid={`notice-readiness-${config.category}`}
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              Credentials can be saved now. This integration will not affect checkout, fulfillment,
              feeds, tax, or marketing events until its operational adapter is implemented and
              tested.
            </span>
          </div>
        ) : null}
        <div className="rounded-md border bg-muted/30 px-3 py-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={config.accountUrl} target="_blank" rel="noreferrer">
                Open {config.title} Account
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </a>
            </Button>
            {config.docsUrl ? (
              <Button asChild variant="ghost" size="sm">
                <a href={config.docsUrl} target="_blank" rel="noreferrer">
                  Setup Docs
                  <ExternalLink className="ml-2 h-3.5 w-3.5" />
                </a>
              </Button>
            ) : null}
          </div>
          <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
            {config.instructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ol>
        </div>
        {config.fields.map((field) => {
          const existing = categorySettings[field.key];
          const hasExisting = existing && existing.value && existing.value !== "";
          const currentVal = values[field.key] ?? "";
          const normalizedExisting = existing?.value?.trim().toLowerCase();
          const isBooleanEnabled =
            values[field.key] !== undefined
              ? values[field.key] === "true"
              : ["true", "1", "yes", "on"].includes(normalizedExisting ?? "");
          const isVisible = showSecrets[field.key];
          const shouldAutoPrependHttps =
            /url/i.test(field.label) ||
            field.key.toLowerCase().endsWith("_url") ||
            field.placeholder?.startsWith("https://") === true;

          return (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={field.key}>{field.label}</Label>
              {field.type === "boolean" ? (
                <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
                  <span className="text-sm text-muted-foreground">
                    {isBooleanEnabled ? "Enabled" : "Disabled"}
                  </span>
                  <Switch
                    id={field.key}
                    checked={isBooleanEnabled}
                    onCheckedChange={(checked) =>
                      setValues((prev) => ({ ...prev, [field.key]: checked ? "true" : "false" }))
                    }
                    data-testid={`switch-${field.key}`}
                  />
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id={field.key}
                      type={field.isSecret && !isVisible ? "password" : "text"}
                      placeholder={
                        hasExisting
                          ? field.isSecret
                            ? "••••••••  (saved — enter new value to update)"
                            : existing.value
                          : field.placeholder
                      }
                      value={currentVal}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      autoPrependHttps={shouldAutoPrependHttps}
                      data-testid={`input-${field.key}`}
                    />
                  </div>
                  {field.isSecret && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setShowSecrets((prev) => ({
                          ...prev,
                          [field.key]: !prev[field.key],
                        }))
                      }
                      data-testid={`button-toggle-${field.key}`}
                    >
                      {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={saveAll}
            disabled={saveMutation.isPending || Object.values(values).every((v) => !v)}
            data-testid={`button-save-${config.category}`}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !hasAnyValue}
            className={cn(!supportsConnectionTest && "hidden")}
            data-testid={`button-test-${config.category}`}
          >
            {testMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plug className="h-4 w-4 mr-2" />
            )}
            Test Connection
          </Button>
        </div>
        {!supportsConnectionTest ? (
          <p className="text-xs text-muted-foreground">
            Tracking and reporting values can be saved now. Connection validation will be added when
            the Analytics feature ships.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function IntegrationsTab({ settings }: { settings: SettingsData }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<IntegrationGroupKey | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<IntegrationLibraryCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<IntegrationStatusFilter>("all");
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null);
  const platformIntegrations = INTEGRATIONS.filter(
    (config) => !ECOMMERCE_INTEGRATION_CATEGORIES.has(config.category),
  );
  const configuredCount = platformIntegrations.filter((config) =>
    isIntegrationConfigured(config, settings),
  ).length;
  const groupCounts = useMemo(
    () => getIntegrationLibraryCounts(platformIntegrations, settings),
    [platformIntegrations, settings],
  );
  const libraryCategories = useMemo(
    () =>
      Array.from(
        new Set(
          platformIntegrations.map(
            (config) => config.libraryCategory || ("Other" as IntegrationLibraryCategory),
          ),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [platformIntegrations],
  );
  const filteredIntegrations = useMemo(
    () =>
      filterIntegrations(platformIntegrations, settings, {
        searchQuery,
        groupFilter,
        categoryFilter,
        statusFilter,
      }),
    [categoryFilter, groupFilter, platformIntegrations, searchQuery, settings, statusFilter],
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-integrations-heading">
          Integrations
        </h3>
        <p className="text-sm text-muted-foreground">
          Browse platform-wide integrations as a library. {configuredCount} of{" "}
          {platformIntegrations.length} connections have saved settings, and secret values are
          encrypted at rest.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {INTEGRATION_GROUPS.map((group) => {
          const counts = groupCounts[group.key] || { total: 0, configured: 0 };
          if (counts.total === 0) return null;

          return (
            <button
              key={group.key}
              type="button"
              onClick={() => setGroupFilter(group.key)}
              className={cn(
                "rounded-lg border bg-background p-3 text-left shadow-sm transition-colors hover:bg-muted/40",
                groupFilter === group.key && "border-primary bg-primary/5",
              )}
              data-testid={`button-integration-group-${group.key}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{group.title}</span>
                <Badge variant="secondary" className="text-xs">
                  {counts.total}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{counts.configured} configured</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 p-3">
        <div className="relative min-w-0 flex-1 basis-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search integrations, providers, capabilities..."
            className="pl-9"
            data-testid="input-search-integrations"
          />
        </div>
        <Select
          value={groupFilter}
          onValueChange={(value) => setGroupFilter(value as IntegrationGroupKey | "all")}
        >
          <SelectTrigger
            className="w-full sm:w-[190px]"
            data-testid="select-integration-group-filter"
          >
            <SelectValue placeholder="Module type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Module Types</SelectItem>
            {INTEGRATION_GROUPS.map((group) => (
              <SelectItem key={group.key} value={group.key}>
                {group.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={categoryFilter}
          onValueChange={(value) => setCategoryFilter(value as IntegrationLibraryCategory | "all")}
        >
          <SelectTrigger
            className="w-full sm:w-[190px]"
            data-testid="select-integration-category-filter"
          >
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {libraryCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as IntegrationStatusFilter)}
        >
          <SelectTrigger
            className="w-full sm:w-[165px]"
            data-testid="select-integration-status-filter"
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="configured">Configured</SelectItem>
            <SelectItem value="not_configured">Not Configured</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" data-testid="text-integration-result-count">
          Showing {filteredIntegrations.length} of {platformIntegrations.length} integrations
        </p>
        {(searchQuery ||
          groupFilter !== "all" ||
          categoryFilter !== "all" ||
          statusFilter !== "all") && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setGroupFilter("all");
              setCategoryFilter("all");
              setStatusFilter("all");
            }}
            data-testid="button-clear-integration-filters"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {filteredIntegrations.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <span>No integrations match the current filters.</span>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredIntegrations.map((config) => {
            const configured = isIntegrationConfigured(config, settings);
            const Icon = config.icon;
            const BrandIcon = config.brandIcon;

            return (
              <Card key={config.category} data-testid={`library-integration-${config.category}`}>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border bg-background shadow-sm">
                        {BrandIcon ? (
                          <BrandIcon
                            aria-label={`${config.title} logo`}
                            className={cn("h-6 w-6", config.brandColor || "text-primary")}
                          />
                        ) : config.logoText ? (
                          <span
                            aria-label={`${config.title} logo`}
                            className={cn(
                              "px-1 text-center text-[10px] font-bold leading-tight tracking-normal",
                              config.brandColor || "text-primary",
                            )}
                          >
                            {config.logoText}
                          </span>
                        ) : (
                          <Icon className={cn("h-5 w-5", config.brandColor || "text-primary")} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold">{config.title}</h4>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {config.description}
                        </p>
                      </div>
                    </div>
                    <Badge variant={configured ? "default" : "outline"} className="text-xs">
                      {configured ? "Configured" : "Not configured"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-xs">
                      {getIntegrationGroupLabel(config.group)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {config.libraryCategory || "Other"}
                    </Badge>
                    {(config.capabilities || []).slice(0, 2).map((capability) => (
                      <Badge key={capability} variant="outline" className="text-xs font-normal">
                        {capability}
                      </Badge>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setSelectedIntegration(config)}
                    data-testid={`button-open-integration-${config.category}`}
                  >
                    Configure
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet
        open={!!selectedIntegration}
        onOpenChange={(open) => {
          if (!open) setSelectedIntegration(null);
        }}
      >
        <SheetContent side="right" size="xl">
          <SheetHeader>
            <SheetTitle>Configure Integration</SheetTitle>
            <SheetDescription>
              Save credentials, review setup steps, and test supported connections.
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            {selectedIntegration ? (
              <IntegrationCard config={selectedIntegration} settings={settings} />
            ) : null}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export { SpecializationsTab } from "./settings/specializations-tab";

import { HeadTagAdditionsTab } from "./settings/head-tag-additions-tab";
import { SystemConfigurationTab } from "./settings/system-configuration-tab";
export default function AdminSettingsPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/settings/:tab");
  const activeTab = normalizeSettingsTab(params?.tab);
  const shouldLoadSettings = activeTab !== "email-templates";
  const { data: settings, isLoading } = useQuery<SettingsData>({
    queryKey: ["/api/admin/settings"],
    enabled: shouldLoadSettings,
  });

  useEffect(() => {
    if (params?.tab && !SETTINGS_TABS.has(params.tab as SettingsTab)) {
      setLocation("/admin/settings/integrations");
    }
  }, [params?.tab, setLocation]);

  return (
    <AdminSidebar>
      <div className="max-w-7xl p-4 sm:p-6">
        <h1 className="text-2xl font-heading font-bold mb-1" data-testid="text-settings-title">
          System Settings
        </h1>
        <p className="text-muted-foreground mb-6">
          Manage integrations, head markup, system configuration, and system email templates.
        </p>

        <Tabs value={activeTab} onValueChange={(value) => setLocation(`/admin/settings/${value}`)}>
          <TabsList data-testid="tabs-settings">
            <TabsTrigger value="integrations" data-testid="tab-integrations">
              <Plug className="mr-1.5 h-4 w-4 text-blue-600" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="head-tags" data-testid="tab-head-tag-additions">
              <Code2 className="mr-1.5 h-4 w-4 text-violet-600" />
              Head Tag Additions
            </TabsTrigger>
            <TabsTrigger value="system" data-testid="tab-system-configuration">
              <Settings className="mr-1.5 h-4 w-4 text-slate-500" />
              System Configuration
            </TabsTrigger>
            <TabsTrigger value="email-templates" data-testid="tab-templates">
              <Mail className="mr-1.5 h-4 w-4 text-rose-600" />
              Email Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="integrations" className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <IntegrationsTab settings={settings || {}} />
            )}
          </TabsContent>

          <TabsContent value="email-templates" className="mt-6 max-w-4xl">
            <EmailTemplatesTab />
          </TabsContent>

          <TabsContent value="head-tags" className="mt-6 max-w-4xl">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <HeadTagAdditionsTab settings={settings || {}} />
            )}
          </TabsContent>

          <TabsContent value="system" className="mt-6 max-w-4xl">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <SystemConfigurationTab settings={settings || {}} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminSidebar>
  );
}
