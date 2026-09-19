import React from "react";
import {
  Globe,
  BarChart2,
  ArrowUpRight,
  Map,
  ArrowRight,
  Building2,
  Type,
  Image,
  Share2,
  ToggleRight,
  ToggleLeft,
  Trash2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from "./seo-primitives";
import "./seo-presentation.css";
export const SEO_TABS = [
  { value: "Defaults", label: "Global Settings", Icon: Globe, color: "text-blue-600" },
  { value: "Audit", label: "SEO Audit", Icon: BarChart2, color: "text-emerald-600" },
  { value: "Redirects", label: "Redirects", Icon: ArrowUpRight, color: "text-amber-600" },
  { value: "Sitemap and robots", label: "Sitemap", Icon: Map, color: "text-cyan-600" },
] as const;
export function SeoTabNavigation({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <nav className="seo-tabs" aria-label="SEO tools">
      {SEO_TABS.map(({ value: key, label, Icon, color }) => (
        <button
          type="button"
          key={key}
          aria-current={value === key ? "page" : undefined}
          onClick={() => onChange(key)}
        >
          <Icon size={16} className={color} />
          {label}
        </button>
      ))}
    </nav>
  );
}
export const SEO_SETTINGS_GROUPS = [
  {
    title: "Site Identity",
    description: "Core identity values used across SEO tags and structured data",
    Icon: Building2,
    color: "text-violet-500",
    keys: ["siteName", "siteUrl", "organizationName"],
  },
  {
    title: "Default SEO Meta",
    description: "Fallback metadata for content without custom SEO values",
    Icon: Type,
    color: "text-blue-500",
    keys: ["titleSuffix", "defaultMetaDescription"],
  },
  {
    title: "Default Open Graph Image",
    description: "Default social sharing image",
    Icon: Image,
    color: "text-emerald-500",
    keys: ["defaultOgImageUrl"],
  },
  {
    title: "Organization Logo",
    description: "Logo used in organization structured data",
    Icon: Image,
    color: "text-amber-500",
    keys: ["organizationLogoUrl"],
  },
  {
    title: "Social Profiles",
    description: "Public profiles associated with your organization",
    Icon: Share2,
    color: "text-indigo-500",
    keys: ["facebookUrl", "twitterHandle", "linkedinUrl", "instagramUrl"],
  },
];
export function SeoSettingsCard({
  title,
  description,
  Icon = Globe,
  color = "text-blue-500",
  children,
}: {
  title: string;
  description: string;
  Icon?: React.ElementType;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
export function SeoRedirectRow({
  redirect,
  actions,
}: {
  redirect: {
    id: string;
    fromPath: string;
    toPath: string;
    statusCode: number;
    isActive: boolean;
    note?: string | null;
  };
  actions: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-3 py-3 border-b last:border-0 ${!redirect.isActive ? "opacity-50" : ""}`}
      data-testid={`redirect-row-${redirect.id}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
            {redirect.fromPath}
          </code>
          <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{redirect.toPath}</code>
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {redirect.statusCode}
          </Badge>
          {!redirect.isActive && <Badge className="text-xs">Inactive</Badge>}
        </div>
        {redirect.note && <p className="text-xs text-muted-foreground mt-1">{redirect.note}</p>}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">{actions}</div>
    </div>
  );
}
