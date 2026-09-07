export type CommercialPayload = {
  inquiryType: 'commercial_site_assessment'; name: string; company: string; email: string; phone: string;
  address: string; services: string[]; projectStage: string; serviceTiming: string;
  title: string; propertyName: string; propertyType: string; acreage: string; message: string;
  website: string; attribution: Record<string, string>;
};
export function commercialPayload(data: FormData, attribution: Record<string, string>): CommercialPayload {
  const value = (key: string) => String(data.get(key) || '').trim();
  return {
    inquiryType: 'commercial_site_assessment', name: value('name'), company: value('company'),
    email: value('email'), phone: value('phone'), address: value('address'),
    services: data.getAll('services').map(String), projectStage: value('projectStage'), serviceTiming: value('serviceTiming'),
    title: value('title'), propertyName: value('propertyName'), propertyType: value('propertyType'),
    acreage: value('acreage'), message: value('message'), website: value('website'), attribution,
  };
}
export function commercialErrors(payload: CommercialPayload): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of ['name', 'company', 'address', 'projectStage', 'serviceTiming'] as const)
    if (!payload[key]) errors[key] = 'Please complete this field.';
  if (!payload.email && !payload.phone) errors.email = 'Enter an email address or phone number so we can follow up.';
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) errors.email = 'Enter a usable email address.';
  if (payload.phone && (!/^\+?[0-9() .-]+$/.test(payload.phone) || !/^\d{7,15}$/.test(payload.phone.replace(/\D/g, '')))) errors.phone = 'Enter a phone number with 7–15 digits.';
  if (!payload.services.length) errors.services = 'Select at least one need, or choose General site assessment.';
  return errors;
}
const errorFieldNames: Record<string, string> = {
  name: 'Your name', company: 'Company / organization',
  address: 'Property location — address or city / region',
  projectStage: 'Property / project stage', serviceTiming: 'Type of need',
  email: 'Email', phone: 'Phone', services: 'What does your site need?',
};
export function commercialErrorSummary(field: string, message: string): string {
  return `${errorFieldNames[field] || field}: ${message}`;
}
/** A changed project is a new request; retries of the unchanged request reuse its key. */
export function inquiryAttempt(previous: { payload: string; key: string } | null, payload: CommercialPayload, newKey: () => string) {
  const serialized = JSON.stringify(payload);
  return previous?.payload === serialized ? previous : { payload: serialized, key: newKey() };
}
export async function sendCommercialInquiry(attempt: { payload: string; key: string }, transport: typeof fetch = fetch): Promise<string> {
  const response = await transport('/api/forms/p1-commercial-assessment/submit', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': attempt.key },
    body: attempt.payload, signal: AbortSignal.timeout(20_000),
  });
  const receipt = await response.json().catch(() => null);
  if (![200, 201].includes(response.status) || typeof receipt?.submissionId !== 'string' || !receipt.submissionId.trim())
    throw new Error(response.status === 429 ? 'Too many attempts. Please wait a few minutes before retrying, or call P1.' : 'We could not confirm receipt. Your details are still here. Please retry or call P1.');
  return receipt.submissionId;
}
