import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, ImageIcon, Link2, Loader2, MapPin, Palette, Save, Type } from "lucide-react";

import { CmsImageUpload } from "@/features/admin/cms/components/cms-image-upload";
import { SocialMediaLinks } from "@/components/shared/social-media-links";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  BRANDING_FONT_OPTIONS,
  BRANDING_SANS_FONT_OPTIONS,
  BRANDING_SERIF_FONT_OPTIONS,
  fontFamilyForBrandingOption,
  normalizeHexColor,
  type BrandingFontOption,
} from "@/lib/branding";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  getSocialMediaLinks,
  normalizeSocialIconStyle,
  SOCIAL_MEDIA_PLATFORMS,
  type SocialIconStyle,
} from "@shared/social-media";

import type { SettingsData } from "../settings-page";

type BrandingSettingKey = "frontend_logo_url" | "favicon_url";
type BrandingCompanyInfoSettingKey =
  | "company_name"
  | "company_address"
  | "company_phone_numbers"
  | "company_google_business_url";
type BrandingSocialSettingKey = (typeof SOCIAL_MEDIA_PLATFORMS)[number]["settingKey"];

type BrandingColorSettingKey =
  | "brand_primary_color"
  | "brand_secondary_color"
  | "brand_tertiary_color"
  | "brand_quaternary_color"
  | "text_h1_color"
  | "text_h2_color"
  | "text_h3_h6_color"
  | "text_body_color"
  | "text_heading_subtext_color"
  | "text_supporting_copy_color"
  | "text_helper_text_color"
  | "text_meta_color"
  | "text_link_color"
  | "text_link_hover_color"
  | "text_inverse_color"
  | "text_primary_foreground_color"
  | "text_secondary_foreground_color"
  | "text_tertiary_foreground_color";

const BRANDING_CORE_COLOR_FIELDS: Array<{
  key: BrandingColorSettingKey;
  label: string;
  description: string;
}> = [
  {
    key: "brand_primary_color",
    label: "Primary Color",
    description: "Main brand and button color.",
  },
  {
    key: "brand_secondary_color",
    label: "Secondary Color",
    description: "Support color for secondary UI states.",
  },
  {
    key: "brand_tertiary_color",
    label: "Tertiary Color",
    description: "Accent color used across highlights and links.",
  },
  {
    key: "brand_quaternary_color",
    label: "Quaternary Color",
    description: "Fourth core brand color for additional featured accents and visual variety.",
  },
];

const BRANDING_TYPOGRAPHY_COLOR_FIELDS: Array<{
  key: BrandingColorSettingKey;
  label: string;
  description: string;
}> = [
  { key: "text_h1_color", label: "H1 Color", description: "Primary color for main page headings." },
  {
    key: "text_h2_color",
    label: "H2 Color",
    description: "Color for section-level headings and major titles.",
  },
  {
    key: "text_h3_h6_color",
    label: "H3-H6 Color",
    description: "Color for smaller heading levels and card titles.",
  },
  {
    key: "text_body_color",
    label: "Paragraph Text",
    description: "Default reading color for paragraphs, excerpts, and body copy.",
  },
  {
    key: "text_heading_subtext_color",
    label: "Heading Sub-Text",
    description: "Color for subtitle lines directly beneath major headings.",
  },
  {
    key: "text_supporting_copy_color",
    label: "Supporting Copy",
    description: "Use for section introductions, lead-in copy, and supporting editorial text.",
  },
  {
    key: "text_helper_text_color",
    label: "Helper Messaging",
    description: "Use for empty states, helper notes, and guidance text around UI and content.",
  },
  {
    key: "text_meta_color",
    label: "Meta Text",
    description: "Use for dates, authors, categories, labels, and small metadata.",
  },
  {
    key: "text_link_color",
    label: "Link Color",
    description: "Default color for editorial links and linked text actions.",
  },
  {
    key: "text_link_hover_color",
    label: "Link Hover Color",
    description: "Hover color for links and lightweight text actions.",
  },
  {
    key: "text_inverse_color",
    label: "Inverse Text",
    description: "Text shown on dark surfaces, image overlays, and high-contrast areas.",
  },
];

