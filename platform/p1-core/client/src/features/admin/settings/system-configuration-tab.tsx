import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { DEFAULT_SITE_FEATURES, normalizeBooleanSetting } from "@shared/site-features";
import type { SettingsData } from "../settings-page";

type SystemConfigurationSettingKey =
  | "enable_cms"
  | "enable_directory"
  | "enable_blog"
  | "enable_events"
  | "enable_crm"
  | "enable_ecommerce"
  | "enable_membership"
  | "enable_careers"
  | "enable_portfolio";
const SYSTEM_CONFIGURATION_FIELDS: Array<{
  key: SystemConfigurationSettingKey;
  label: string;
  description: string;
}> = [
  {
    key: "enable_cms",
    label: "Enable CMS",
    description:
      "Turns the CMS app on or off, including pages, media, sections, SEO tools, menus, sidebars, and widgets.",
  },
  {
    key: "enable_blog",
    label: "Enable Blog",
    description:
      "Controls blog and insights entry points so sites can ship without the publishing app when needed.",
  },
  {
    key: "enable_events",
    label: "Enable Events",
    description:
      "Controls events administration and public events routes for sites that do not run an events program.",
  },
  {
    key: "enable_crm",
    label: "Enable CRM",
    description:
      "Turns the CRM pipeline app on or off, including admin navigation and inbound lead routes.",
  },
  {
    key: "enable_careers",
    label: "Enable Career Center",
    description:
      "Turns the Career Center app on or off, including public job listings, applications, and admin hiring tools.",
  },
];

export function SystemConfigurationTab({ settings }: { settings: SettingsData }) {
  const { toast } = useToast();
  const systemConfig = settings.system_configuration || {};
  const getStoredValue = (key: SystemConfigurationSettingKey) => {
    if (key === "enable_cms") {
      return normalizeBooleanSetting(
        systemConfig.enable_cms?.value,
        DEFAULT_SITE_FEATURES.cmsEnabled,
      );
    }
    if (key === "enable_directory") {
      return normalizeBooleanSetting(
        systemConfig.enable_directory?.value,
        DEFAULT_SITE_FEATURES.directoryEnabled,
      );
    }
    if (key === "enable_blog") {
      return normalizeBooleanSetting(
        systemConfig.enable_blog?.value,
        DEFAULT_SITE_FEATURES.blogEnabled,
      );
    }
    if (key === "enable_crm") {
      return normalizeBooleanSetting(
        systemConfig.enable_crm?.value,
        DEFAULT_SITE_FEATURES.crmEnabled,
      );
    }
    if (key === "enable_ecommerce") {
      return normalizeBooleanSetting(
        systemConfig.enable_ecommerce?.value,
        DEFAULT_SITE_FEATURES.ecommerceEnabled,
      );
    }
    if (key === "enable_membership") {
      return normalizeBooleanSetting(
        systemConfig.enable_membership?.value,
        DEFAULT_SITE_FEATURES.membershipEnabled,
      );
    }
    if (key === "enable_careers") {
      return normalizeBooleanSetting(
        systemConfig.enable_careers?.value,
        DEFAULT_SITE_FEATURES.careersEnabled,
      );
    }
    if (key === "enable_portfolio") {
      return normalizeBooleanSetting(
        systemConfig.enable_portfolio?.value,
        DEFAULT_SITE_FEATURES.portfolioEnabled,
      );
    }
    return normalizeBooleanSetting(
      systemConfig.enable_events?.value,
      DEFAULT_SITE_FEATURES.eventsEnabled,
    );
  };
  const [values, setValues] = useState<Record<SystemConfigurationSettingKey, boolean>>({
    enable_cms: getStoredValue("enable_cms"),
    enable_directory: getStoredValue("enable_directory"),
    enable_blog: getStoredValue("enable_blog"),
    enable_events: getStoredValue("enable_events"),
    enable_crm: getStoredValue("enable_crm"),
    enable_ecommerce: getStoredValue("enable_ecommerce"),
    enable_membership: getStoredValue("enable_membership"),
    enable_careers: getStoredValue("enable_careers"),
    enable_portfolio: getStoredValue("enable_portfolio"),
  });

  useEffect(() => {
    setValues({
      enable_cms: getStoredValue("enable_cms"),
      enable_directory: getStoredValue("enable_directory"),
      enable_blog: getStoredValue("enable_blog"),
      enable_events: getStoredValue("enable_events"),
      enable_crm: getStoredValue("enable_crm"),
      enable_ecommerce: getStoredValue("enable_ecommerce"),
      enable_membership: getStoredValue("enable_membership"),
      enable_careers: getStoredValue("enable_careers"),
      enable_portfolio: getStoredValue("enable_portfolio"),
    });
  }, [
    systemConfig.enable_cms?.value,
    systemConfig.enable_directory?.value,
    systemConfig.enable_blog?.value,
    systemConfig.enable_events?.value,
    systemConfig.enable_crm?.value,
    systemConfig.enable_ecommerce?.value,
    systemConfig.enable_membership?.value,
    systemConfig.enable_careers?.value,
    systemConfig.enable_portfolio?.value,
  ]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        SYSTEM_CONFIGURATION_FIELDS.map((field) =>
          apiRequest("PUT", "/api/admin/settings", {
            key: field.key,
            value: values[field.key] ? "true" : "false",
            category: "system_configuration",
            isSecret: false,
          }),
        ),
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/site-config"] }),
      ]);
      toast({ title: "System configuration updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not save system configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const hasChanges = SYSTEM_CONFIGURATION_FIELDS.some(
    (field) => values[field.key] !== getStoredValue(field.key),
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-system-configuration-heading">
          System Configuration
        </h3>
        <p className="text-sm text-muted-foreground">
          Control which major site apps are active so this platform can be reused across projects
          without carrying unnecessary features.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature Apps</CardTitle>
          <CardDescription>
            These toggles hide or reveal major admin navigation and public entry routes. Existing
            data is preserved when an app is turned off.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {SYSTEM_CONFIGURATION_FIELDS.map((field) => (
            <div
              key={field.key}
              className="flex items-start justify-between gap-4 rounded-xl border p-4"
            >
              <div className="space-y-1">
                <Label className="text-sm font-medium">{field.label}</Label>
                <p className="text-xs text-muted-foreground">{field.description}</p>
              </div>
              <Switch
                checked={values[field.key]}
                onCheckedChange={(checked) =>
                  setValues((current) => ({ ...current, [field.key]: checked }))
                }
                data-testid={`switch-${field.key}`}
              />
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges || saveMutation.isPending}
              data-testid="button-save-system-configuration"
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
