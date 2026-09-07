import { z } from "zod";

export function formatPhoneNumber(raw: string): string {
  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");

  if (!digits) return "+";

  if (digits.startsWith("1")) {
    const sub = digits.slice(1, 11);
    const area = sub.slice(0, 3);
    const pfx = sub.slice(3, 6);
    const line = sub.slice(6, 10);

    if (sub.length === 0) return "+1";
    if (sub.length < 4) return `+1 (${area}`;
    if (sub.length < 7) return `+1 (${area}) ${pfx}`;
    return `+1 (${area}) ${pfx}-${line}`;
  }

  const cleaned = raw.replace(/[^\d\s\-()]/g, "").trim();
  return cleaned ? "+" + cleaned : "+";
}

export function isValidPhone(value: string | undefined | null): boolean {
  if (!value || value === "+" || value === "") return true;
  const digits = value.replace(/\D/g, "");
  return value.startsWith("+") && digits.length >= 7 && digits.length <= 15;
}

export const phoneSchema = z.string().optional().refine(isValidPhone, {
  message: "Enter a valid phone number with country code, e.g. +1 (555) 123-4567",
});

export const requiredPhoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .refine(isValidPhone, {
    message: "Enter a valid phone number with country code, e.g. +1 (555) 123-4567",
  });
