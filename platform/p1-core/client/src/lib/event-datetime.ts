const DEFAULT_FALLBACK_TIME_ZONE = "America/New_York";

type DateLike = string | Date | null | undefined;
type EventListDateLine = {
  label?: string;
  text: string;
};

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function resolveTimeZone(timeZone?: string | null): string | undefined {
  const candidate = timeZone?.trim();
  if (!candidate) {
    return undefined;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return undefined;
  }
}

function getLocalDateTimeParts(date: Date) {
  return {
    year: String(date.getFullYear()),
    month: pad(date.getMonth() + 1),
    day: pad(date.getDate()),
    hour: pad(date.getHours()),
    minute: pad(date.getMinutes()),
  };
}

function getTimeZoneDateTimeParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour12: false,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const parts = formatter.formatToParts(date);

  return {
    year: parts.find((part) => part.type === "year")?.value ?? "0000",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    day: parts.find((part) => part.type === "day")?.value ?? "01",
    hour: parts.find((part) => part.type === "hour")?.value ?? "00",
    minute: parts.find((part) => part.type === "minute")?.value ?? "00",
  };
}

function getCalendarDateKey(value: DateLike, timeZone?: string | null): string | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (!isValidDate(date)) return null;

  const resolvedTimeZone = resolveTimeZone(timeZone);
  const parts = resolvedTimeZone
    ? getTimeZoneDateTimeParts(date, resolvedTimeZone)
    : getLocalDateTimeParts(date);

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "1");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "1");
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return Date.UTC(year, month - 1, day, hour, minute, 0, 0) - date.getTime();
}

function parseDateTimeLocal(value: string): [number, number, number, number, number] | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  return [Number(year), Number(month), Number(day), Number(hour), Number(minute)];
}

export function getDefaultEventTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_FALLBACK_TIME_ZONE;
  } catch {
    return DEFAULT_FALLBACK_TIME_ZONE;
  }
}

export function toDateTimeLocalValue(value: DateLike, timeZone?: string | null): string {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (!isValidDate(date)) {
    return "";
  }

  const resolvedTimeZone = resolveTimeZone(timeZone);
  const parts = resolvedTimeZone
    ? getTimeZoneDateTimeParts(date, resolvedTimeZone)
    : getLocalDateTimeParts(date);

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function fromDateTimeLocalValue(
  value: string | null | undefined,
  timeZone?: string | null,
): string | null {
  if (!value) {
    return null;
  }

  const resolvedTimeZone = resolveTimeZone(timeZone);
  if (!resolvedTimeZone) {
    const date = new Date(value);
    return isValidDate(date) ? date.toISOString() : null;
  }

  const parts = parseDateTimeLocal(value);
  if (!parts) {
    return null;
  }

  const [year, month, day, hour, minute] = parts;
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  let offsetMilliseconds = getTimeZoneOffsetMilliseconds(new Date(utcGuess), resolvedTimeZone);
  let timestamp = utcGuess - offsetMilliseconds;

  const adjustedOffset = getTimeZoneOffsetMilliseconds(new Date(timestamp), resolvedTimeZone);
  if (adjustedOffset !== offsetMilliseconds) {
    offsetMilliseconds = adjustedOffset;
    timestamp = utcGuess - offsetMilliseconds;
  }

  return new Date(timestamp).toISOString();
}

export function formatEventDate(
  value: DateLike,
  timeZone?: string | null,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (!isValidDate(date)) {
    return "";
  }

  const resolvedTimeZone = resolveTimeZone(timeZone);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(resolvedTimeZone ? { timeZone: resolvedTimeZone } : {}),
    ...options,
  }).format(date);
}

export function formatEventTime(
  value: DateLike,
  timeZone?: string | null,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (!isValidDate(date)) {
    return "";
  }

  const resolvedTimeZone = resolveTimeZone(timeZone);

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    ...(resolvedTimeZone ? { timeZone: resolvedTimeZone } : {}),
    ...options,
  }).format(date);
}

export function isSameEventDay(start: DateLike, end: DateLike, timeZone?: string | null): boolean {
  const startKey = getCalendarDateKey(start, timeZone);
  const endKey = getCalendarDateKey(end, timeZone);
  return Boolean(startKey && endKey && startKey === endKey);
}

export function formatEventListDateLines(
  start: DateLike,
  end: DateLike,
  timeZone?: string | null,
): EventListDateLine[] {
  if (!start) return [];

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  };

  const startDate = formatEventDate(start, timeZone, dateOptions);
  const startTime = formatEventTime(start, timeZone);

  if (!end) {
    return [{ text: `${startDate} at ${startTime}` }];
  }

  const endTime = formatEventTime(end, timeZone);
  if (isSameEventDay(start, end, timeZone)) {
    return [{ text: `${startDate} · ${startTime} — ${endTime}` }];
  }

  const endDate = formatEventDate(end, timeZone, dateOptions);
  return [
    { label: "Starts", text: `${startDate} at ${startTime}` },
    { label: "Ends", text: `${endDate} at ${endTime}` },
  ];
}
