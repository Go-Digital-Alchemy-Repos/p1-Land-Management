import logo from '@assets/Asset_1_1782329698014.svg';
import { cmsValue, useCms } from './cms';
import { resolveSiteIdentity } from './site-identity';
import { BUSINESS_NAME, PHONE_DISPLAY, GOOGLE_BUSINESS_URL } from './site';
export function useSiteIdentity() {
  const context = useCms();
  // Keep the existing editor's global fields discoverable during manifest
  // collection. The explicit identity projection wins only at render time.
  cmsValue(context, logo, 'image', true);
  cmsValue(context, BUSINESS_NAME, 'imageAlt', true);
  cmsValue(context, PHONE_DISPLAY, 'text', true);
  cmsValue(context, 'tel:7042218928', 'ctaTarget', true);
  cmsValue(context, GOOGLE_BUSINESS_URL, 'ctaTarget', true);
  return resolveSiteIdentity(context.snapshot.identity, context.snapshot.global, logo);
}
