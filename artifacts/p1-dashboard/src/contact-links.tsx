import type { ReactNode } from "react";
import { formatPhoneNumber } from "./phone";

function phoneHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `tel:+${digits}`;
  return `tel:${phone.trim().replace(/[^\d+*#;,]/g, "")}`;
}

export function PhoneLink({ phone }: { phone: string | null | undefined }) {
  if (!phone?.trim()) return null;
  return <a className="contact-link" href={phoneHref(phone)}>{formatPhoneNumber(phone)}</a>;
}

export function EmailLink({ email }: { email: string | null | undefined }) {
  if (!email?.trim()) return null;
  const value = email.trim();
  return <a className="contact-link" href={`mailto:${value}`}>{value}</a>;
}

export function ContactDetails({
  prefix,
  email,
  phone,
}: {
  prefix?: ReactNode;
  email?: string | null;
  phone?: string | null;
}) {
  const items = [
    prefix,
    email?.trim() ? <EmailLink key="email" email={email} /> : null,
    phone?.trim() ? <PhoneLink key="phone" phone={phone} /> : null,
  ].filter(Boolean) as ReactNode[];

  return <>{items.map((item, index) => <span key={index}>{index > 0 && " · "}{item}</span>)}</>;
}
