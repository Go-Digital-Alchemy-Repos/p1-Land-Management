import { Card, CardContent } from "@/components/ui/card";
import { useBranding } from "./branding-provider";
import { SocialMediaLinks } from "./social-media-links";
import { CompanyInformationPresentation } from "../../features/admin/cms/builder/company-information-presentation";
export function CompanyInformationCard(props: {
  titleClassName?: string;
  bodyClassName?: string;
  linkClassName?: string;
}) {
  const branding = useBranding();
  return (
    <CompanyInformationPresentation
      {...props}
      branding={branding}
      ui={{ Card, CardContent }}
      social={
        <SocialMediaLinks
          links={branding.socialLinks}
          iconStyle={branding.socialIconStyle}
          className={branding.companyPhoneNumbers?.trim() ? "pt-1" : undefined}
          size="sm"
        />
      }
    />
  );
}
