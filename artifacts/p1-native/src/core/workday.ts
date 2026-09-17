const YYYY_MM_DD = /^(\d{4})-(\d{2})-(\d{2})$/;

export function validateWorkday(value: string): string {
  const match = YYYY_MM_DD.exec(value);
  if (!match) throw new Error("Choose a date in YYYY-MM-DD format.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const instant = new Date(Date.UTC(year, month - 1, day));
  if (
    instant.getUTCFullYear() !== year ||
    instant.getUTCMonth() !== month - 1 ||
    instant.getUTCDate() !== day
  )
    throw new Error("Choose a real calendar date.");
  return value;
}

/** Calendar arithmetic remains stable through New York daylight-saving changes. */
export function adjacentWorkday(value: string, offset: number): string {
  if (!Number.isSafeInteger(offset) || Math.abs(offset) > 31)
    throw new Error("Choose a nearby work date.");
  const day = validateWorkday(value);
  const instant = new Date(`${day}T12:00:00.000Z`);
  instant.setUTCDate(instant.getUTCDate() + offset);
  return instant.toISOString().slice(0, 10);
}
