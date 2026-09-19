import React, { type ComponentType, type HTMLAttributes, type ReactNode } from "react";
import { ImageIcon, MapPin } from "lucide-react";

type Container = ComponentType<HTMLAttributes<HTMLDivElement>>;
type Containers = Partial<
  Record<"Card" | "CardHeader" | "CardTitle" | "CardDescription" | "CardContent", Container>
>;
const Div = (props: HTMLAttributes<HTMLDivElement>) => <div {...props} />;
export const BRANDING_COMPANY_FIELDS = [
  {
    key: "company_name",
    id: "company-name",
    label: "Business Name",
    placeholder: "P1 Land & Property Management",
    rows: 0,
  },
  {
    key: "company_google_business_url",
    id: "company-google-business-url",
    label: "Google Business Listing URL",
    placeholder: "https://maps.google.com/...",
    rows: 0,
  },
  {
    key: "company_address",
    id: "company-address",
    label: "Address",
    placeholder: "123 Example Street\nSuite 100\nCity, State ZIP",
    rows: 4,
  },
  {
    key: "company_phone_numbers",
    id: "company-phone-numbers",
    label: "Phone Number(s)",
    placeholder: "(555) 123-4567\n(555) 765-4321",
    rows: 3,
  },
] as const;
export type BrandingCompanyField = (typeof BRANDING_COMPANY_FIELDS)[number];

/** Replace the automatic focus prefix when a complete URL is pasted after it. */
export function normalizeBrandingUrl(value: string): string {
  return value.replace(/^https:\/\/(?=https?:\/\/)/i, "");
}

/** Original separate Frontend Logo/Favicon cards; media operations stay in the host. */
export function BrandingImageEditor({
  components = {},
  title,
  description,
  imageUrl,
  control,
}: {
  components?: Containers;
  title: string;
  description: string;
  imageUrl: string;
  control: ReactNode;
}) {
  const {
    Card = Div,
    CardHeader = Div,
    CardTitle = Div,
    CardDescription = Div,
    CardContent = Div,
  } = components;
  return (
    <Card className="branding-image-card">
      <CardHeader className="branding-card-header">
        <CardTitle className="branding-card-title flex items-center gap-2 text-base">
          <ImageIcon className="h-4 w-4 text-primary" aria-hidden="true" />
          {title}
        </CardTitle>
        <CardDescription className="branding-card-description">{description}</CardDescription>
      </CardHeader>
      <CardContent className="branding-card-content space-y-4">
        <div className="branding-image-preview flex min-h-[120px] items-center justify-center rounded-xl border border-dashed bg-muted/20 p-4">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              referrerPolicy="no-referrer"
              className="max-h-16 w-auto object-contain"
            />
          ) : (
            <div className="branding-empty text-center text-sm text-muted-foreground">
              <p>No image uploaded yet.</p>
            </div>
          )}
        </div>
        {control}
      </CardContent>
    </Card>
  );
}

/** Retained Branding tab layout and company fields, shared without coupling transports. */
export function BrandingEditor({
  components = {},
  images,
  renderField,
  toolbar,
  notices,
}: {
  components?: Containers;
  images: ReactNode;
  renderField: (field: BrandingCompanyField) => ReactNode;
  toolbar: ReactNode;
  notices?: ReactNode;
}) {
  const {
    Card = Div,
    CardHeader = Div,
    CardTitle = Div,
    CardDescription = Div,
    CardContent = Div,
  } = components;
  return (
    <div className="branding-editor space-y-6">
      {notices}
      <div className="branding-image-grid grid gap-6 lg:grid-cols-2">{images}</div>
      <Card className="branding-company-card">
        <CardHeader className="branding-card-header">
          <CardTitle className="branding-card-title flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            Company Information
          </CardTitle>
          <CardDescription className="branding-card-description">
            These details automatically populate the Location card on the Contact page and the live
            Contact Form block.
          </CardDescription>
        </CardHeader>
        <CardContent className="branding-company-content grid gap-4 md:grid-cols-2">
          {BRANDING_COMPANY_FIELDS.map((field) => (
            <div
              key={field.key}
              className={`branding-company-field space-y-2 ${field.rows ? "branding-company-wide md:col-span-2" : ""}`}
            >
              <label htmlFor={field.id} className="text-sm font-medium leading-none">
                {field.label}
              </label>
              {renderField(field)}
              {field.key === "company_phone_numbers" && (
                <p className="branding-help text-xs text-muted-foreground">
                  Add one phone number per line to display multiple phone numbers.
                </p>
              )}
            </div>
          ))}
          <div className="branding-toolbar branding-company-wide md:col-span-2 flex gap-2">
            {toolbar}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
