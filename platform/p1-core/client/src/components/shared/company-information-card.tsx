import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBranding } from "./branding-provider";
import { SocialMediaLinks } from "./social-media-links";

function normalizePhoneHref(value: string) {
  const normalized = value.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : null;
}

export function CompanyInformationCard({
  titleClassName,
  bodyClassName,
  linkClassName,
}: {
  titleClassName?: string;
  bodyClassName?: string;
  linkClassName?: string;
}) {
  const branding = useBranding();
  const companyName = branding.companyName?.trim() || "";
  const companyAddress = branding.companyAddress?.trim() || "";
  const companyGoogleBusinessUrl = branding.companyGoogleBusinessUrl?.trim() || "";
  const phoneNumbers = (branding.companyPhoneNumbers || "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
  const socialLinks = branding.socialLinks;

  const hasCompanyInfo = Boolean(
    companyName || companyAddress || phoneNumbers.length || socialLinks.length,
  );

  return (
    <Card data-testid="card-contact-location">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-5 w-5 text-accent" />
          <div className="space-y-2">
            <div>
              {hasCompanyInfo ? (
                <div className={cn("space-y-1 text-sm text-muted-foreground", bodyClassName)}>
                  {companyName ? (
                    <p className={cn("font-medium text-foreground", titleClassName)}>
                      {companyName}
                    </p>
                  ) : null}
                  {companyAddress ? (
                    companyGoogleBusinessUrl ? (
                      <a
                        href={companyGoogleBusinessUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          "block whitespace-pre-line underline-offset-4 hover:underline",
                          linkClassName,
                        )}
                      >
                        {companyAddress}
                      </a>
                    ) : (
                      <p className="whitespace-pre-line">{companyAddress}</p>
                    )
                  ) : null}
                </div>
              ) : (
                <p className={cn("text-sm text-muted-foreground", bodyClassName)}>
                  Global — serving Core Platforms worldwide
                </p>
              )}
            </div>

            {phoneNumbers.length > 0 ? (
              <div className="space-y-1">
                {phoneNumbers.map((phone) => {
                  const href = normalizePhoneHref(phone);
                  return (
                    <div
                      key={phone}
                      className={cn(
                        "flex items-start gap-2 text-sm text-muted-foreground",
                        bodyClassName,
                      )}
                    >
                      <Phone className="mt-0.5 h-3.5 w-3.5" />
                      {href ? (
                        <a
                          href={href}
                          className={cn("underline-offset-4 hover:underline", linkClassName)}
                        >
                          {phone}
                        </a>
                      ) : (
                        <span>{phone}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
            <SocialMediaLinks
              links={socialLinks}
              iconStyle={branding.socialIconStyle}
              className={phoneNumbers.length > 0 ? "pt-1" : undefined}
              size="sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
