import { cmsFieldKey } from './cms-field-identity.ts';
import { BUSINESS_NAME, PHONE_DISPLAY, PHONE_HREF, GOOGLE_BUSINESS_URL, LOGO_URL, SITE_URL } from './site.ts';
import type { CmsIdentity, CmsValues } from './cms';

function coherentPhone(identity: CmsIdentity | null | undefined): identity is CmsIdentity & { phoneDisplay: string; phoneHref: string } {
  if (!identity?.phoneDisplay || !identity.phoneHref || identity.phoneDisplay.length > 80 || !/^\+?[0-9() .-]+$/.test(identity.phoneDisplay) || !/^tel:\+[0-9]{7,15}$/.test(identity.phoneHref)) return false;
  const digits = identity.phoneDisplay.replace(/\D/g, '');
  const international = identity.phoneDisplay.startsWith('+') ? digits : digits.length === 10 ? `1${digits}` : digits.length === 11 && digits.startsWith('1') ? digits : '';
  return identity.phoneHref === `tel:+${international}`;
}

export function resolveSiteIdentity(identity: CmsIdentity | null | undefined, global: CmsValues, bundledLogo = LOGO_URL) {
  const text = (original: string, kind = 'text') => {
    const candidate = global[cmsFieldKey(original, kind)];
    if (typeof candidate !== 'string' || !candidate.trim() || candidate.length > 12000 || /[\u0000-\u001f\\]/.test(candidate)) return original;
    if (kind === 'ctaTarget' && !/^(tel:|https:\/\/)/.test(candidate)) return original;
    return candidate;
  };
  const image = (candidate: unknown): string | null => typeof candidate === 'string' && !/[\u0000-\u001f\\]/.test(candidate) && /^(\/(?!\/)|https:\/\/www\.p1landmanagement\.com\/)/.test(candidate) ? candidate : null;
  const publishedLogo = image(global[cmsFieldKey(bundledLogo, 'image')]);
  const publishedDisplay = text(PHONE_DISPLAY);
  const publishedHref = text('tel:7042218928', 'ctaTarget');
  const displayDigits = publishedDisplay.replace(/\D/g, '');
  const targetDigits = publishedHref.startsWith('tel:') ? publishedHref.slice(4).replace(/\D/g, '') : '';
  let phoneDisplay = PHONE_DISPLAY, phoneHref = PHONE_HREF;
  if (coherentPhone(identity)) {
    phoneDisplay = identity.phoneDisplay; phoneHref = identity.phoneHref;
  } else if (publishedDisplay !== PHONE_DISPLAY && /^\d{10,15}$/.test(displayDigits)) {
    phoneDisplay = publishedDisplay;
    phoneHref = `tel:${displayDigits.length === 10 ? '+1' : '+'}${displayDigits}`;
  } else if (/^\d{10,15}$/.test(targetDigits)) {
    phoneHref = publishedHref === 'tel:7042218928' ? PHONE_HREF : publishedHref;
    if (targetDigits !== '7042218928' && targetDigits !== '17042218928') phoneDisplay = targetDigits.length === 10 ? `(${targetDigits.slice(0,3)}) ${targetDigits.slice(3,6)}-${targetDigits.slice(6)}` : `+${targetDigits}`;
  }
  return {
    companyName: identity?.companyName ?? text(BUSINESS_NAME, 'alt'),
    companyAddress: identity?.companyAddress ?? null,
    phoneDisplay, phoneHref,
    logoUrl: identity?.logoUrl ?? publishedLogo ?? bundledLogo,
    structuredLogoUrl: identity?.logoUrl ?? publishedLogo ?? LOGO_URL,
    faviconUrl: identity?.faviconUrl ? `${identity.faviconUrl}?v=${encodeURIComponent(identity.version)}` : null,
    googleBusinessUrl: identity?.googleBusinessUrl ?? text(GOOGLE_BUSINESS_URL, 'ctaTarget'),
  };
}
export type SiteIdentity = ReturnType<typeof resolveSiteIdentity>;
/** Apply only to nodes identifying P1 itself, never another organization or location. */
export function applyBusinessIdentity(value: unknown, identity: SiteIdentity): unknown {
  if (Array.isArray(value)) return value.map(item => applyBusinessIdentity(item, identity));
  if (!value || typeof value !== 'object') return value;
  const source = value as Record<string, unknown>;
  const node = Object.fromEntries(Object.entries(source).map(([key, item]) => [key, applyBusinessIdentity(item, identity)]));
  if (source['@id'] !== `${SITE_URL}/#business`) return node;
  // A reference-only node stays a reference; full company/provider nodes get
  // consistent identity without manufacturing street-level location claims.
  if (source.name !== undefined) node.name = identity.companyName;
  if (source.telephone !== undefined) node.telephone = identity.phoneHref.replace(/^tel:/, '');
  if (source.logo !== undefined) node.logo = typeof source.logo === 'object' ? { ...(source.logo as object), url: new URL(identity.structuredLogoUrl, SITE_URL).href } : new URL(identity.structuredLogoUrl, SITE_URL).href;
  if (source.sameAs !== undefined) node.sameAs = [identity.googleBusinessUrl];
  // Keep existing regional service-area address; freeform companyAddress is
  // visible contact information, not proof of a public storefront.
  return node;
}

/** Only canonical P1 references participate; unrelated numbers remain untouched. */
export function applyKnownPhoneReference(original: string, rendered: string, kind: string, identity: CmsIdentity | null | undefined) {
  if (!coherentPhone(identity)) return rendered;
  if (kind === 'ctaTarget') return /^tel:\+?1?7042218928$/.test(original) ? identity.phoneHref : rendered;
  if (kind !== 'text' && kind !== 'textarea') return rendered;
  const canonical = /(?:\+1[ -]?)?\(704\) 221-8928/g;
  if (!canonical.test(original)) return rendered;
  if (/^(?:\+1[ -]?)?\(704\) 221-8928$/.test(original.trim())) return identity.phoneDisplay;
  return rendered.replace(/(?:\+1[ -]?)?\(704\) 221-8928/g, identity.phoneDisplay);
}