const BRANDING_UI_TEXT_COLOR_FIELDS: Array<{
  key: BrandingColorSettingKey;
  label: string;
  description: string;
}> = [
  {
    key: "text_primary_foreground_color",
    label: "Primary Text on Color",
    description: "Text shown on primary-colored buttons and badges.",
  },
  {
    key: "text_secondary_foreground_color",
    label: "Secondary Text on Color",
    description: "Text shown on secondary-colored UI surfaces.",
  },
  {
    key: "text_tertiary_foreground_color",
    label: "Tertiary Text on Color",
    description: "Text shown on tertiary/accent-colored UI surfaces.",
  },
];

const BRANDING_COLOR_FIELDS = [
  ...BRANDING_CORE_COLOR_FIELDS,
  ...BRANDING_TYPOGRAPHY_COLOR_FIELDS,
  ...BRANDING_UI_TEXT_COLOR_FIELDS,
] as const;

function BrandingImageCard({
  settingKey,
  title,
  description,
  currentUrl,
}: {
  settingKey: BrandingSettingKey;
  title: string;
  description: string;
  currentUrl: string;
}) {
  const { toast } = useToast();
  const [displayUrl, setDisplayUrl] = useState(currentUrl);

  useEffect(() => {
    setDisplayUrl(currentUrl);
  }, [currentUrl]);

  const saveMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("PUT", "/api/admin/settings", {
        key: settingKey,
        value: url,
        category: "branding",
        isSecret: false,
      });
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/branding"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/media"] }),
      ]);
      toast({ title: `${title} updated` });
    },
    onError: (error: Error) => {
      setDisplayUrl(currentUrl);
      toast({
        title: "Branding update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBrandingImageChange = (url: string) => {
    setDisplayUrl(url);
    saveMutation.mutate(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed bg-muted/20 p-4">
          {displayUrl ? (
            <img src={displayUrl} alt={title} className="max-h-16 w-auto object-contain" />
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              <p>No image uploaded yet.</p>
            </div>
          )}
        </div>

        <CmsImageUpload
          value={displayUrl}
          onChange={handleBrandingImageChange}
          helpText="Upload or choose an existing image from the shared Media Library."
          data-testid={`branding-media-${settingKey}`}
        />
      </CardContent>
    </Card>
  );
}

export type BrandingSubview = "branding" | "social-media" | "colors" | "typography";

export function BrandingTab({
  settings,
  initialSubtab = "branding",
  showHeader = true,
}: {
  settings: SettingsData;
  initialSubtab?: BrandingSubview;
  showHeader?: boolean;
}) {
  const { toast } = useToast();
  const brandingSettings = settings.branding || {};
  const [bodyFont, setBodyFont] = useState(
    brandingSettings.frontend_body_font?.value || "__default__",
  );
  const [headingFont, setHeadingFont] = useState(
    brandingSettings.frontend_heading_font?.value || "__default__",
  );
  const [companyInfo, setCompanyInfo] = useState<Record<BrandingCompanyInfoSettingKey, string>>({
    company_name: brandingSettings.company_name?.value || "",
    company_address: brandingSettings.company_address?.value || "",
    company_phone_numbers: brandingSettings.company_phone_numbers?.value || "",
    company_google_business_url: brandingSettings.company_google_business_url?.value || "",
  });
  const [socialUrls, setSocialUrls] = useState<Record<BrandingSocialSettingKey, string>>(
    () =>
      Object.fromEntries(
        SOCIAL_MEDIA_PLATFORMS.map((platform) => [
          platform.settingKey,
          brandingSettings[platform.settingKey]?.value || "",
        ]),
      ) as Record<BrandingSocialSettingKey, string>,
  );
  const [socialIconStyle, setSocialIconStyle] = useState<SocialIconStyle>(
    normalizeSocialIconStyle(brandingSettings.social_icon_style?.value),
  );
  const [colorValues, setColorValues] = useState<Record<BrandingColorSettingKey, string>>({
    brand_primary_color: brandingSettings.brand_primary_color?.value || "",
    brand_secondary_color: brandingSettings.brand_secondary_color?.value || "",
    brand_tertiary_color: brandingSettings.brand_tertiary_color?.value || "",
    brand_quaternary_color: brandingSettings.brand_quaternary_color?.value || "#A8623A",
    text_h1_color: brandingSettings.text_h1_color?.value || "",
    text_h2_color: brandingSettings.text_h2_color?.value || "",
    text_h3_h6_color: brandingSettings.text_h3_h6_color?.value || "",
    text_body_color: brandingSettings.text_body_color?.value || "",
    text_heading_subtext_color:
      brandingSettings.text_heading_subtext_color?.value ||
      brandingSettings.text_muted_color?.value ||
      "",
    text_supporting_copy_color:
      brandingSettings.text_supporting_copy_color?.value ||
      brandingSettings.text_muted_color?.value ||
      "",
    text_helper_text_color:
      brandingSettings.text_helper_text_color?.value ||
      brandingSettings.text_muted_color?.value ||
      "",
    text_meta_color: brandingSettings.text_meta_color?.value || "",
    text_link_color: brandingSettings.text_link_color?.value || "",
    text_link_hover_color: brandingSettings.text_link_hover_color?.value || "",
    text_inverse_color: brandingSettings.text_inverse_color?.value || "",
    text_primary_foreground_color: brandingSettings.text_primary_foreground_color?.value || "",
    text_secondary_foreground_color: brandingSettings.text_secondary_foreground_color?.value || "",
    text_tertiary_foreground_color: brandingSettings.text_tertiary_foreground_color?.value || "",
  });

  useEffect(() => {
    setBodyFont(brandingSettings.frontend_body_font?.value || "__default__");
    setHeadingFont(brandingSettings.frontend_heading_font?.value || "__default__");
    setCompanyInfo({
      company_name: brandingSettings.company_name?.value || "",
      company_address: brandingSettings.company_address?.value || "",
      company_phone_numbers: brandingSettings.company_phone_numbers?.value || "",
      company_google_business_url: brandingSettings.company_google_business_url?.value || "",
    });
    setSocialUrls(
      Object.fromEntries(
        SOCIAL_MEDIA_PLATFORMS.map((platform) => [
          platform.settingKey,
          brandingSettings[platform.settingKey]?.value || "",
        ]),
      ) as Record<BrandingSocialSettingKey, string>,
    );
    setSocialIconStyle(normalizeSocialIconStyle(brandingSettings.social_icon_style?.value));
    setColorValues({
      brand_primary_color: brandingSettings.brand_primary_color?.value || "",
      brand_secondary_color: brandingSettings.brand_secondary_color?.value || "",
      brand_tertiary_color: brandingSettings.brand_tertiary_color?.value || "",
      brand_quaternary_color: brandingSettings.brand_quaternary_color?.value || "#A8623A",
      text_h1_color: brandingSettings.text_h1_color?.value || "",
      text_h2_color: brandingSettings.text_h2_color?.value || "",
      text_h3_h6_color: brandingSettings.text_h3_h6_color?.value || "",
      text_body_color: brandingSettings.text_body_color?.value || "",
      text_heading_subtext_color:
        brandingSettings.text_heading_subtext_color?.value ||
        brandingSettings.text_muted_color?.value ||
        "",
      text_supporting_copy_color:
        brandingSettings.text_supporting_copy_color?.value ||
        brandingSettings.text_muted_color?.value ||
        "",
      text_helper_text_color:
        brandingSettings.text_helper_text_color?.value ||
        brandingSettings.text_muted_color?.value ||
        "",
      text_meta_color: brandingSettings.text_meta_color?.value || "",
      text_link_color: brandingSettings.text_link_color?.value || "",
      text_link_hover_color: brandingSettings.text_link_hover_color?.value || "",
      text_inverse_color: brandingSettings.text_inverse_color?.value || "",
      text_primary_foreground_color: brandingSettings.text_primary_foreground_color?.value || "",
      text_secondary_foreground_color:
        brandingSettings.text_secondary_foreground_color?.value || "",
      text_tertiary_foreground_color: brandingSettings.text_tertiary_foreground_color?.value || "",
    });
  }, [
    brandingSettings.frontend_body_font?.value,
    brandingSettings.frontend_heading_font?.value,
    brandingSettings.company_name?.value,
    brandingSettings.company_address?.value,
    brandingSettings.company_phone_numbers?.value,
    brandingSettings.company_google_business_url?.value,
    brandingSettings.social_icon_style?.value,
    ...SOCIAL_MEDIA_PLATFORMS.map((platform) => brandingSettings[platform.settingKey]?.value),
    brandingSettings.brand_primary_color?.value,
    brandingSettings.brand_secondary_color?.value,
    brandingSettings.brand_tertiary_color?.value,
    brandingSettings.brand_quaternary_color?.value,
    brandingSettings.text_h1_color?.value,
    brandingSettings.text_h2_color?.value,
    brandingSettings.text_h3_h6_color?.value,
    brandingSettings.text_body_color?.value,
    brandingSettings.text_heading_subtext_color?.value,
    brandingSettings.text_supporting_copy_color?.value,
    brandingSettings.text_helper_text_color?.value,
    brandingSettings.text_muted_color?.value,
    brandingSettings.text_meta_color?.value,
    brandingSettings.text_link_color?.value,
    brandingSettings.text_link_hover_color?.value,
    brandingSettings.text_inverse_color?.value,
    brandingSettings.text_primary_foreground_color?.value,
    brandingSettings.text_secondary_foreground_color?.value,
    brandingSettings.text_tertiary_foreground_color?.value,
  ]);

  const saveFontsMutation = useMutation({
    mutationFn: async () => {
      const requests = [
        apiRequest("PUT", "/api/admin/settings", {
          key: "frontend_body_font",
          value: bodyFont === "__default__" ? "" : bodyFont,
          category: "branding",
          isSecret: false,
        }),
        apiRequest("PUT", "/api/admin/settings", {
          key: "frontend_heading_font",
          value: headingFont === "__default__" ? "" : headingFont,
          category: "branding",
          isSecret: false,
        }),
      ];

      await Promise.all(requests);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/branding"] }),
      ]);
      toast({ title: "Branding fonts updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not save branding fonts",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const hasFontChanges =
    bodyFont !== (brandingSettings.frontend_body_font?.value || "__default__") ||
    headingFont !== (brandingSettings.frontend_heading_font?.value || "__default__");

  const saveCompanyInfoMutation = useMutation({
    mutationFn: async () => {
      const companyFields: BrandingCompanyInfoSettingKey[] = [
        "company_name",
        "company_address",
        "company_phone_numbers",
        "company_google_business_url",
      ];

      await Promise.all(
        companyFields.map((key) =>
          apiRequest("PUT", "/api/admin/settings", {
            key,
            value: companyInfo[key].trim(),
            category: "branding",
            isSecret: false,
          }),
        ),
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/branding"] }),
      ]);
      toast({ title: "Company information updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not save company information",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const hasCompanyInfoChanges = (
    [
      "company_name",
      "company_address",
      "company_phone_numbers",
      "company_google_business_url",
    ] as BrandingCompanyInfoSettingKey[]
  ).some((key) => companyInfo[key] !== (brandingSettings[key]?.value || ""));

  const saveSocialMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        ...SOCIAL_MEDIA_PLATFORMS.map((platform) =>
          apiRequest("PUT", "/api/admin/settings", {
            key: platform.settingKey,
            value: socialUrls[platform.settingKey].trim(),
            category: "branding",
            isSecret: false,
          }),
        ),
        apiRequest("PUT", "/api/admin/settings", {
          key: "social_icon_style",
          value: socialIconStyle,
          category: "branding",
          isSecret: false,
        }),
      ]);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/branding"] }),
      ]);
      toast({ title: "Social media links updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not save social media links",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const hasSocialChanges =
    socialIconStyle !== normalizeSocialIconStyle(brandingSettings.social_icon_style?.value) ||
    SOCIAL_MEDIA_PLATFORMS.some(
      (platform) =>
        socialUrls[platform.settingKey] !== (brandingSettings[platform.settingKey]?.value || ""),
    );

  const socialPreviewLinks = getSocialMediaLinks(socialUrls);

  const saveColorsMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        BRANDING_COLOR_FIELDS.map((field) =>
          apiRequest("PUT", "/api/admin/settings", {
            key: field.key,
            value: normalizeHexColor(colorValues[field.key]) || "",
            category: "branding",
            isSecret: false,
          }),
        ),
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/branding"] }),
      ]);
      toast({ title: "Brand color palette updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not save brand colors",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const hasColorChanges = BRANDING_COLOR_FIELDS.some(
    (field) => colorValues[field.key] !== (brandingSettings[field.key]?.value || ""),
  );

  const previewBodyStyle = {
    fontFamily:
      fontFamilyForBrandingOption(bodyFont === "__default__" ? null : bodyFont) ?? undefined,
  };
  const previewHeadingStyle = {
    fontFamily:
      fontFamilyForBrandingOption(headingFont === "__default__" ? null : headingFont) ?? undefined,
  };

  const previewPaletteStyle = {
    backgroundColor: colorValues.brand_primary_color || undefined,
    color: colorValues.text_primary_foreground_color || undefined,
  };
  const previewLinkStyle = {
    color: colorValues.text_link_color || undefined,
  };
  const previewLinkHoverStyle = {
    color: colorValues.text_link_hover_color || colorValues.text_link_color || undefined,
  };

  const updateColorValue = (key: BrandingColorSettingKey, value: string) => {
    setColorValues((current) => ({ ...current, [key]: value }));
  };

  const renderFontOptionCard = (
    option: BrandingFontOption,
    selectedValue: string,
    onSelect: (value: string) => void,
    sampleKind: "heading" | "body",
  ) => (
    <button
      key={option.value}
      type="button"
      onClick={() => onSelect(option.value)}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5",
        selectedValue === option.value
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border/70 bg-background",
      )}
      data-testid={`button-branding-font-${sampleKind}-${option.value}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold" style={{ fontFamily: option.family }}>
            {option.label}
          </p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {option.category === "sans" ? "Sans Serif" : "Serif"}
          </p>
        </div>
        {selectedValue === option.value && (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-3 text-balance text-slate-900",
          sampleKind === "heading" ? "text-xl font-semibold" : "text-sm",
        )}
        style={{ fontFamily: option.family }}
      >
        {sampleKind === "heading"
          ? "The right words should feel understood."
          : "Thoughtful typography helps editors preview the real feeling of the brand before publishing."}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{option.preview}</p>
    </button>
  );

  return (
    <div className="space-y-6">
      {showHeader && (
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-branding-heading">
            Branding
          </h3>
          <p className="text-sm text-muted-foreground">
            Control the public logo, favicon, color palette, and frontend typography. Branding
            images are stored in Cloudflare R2 under the `branding/` directory.
          </p>
        </div>
      )}

      <Tabs defaultValue={initialSubtab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4" data-testid="tabs-branding-subtabs">
          <TabsTrigger value="branding" data-testid="tab-branding-subtab-branding">
            <ImageIcon className="mr-1.5 h-4 w-4 text-teal-600" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="social-media" data-testid="tab-branding-subtab-social-media">
            <Link2 className="mr-1.5 h-4 w-4 text-emerald-600" />
            Social Media
          </TabsTrigger>
          <TabsTrigger value="colors" data-testid="tab-branding-subtab-colors">
            <Palette className="mr-1.5 h-4 w-4 text-violet-600" />
            Color Palette
          </TabsTrigger>
          <TabsTrigger value="typography" data-testid="tab-branding-subtab-typography">
            <Type className="mr-1.5 h-4 w-4 text-indigo-600" />
            Typography
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <BrandingImageCard
              settingKey="frontend_logo_url"
              title="Frontend Logo"
              description="Shown in the site header and footer."
              currentUrl={brandingSettings.frontend_logo_url?.value || ""}
            />
            <BrandingImageCard
              settingKey="favicon_url"
              title="Favicon"
              description="Shown in the browser tab, bookmarks, and saved shortcuts."
              currentUrl={brandingSettings.favicon_url?.value || ""}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" />
                Company Information
              </CardTitle>
              <CardDescription>
                These details automatically populate the Location card on the Contact page and the
                live Contact Form block.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-name">Business Name</Label>
                <Input
                  id="company-name"
                  value={companyInfo.company_name}
                  onChange={(event) =>
                    setCompanyInfo((current) => ({ ...current, company_name: event.target.value }))
                  }
                  placeholder="Core Platform"
                  data-testid="input-company-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-google-business-url">Google Business Listing URL</Label>
                <Input
                  id="company-google-business-url"
                  value={companyInfo.company_google_business_url}
                  onChange={(event) =>
                    setCompanyInfo((current) => ({
                      ...current,
                      company_google_business_url: event.target.value,
                    }))
                  }
                  placeholder="https://maps.google.com/..."
                  autoPrependHttps
                  data-testid="input-company-google-business-url"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="company-address">Address</Label>
                <Textarea
                  id="company-address"
                  value={companyInfo.company_address}
                  onChange={(event) =>
                    setCompanyInfo((current) => ({
                      ...current,
                      company_address: event.target.value,
                    }))
                  }
                  placeholder={"123 Example Street\nSuite 100\nAtlanta, GA 30303"}
                  rows={4}
                  data-testid="textarea-company-address"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="company-phone-numbers">Phone Number(s)</Label>
                <Textarea
                  id="company-phone-numbers"
                  value={companyInfo.company_phone_numbers}
                  onChange={(event) =>
                    setCompanyInfo((current) => ({
                      ...current,
                      company_phone_numbers: event.target.value,
                    }))
                  }
                  placeholder={"(555) 123-4567\n(555) 765-4321"}
                  rows={3}
                  data-testid="textarea-company-phone-numbers"
                />
                <p className="text-xs text-muted-foreground">
                  Add one phone number per line to display multiple phone numbers.
                </p>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button
                  type="button"
                  onClick={() => saveCompanyInfoMutation.mutate()}
                  disabled={!hasCompanyInfoChanges || saveCompanyInfoMutation.isPending}
                  data-testid="button-save-company-information"
                >
                  {saveCompanyInfoMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Company Information
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social-media" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-4 w-4 text-primary" />
                Social Media
              </CardTitle>
              <CardDescription>
                Add social profile URLs for the public footer and the company contact information
                card. Empty fields stay hidden on the website.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                {SOCIAL_MEDIA_PLATFORMS.map((platform) => (
                  <div key={platform.key} className="space-y-1.5">
                    <Label htmlFor={`social-${platform.key}`}>{platform.label}</Label>
                    <Input
                      id={`social-${platform.key}`}
                      value={socialUrls[platform.settingKey]}
                      onChange={(event) =>
                        setSocialUrls((current) => ({
                          ...current,
                          [platform.settingKey]: event.target.value,
                        }))
                      }
                      placeholder={`https://${platform.key === "x" ? "x.com" : `${platform.key}.com`}/your-profile`}
                      autoPrependHttps
                      data-testid={`input-social-${platform.key}`}
                    />
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
                <div className="space-y-1.5">
                  <Label>Icon Style</Label>
                  <Select
                    value={socialIconStyle}
                    onValueChange={(value) => setSocialIconStyle(normalizeSocialIconStyle(value))}
                  >
                    <SelectTrigger data-testid="select-social-icon-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brand">Brand Color</SelectItem>
                      <SelectItem value="outline">Outline</SelectItem>
                      <SelectItem value="solid">Solid</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose how icons should appear in the footer and contact card.
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/10 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Preview
                  </p>
                  <div className="mt-3">
                    {socialPreviewLinks.length > 0 ? (
                      <SocialMediaLinks links={socialPreviewLinks} iconStyle={socialIconStyle} />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Add at least one social URL to preview the icon style.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => saveSocialMutation.mutate()}
                  disabled={!hasSocialChanges || saveSocialMutation.isPending}
                  data-testid="button-save-social-media"
                >
                  {saveSocialMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Social Media
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4 text-primary" />
                Color Palette
              </CardTitle>
              <CardDescription>
                Set the core frontend brand colors, typography colors, and UI foreground colors.
                This keeps headings, body copy, supporting text, metadata, and links distinct
                without needing one-off overrides.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {[
                {
                  title: "Core Colors",
                  description:
                    "These power the main brand accents, buttons, and highlighted interface states on the public site.",
                  fields: BRANDING_CORE_COLOR_FIELDS,
                },
                {
                  title: "Typography Colors",
                  description:
                    "Use these to separate major headings, paragraph copy, section subtext, metadata, and editorial links.",
                  fields: BRANDING_TYPOGRAPHY_COLOR_FIELDS,
                },
                {
                  title: "Text on Color Surfaces",
                  description:
                    "These colors are used when text appears on branded buttons, badges, and other colored UI surfaces.",
                  fields: BRANDING_UI_TEXT_COLOR_FIELDS,
                },
              ].map((group) => (
                <div key={group.title} className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold">{group.title}</h4>
                    <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {group.fields.map((field) => (
                      <div key={field.key} className="space-y-1.5 rounded-xl border p-4">
                        <div>
                          <Label>{field.label}</Label>
                          <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={normalizeHexColor(colorValues[field.key]) || "#000000"}
                            onChange={(event) =>
                              updateColorValue(field.key, event.target.value.toUpperCase())
                            }
                            className="h-10 w-12 cursor-pointer rounded-md border bg-background p-1"
                            data-testid={`input-color-${field.key}`}
                          />
                          <Input
                            value={colorValues[field.key]}
                            onChange={(event) => updateColorValue(field.key, event.target.value)}
                            placeholder="#000000"
                            data-testid={`input-hex-${field.key}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="rounded-xl border bg-muted/10 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Palette Preview
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <div
                    className="rounded-lg px-4 py-2 text-sm font-medium"
                    style={previewPaletteStyle}
                  >
                    Primary Action
                  </div>
                  <div
                    className="rounded-lg px-4 py-2 text-sm font-medium"
                    style={{
                      backgroundColor: colorValues.brand_secondary_color || undefined,
                      color: colorValues.text_secondary_foreground_color || undefined,
                    }}
                  >
                    Secondary Action
                  </div>
                  <div
                    className="rounded-lg px-4 py-2 text-sm font-medium"
                    style={{
                      backgroundColor: colorValues.brand_tertiary_color || undefined,
                      color: colorValues.text_tertiary_foreground_color || undefined,
                    }}
                  >
                    Tertiary Action
                  </div>
                  <div
                    className="rounded-lg px-4 py-2 text-sm font-medium"
                    style={{
                      backgroundColor: colorValues.brand_quaternary_color || "#A8623A",
                      color:
                        colorValues.text_inverse_color ||
                        colorValues.text_primary_foreground_color ||
                        undefined,
                    }}
                  >
                    Quaternary Action
                  </div>
                </div>
                <div className="mt-5 rounded-xl border bg-background p-5 space-y-3">
                  <p
                    className="text-3xl font-semibold"
                    style={{
                      ...previewHeadingStyle,
                      color: colorValues.text_h1_color || colorValues.text_body_color || undefined,
                    }}
                  >
                    H1 headline preview
                  </p>
                  <p
                    className="text-2xl font-semibold"
                    style={{
                      ...previewHeadingStyle,
                      color:
                        colorValues.text_h2_color ||
                        colorValues.text_h1_color ||
                        colorValues.text_body_color ||
                        undefined,
                    }}
                  >
                    H2 section heading preview
                  </p>
                  <p
                    className="text-lg font-semibold"
                    style={{
                      ...previewHeadingStyle,
                      color:
                        colorValues.text_h3_h6_color ||
                        colorValues.text_h2_color ||
                        colorValues.text_body_color ||
                        undefined,
                    }}
                  >
                    H3-H6 card and supporting heading preview
                  </p>
                  <p
                    className="text-sm"
                    style={{
                      ...previewBodyStyle,
                      color: colorValues.text_heading_subtext_color || undefined,
                    }}
                  >
                    Heading sub-text preview directly beneath a hero or section heading.
                  </p>
                  <p
                    className="text-sm"
                    style={{
                      ...previewBodyStyle,
                      color: colorValues.text_supporting_copy_color || undefined,
                    }}
                  >
                    Supporting copy preview for section introductions, lead-ins, and editorial
                    setup.
                  </p>
                  <p
                    className="text-sm"
                    style={{
                      ...previewBodyStyle,
                      color: colorValues.text_helper_text_color || undefined,
                    }}
                  >
                    Helper messaging preview for empty states, guidance text, and interface hints.
                  </p>
                  <p
                    className="text-sm"
                    style={{ ...previewBodyStyle, color: colorValues.text_body_color || undefined }}
                  >
                    Paragraph text preview for reading content, blog excerpts, and general body copy
                    throughout the site.
                  </p>
                  <p
                    className="text-xs uppercase tracking-wide"
                    style={{
                      color:
                        colorValues.text_meta_color ||
                        colorValues.text_helper_text_color ||
                        undefined,
                    }}
                  >
                    Meta text preview for dates, authors, categories, and labels
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <a
                      href="#branding-preview-link"
                      className="underline underline-offset-4"
                      style={previewLinkStyle}
                    >
                      Link color preview
                    </a>
                    <span className="underline underline-offset-4" style={previewLinkHoverStyle}>
                      Link hover preview
                    </span>
                  </div>
                  <div
                    className="rounded-lg px-4 py-3 text-sm font-medium"
                    style={{
                      backgroundColor: colorValues.brand_primary_color || "#1F2A44",
                      color:
                        colorValues.text_inverse_color ||
                        colorValues.text_primary_foreground_color ||
                        undefined,
                    }}
                  >
                    Inverse text preview on dark or branded surfaces
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => saveColorsMutation.mutate()}
                  disabled={!hasColorChanges || saveColorsMutation.isPending}
                  data-testid="button-save-branding-colors"
                >
                  {saveColorsMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Color Palette
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="typography" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Type className="h-4 w-4 text-primary" />
                Frontend Typography
              </CardTitle>
              <CardDescription>
                Choose one font for headings and another for body copy on the public-facing website.
                Each option includes an inline sample so editors can compare type directly in the
                admin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Heading Font</Label>
                  <Select value={headingFont} onValueChange={setHeadingFont}>
                    <SelectTrigger data-testid="select-branding-heading-font">
                      <SelectValue placeholder="Use current theme font" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">Use current theme font</SelectItem>
                      {BRANDING_FONT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose from 10 sans serif and 10 serif Google fonts.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Body Font</Label>
                  <Select value={bodyFont} onValueChange={setBodyFont}>
                    <SelectTrigger data-testid="select-branding-body-font">
                      <SelectValue placeholder="Use current theme font" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">Use current theme font</SelectItem>
                      {BRANDING_FONT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose from the same balanced font library for paragraph copy.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Heading Font Picker</CardTitle>
                    <CardDescription>
                      Preview how each font feels in large editorial headings.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Sans Serif Options
                        </p>
                      </div>
                      <div className="grid gap-3">
                        {BRANDING_SANS_FONT_OPTIONS.map((option) =>
                          renderFontOptionCard(option, headingFont, setHeadingFont, "heading"),
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Serif Options
                        </p>
                      </div>
                      <div className="grid gap-3">
                        {BRANDING_SERIF_FONT_OPTIONS.map((option) =>
                          renderFontOptionCard(option, headingFont, setHeadingFont, "heading"),
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Body Font Picker</CardTitle>
                    <CardDescription>
                      Preview how each font reads in paragraph-sized content.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Sans Serif Options
                        </p>
                      </div>
                      <div className="grid gap-3">
                        {BRANDING_SANS_FONT_OPTIONS.map((option) =>
                          renderFontOptionCard(option, bodyFont, setBodyFont, "body"),
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Serif Options
                        </p>
                      </div>
                      <div className="grid gap-3">
                        {BRANDING_SERIF_FONT_OPTIONS.map((option) =>
                          renderFontOptionCard(option, bodyFont, setBodyFont, "body"),
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-xl border bg-muted/10 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Preview
                </p>
                <h4 className="mt-3 text-2xl font-semibold" style={previewHeadingStyle}>
                  Core Platform helps globally mobile families feel understood.
                </h4>
                <p className="mt-3 text-sm text-muted-foreground" style={previewBodyStyle}>
                  Use this preview to compare heading and body combinations before saving. These
                  font selections only apply to the public-facing website, not the admin dashboard.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => saveFontsMutation.mutate()}
                  disabled={!hasFontChanges || saveFontsMutation.isPending}
                  data-testid="button-save-branding-fonts"
                >
                  {saveFontsMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Typography
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
