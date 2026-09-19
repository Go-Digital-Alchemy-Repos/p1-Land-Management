import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ImageIcon, Link2, Loader2, MapPin, Palette, Save, Type } from "lucide-react";

import { ColorEditor, BRANDING_COLOR_FIELDS, type BrandingColorSettingKey } from "@/components/shared/color-editor";
import { TypographyEditor } from "@/components/shared/typography-editor";
import { CmsImageUpload } from "@/features/admin/cms/components/cms-image-upload";
import { SocialMediaEditor, normalizePrefilledSocialUrl } from "@/components/shared/social-media-editor";
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
  fontFamilyForBrandingOption,
  normalizeHexColor,
} from "@/lib/branding";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

  const updateColorValue = (key: BrandingColorSettingKey, value: string) => {
    setColorValues((current) => ({ ...current, [key]: value }));
  };

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
          <SocialMediaEditor
            components={{ Card, CardHeader, CardTitle, CardDescription, CardContent }}
            renderInput={(platform) => (
              <Input
                id={`social-${platform.key}`}
                value={socialUrls[platform.settingKey]}
                onChange={(event) => setSocialUrls((current) => ({ ...current, [platform.settingKey]: normalizePrefilledSocialUrl(event.target.value) }))}
                placeholder={`https://${platform.key === "x" ? "x.com" : `${platform.key}.com`}/your-profile`}
                autoPrependHttps
                data-testid={`input-social-${platform.key}`}
              />
            )}
            styleControl={
              <Select value={socialIconStyle} onValueChange={(value) => setSocialIconStyle(normalizeSocialIconStyle(value))}>
                <SelectTrigger id="social-icon-style" data-testid="select-social-icon-style"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brand">Brand Color</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="solid">Solid</SelectItem>
                </SelectContent>
              </Select>
            }
            preview={socialPreviewLinks.length > 0 ? <SocialMediaLinks links={socialPreviewLinks} iconStyle={socialIconStyle} /> : null}
            toolbar={
              <Button type="button" onClick={() => saveSocialMutation.mutate()} disabled={!hasSocialChanges || saveSocialMutation.isPending} data-testid="button-save-social-media">
                {saveSocialMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Social Media
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="colors" className="space-y-6">
          <ColorEditor
            components={{ Card, CardHeader, CardTitle, CardDescription, CardContent }}
            previewValues={colorValues}
            previewHeadingStyle={previewHeadingStyle}
            previewBodyStyle={previewBodyStyle}
            renderControls={(field) => <>
              <input type="color" value={normalizeHexColor(colorValues[field.key]) || "#000000"}
                onChange={(event) => updateColorValue(field.key, event.target.value.toUpperCase())}
                aria-label={`${field.label} picker`} className="h-10 w-12 cursor-pointer rounded-md border bg-background p-1"
                data-testid={`input-color-${field.key}`} />
              <Input id={field.key} value={colorValues[field.key]} onChange={(event) => updateColorValue(field.key, event.target.value)}
                aria-describedby={`${field.key}-description`} placeholder="#000000" data-testid={`input-hex-${field.key}`} />
            </>}
            toolbar={<Button type="button" onClick={() => saveColorsMutation.mutate()} disabled={!hasColorChanges || saveColorsMutation.isPending} data-testid="button-save-branding-colors">
              {saveColorsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Color Palette
            </Button>}
          />
        </TabsContent>

        <TabsContent value="typography" className="space-y-6">
          <TypographyEditor
            components={{ Card, CardHeader, CardTitle, CardDescription, CardContent }}
            options={BRANDING_FONT_OPTIONS}
            headingValue={headingFont}
            bodyValue={bodyFont}
            onSelect={(kind, value) => kind === "heading" ? setHeadingFont(value) : setBodyFont(value)}
            renderSelect={(kind) => (
              <Select value={kind === "heading" ? headingFont : bodyFont} onValueChange={kind === "heading" ? setHeadingFont : setBodyFont}>
                <SelectTrigger id={`frontend_${kind}_font`} data-testid={`select-branding-${kind}-font`}><SelectValue placeholder="Use current theme font" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">Use current theme font</SelectItem>
                  {BRANDING_FONT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            toolbar={
              <Button type="button" onClick={() => saveFontsMutation.mutate()} disabled={!hasFontChanges || saveFontsMutation.isPending} data-testid="button-save-branding-fonts">
                {saveFontsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Typography
              </Button>
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
