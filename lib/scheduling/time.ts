import { TIMEZONE } from "../constants";

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

const ZONED_INSTANT =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;

const wallClock = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export class InvalidInstantError extends Error {
  readonly input: string;

  constructor(input: string) {
    super(`Invalid timestamp: ${input}`);
    this.name = "InvalidInstantError";
    this.input = input;
  }
}

export function parseInstant(iso: string): number {
  const match = ZONED_INSTANT.exec(iso);
  if (!match) {
    throw new InvalidInstantError(iso);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? "0");
  const wall = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    wall.getUTCFullYear() !== year ||
    wall.getUTCMonth() !== month - 1 ||
    wall.getUTCDate() !== day ||
    wall.getUTCHours() !== hour ||
    wall.getUTCMinutes() !== minute ||
    wall.getUTCSeconds() !== second
  ) {
    throw new InvalidInstantError(iso);
  }

  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    throw new InvalidInstantError(iso);
  }
  return ms;
}

export function formatInstant(ms: number): string {
  if (!Number.isFinite(ms)) {
    throw new InvalidInstantError(String(ms));
  }

  const parts: Record<string, string> = {};
  for (const part of wallClock.formatToParts(new Date(ms))) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }

  const year = parts.year;
  const month = parts.month;
  const day = parts.day;
  const hour = parts.hour;
  const minute = parts.minute;
  const second = parts.second;
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined ||
    second === undefined
  ) {
    throw new InvalidInstantError(String(ms));
  }

  const millis = ((ms % 1000) + 1000) % 1000;
  const wallAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  const offsetMinutes = Math.round((wallAsUtc - (ms - millis)) / MS_PER_MINUTE);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const offset = `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
  const fraction = millis === 0 ? "" : `.${pad(millis, 3)}`;

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${fraction}${offset}`;
}

export function addMinutes(iso: string, minutes: number): string {
  if (!Number.isFinite(minutes)) {
    throw new InvalidInstantError(iso);
  }
  return formatInstant(parseInstant(iso) + minutes * MS_PER_MINUTE);
}

export function nextSlotStart(now: string, slotMinutes: number): string {
  const slotMs = slotLengthMs(slotMinutes);
  const ms = parseInstant(now);
  const remainder = ((ms % slotMs) + slotMs) % slotMs;
  const next = remainder === 0 ? ms + slotMs : ms + (slotMs - remainder);
  return formatInstant(next);
}

/**
 * Half-open slot bounds from the first boundary strictly after `now`
 * through the earlier of `deadline` and `now` plus `maxHorizonDays` elapsed
 * 24-hour periods. A slot is included only when its end is still inside
 * that window.
 */
export function slotBounds(input: {
  now: string;
  deadline: string;
  slotMinutes: number;
  maxHorizonDays: number;
}): { start: string; end: string }[] {
  const slotMs = slotLengthMs(input.slotMinutes);
  if (!Number.isFinite(input.maxHorizonDays) || input.maxHorizonDays < 0) {
    throw new RangeError(
      `maxHorizonDays must be a non-negative finite number, received ${input.maxHorizonDays}`,
    );
  }

  const nowMs = parseInstant(input.now);
  const deadlineMs = parseInstant(input.deadline);
  if (deadlineMs <= nowMs) return [];

  const windowEnd = Math.min(deadlineMs, nowMs + input.maxHorizonDays * MS_PER_DAY);
  const bounds: { start: string; end: string }[] = [];
  let start = parseInstant(nextSlotStart(input.now, input.slotMinutes));

  while (start + slotMs <= windowEnd) {
    const end = start + slotMs;
    bounds.push({ start: formatInstant(start), end: formatInstant(end) });
    start = end;
  }

  return bounds;
}

function slotLengthMs(slotMinutes: number): number {
  if (!Number.isInteger(slotMinutes) || slotMinutes <= 0) {
    throw new RangeError(
      `slotMinutes must be a positive integer, received ${slotMinutes}`,
    );
  }
  return slotMinutes * MS_PER_MINUTE;
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, "0");
}
