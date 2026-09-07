export const agreementMoney = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export function agreementCents(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim()))
    throw Error("Enter a positive USD amount with at most two decimal places.");
  const [whole, fraction = ""] = value.trim().split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 10_000_000_000)
    throw Error("Amount is outside the supported range.");
  return cents;
}
export function agreementMonths(start: string, end: string) {
  const rows: { startsOn: string; endsOn: string }[] = [];
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
    end < start
  )
    return rows;
  let current = start;
  while (current <= end) {
    const d = new Date(current + "T00:00:00Z");
    if (!Number.isFinite(d.valueOf())) return [];
    const last = new Date(d);
    last.setUTCMonth(last.getUTCMonth() + 1, 0);
    const through = last.toISOString().slice(0, 10);
    const endsOn = through < end ? through : end;
    rows.push({ startsOn: current, endsOn });
    if (endsOn === end) break;
    if (rows.length >= 120)
      throw Error("Use a term of at most 120 calendar months.");
    last.setUTCDate(last.getUTCDate() + 1);
    current = last.toISOString().slice(0, 10);
  }
  return rows;
}
