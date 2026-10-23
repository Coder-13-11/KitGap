// Needed-by dates are calendar dates ("2026-11-20") in the receiving
// organization's timezone. They are never converted through UTC, which could
// move them a day. "Today" is always computed in the organization's timezone.

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDateString(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

// The calendar date it currently is in `timezone`, as "YYYY-MM-DD".
export function todayIn(timezone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// Whole days from `from` to `to` (both "YYYY-MM-DD").
export function daysBetween(from: string, to: string): number {
  const a = Date.UTC(...splitDate(from));
  const b = Date.UTC(...splitDate(to));
  return Math.round((b - a) / 86_400_000);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = splitDate(date);
  const result = new Date(Date.UTC(y, m, d + days));
  return result.toISOString().slice(0, 10);
}

// A needed-by date has passed once the organization's local date is after it.
// New drives can be started through the end of the needed-by day.
export function isPastDate(neededBy: string, timezone: string, now: Date = new Date()): boolean {
  return todayIn(timezone, now) > neededBy;
}

export function formatCalendarDate(value: string, style: "long" | "short" = "long"): string {
  const [y, m, d] = splitDate(value);
  // Formatting in UTC keeps the calendar date exactly as stored.
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: style === "long" ? "short" : undefined,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m, d)));
}

export interface DeadlineInfo {
  daysLeft: number;
  passed: boolean;
  // Plain-language explanation, e.g. "Due in 3 days" or "Needed-by date passed 2 days ago".
  description: string;
  soon: boolean;
}

export function describeDeadline(neededBy: string, timezone: string, now: Date = new Date()): DeadlineInfo {
  const today = todayIn(timezone, now);
  const daysLeft = daysBetween(today, neededBy);
  if (daysLeft < 0) {
    const ago = -daysLeft;
    return {
      daysLeft,
      passed: true,
      soon: false,
      description: `Needed-by date passed ${ago} ${ago === 1 ? "day" : "days"} ago`,
    };
  }
  if (daysLeft === 0) return { daysLeft, passed: false, soon: true, description: "Due today" };
  if (daysLeft === 1) return { daysLeft, passed: false, soon: true, description: "Due tomorrow" };
  return {
    daysLeft,
    passed: false,
    soon: daysLeft <= 7,
    description: `Due in ${daysLeft} days`,
  };
}

export function formatTimestamp(value: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(value);
}

function splitDate(value: string): [number, number, number] {
  const match = DATE_PATTERN.exec(value);
  if (!match) throw new RangeError(`Invalid calendar date: ${value}`);
  return [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
}

export const US_TIMEZONES: { value: string; label: string }[] = [
  { value: "America/New_York", label: "Eastern (New York, Orlando)" },
  { value: "America/Chicago", label: "Central (Chicago, Pensacola)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Phoenix", label: "Arizona (Phoenix)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
  { value: "America/Puerto_Rico", label: "Atlantic (San Juan)" },
];
