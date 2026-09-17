/**
 * Formats a North American phone number for presentation without changing the
 * stored value. Other number formats are returned unchanged.
 */
export function formatPhoneNumber(value: string | null | undefined): string {
  if (!value) return "";

  const input = value.trim();
  const digits = input.replace(/\D/g, "");
  const domestic = digits.length === 10 ? digits : digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : null;

  if (!domestic) return input;
  return `(${domestic.slice(0, 3)}) ${domestic.slice(3, 6)}-${domestic.slice(6)}`;
}
