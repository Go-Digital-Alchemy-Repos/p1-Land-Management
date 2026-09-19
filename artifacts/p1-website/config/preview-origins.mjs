// The consolidated editor's exact origin. Never accept a parent chosen by a query parameter.
export const BUSINESS_CENTER_ORIGIN = 'https://dashboard.p1landmanagement.com';
export function acceptsPreviewParent(origin, publicOrigin) {
  return origin === publicOrigin || origin === BUSINESS_CENTER_ORIGIN;
}
