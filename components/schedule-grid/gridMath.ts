// Pure, framework-free helpers for the 7-day schedule grid.
// Relative imports (not "@/") so Vitest can resolve them without an alias.
import { TIMEZONE } from "../../lib/constants";
import type { HourIntensity } from "../../lib/types";

export const HOUR_MS = 60 * 60 * 1000;

export type HourSource = "measured" | "forecast";

/**
 * The single place that reads an hour's measured/forecast status.
 * Both non-measured tiers ("forecast" and "pattern") are shown as forecast;
 * PRD F11 asks for a lighter shade on the "forecast" tier if it is ever added.
 */
export function hourSource(h: HourIntensity): HourSource {
  return h.tier === "measured" ? "measured" : "forecast";
}

export function sourceLabel(source: HourSource): string {
  return source === "forecast" ? "Forecast (weekly pattern)" : "Measured";
}

export type GridHour = {
  hour: HourIntensity;
  ms: number;
  /** Elapsed hours since this day's local midnight. Linear through DST. */
  position: number;
  source: HourSource;
};

export type GridDay = {
  /** Local calendar date, YYYY-MM-DD, in the grid's time zone. */
  dateKey: string;
  weekday: string; // "Sun"
  dayOfMonth: string; // "18"
  label: string; // "Sun, Oct 18"
  dayStartMs: number; // local midnight
  dayEndMs: number; // next local midnight
  hours: GridHour[];
};

export type GridPosition = { dayIndex: number; hourPosition: number };

// ---------- Validation ----------

export function sanitizeHours(input: unknown): {
  valid: HourIntensity[];
  dropped: number;
} {
  if (!Array.isArray(input)) return { valid: [], dropped: 0 };
  const valid: HourIntensity[] = [];
  let dropped = 0;
  for (const item of input) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as HourIntensity).hourStart === "string" &&
      Number.isFinite(Date.parse((item as HourIntensity).hourStart)) &&
      typeof (item as HourIntensity).gco2PerKwh === "number" &&
      Number.isFinite((item as HourIntensity).gco2PerKwh)
    ) {
      valid.push(item as HourIntensity);
    } else {
      dropped += 1;
    }
  }
  return { valid, dropped };
}

// ---------- Time zone math (Intl only, never the machine's local zone) ----------

type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const partsFormatters = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatters.set(timeZone, f);
  }
  return f;
}

function localParts(ms: number, timeZone: string): LocalParts {
  const parts = partsFormatter(timeZone).formatToParts(new Date(ms));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

/** Zone offset (local − UTC) in ms at the given instant. */
function zoneOffsetMs(ms: number, timeZone: string): number {
  const whole = Math.floor(ms / 1000) * 1000;
  const p = localParts(whole, timeZone);
  return (
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - whole
  );
}

/** The instant of local midnight for a calendar date in the given zone. */
export function localMidnightMs(
  year: number,
  month: number,
  day: number,
  timeZone: string = TIMEZONE,
): number {
  const guess = Date.UTC(year, month - 1, day);
  const first = guess - zoneOffsetMs(guess, timeZone);
  // Re-correct in case the offset at the result differs (transition near midnight).
  return guess - zoneOffsetMs(first, timeZone);
}

const pad2 = (n: number) => String(n).padStart(2, "0");

const labelFormatters = new Map<string, Intl.DateTimeFormat>();
function labelFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = labelFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    labelFormatters.set(timeZone, f);
  }
  return f;
}

// ---------- Grouping ----------

export function groupByLocalDay(
  hours: HourIntensity[],
  timeZone: string = TIMEZONE,
): GridDay[] {
  const sorted = hours
    .map((hour) => ({ hour, ms: Date.parse(hour.hourStart) }))
    .filter((h) => Number.isFinite(h.ms))
    .sort((a, b) => a.ms - b.ms);

  const days = new Map<string, GridDay>();
  for (const { hour, ms } of sorted) {
    const p = localParts(ms, timeZone);
    const dateKey = `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
    let day = days.get(dateKey);
    if (!day) {
      const parts = labelFormatter(timeZone).formatToParts(new Date(ms));
      const weekday = parts.find((x) => x.type === "weekday")?.value ?? "";
      const dayOfMonth =
        parts.find((x) => x.type === "day")?.value ?? String(p.day);
      day = {
        dateKey,
        weekday,
        dayOfMonth,
        label: normalizeSpaces(labelFormatter(timeZone).format(new Date(ms))),
        dayStartMs: localMidnightMs(p.year, p.month, p.day, timeZone),
        dayEndMs: localMidnightMs(p.year, p.month, p.day + 1, timeZone),
        hours: [],
      };
      days.set(dateKey, day);
    }
    day.hours.push({
      hour,
      ms,
      position: (ms - day.dayStartMs) / HOUR_MS,
      source: hourSource(hour),
    });
  }
  return [...days.values()];
}

/** Number of hour rows needed to show every day (24 normally; 25 in a DST-end week). */
export function rowCount(days: GridDay[]): number {
  let max = 0;
  for (const d of days)
    for (const h of d.hours) max = Math.max(max, Math.floor(h.position) + 1);
  return max;
}

// ---------- ISO → grid position (used by T-B4 for overlays) ----------

/**
 * Maps an instant to the day column it falls in and its elapsed-hour position
 * within that day (fractional allowed). A range that crosses midnight maps its
 * start to day n and its end to day n+1, so callers split it at the column edge.
 * An instant exactly at the end of the last day returns that day at its length.
 */
export function isoToGridPosition(
  iso: string,
  days: GridDay[],
): GridPosition | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms) || days.length === 0) return null;
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const isLast = i === days.length - 1;
    if (
      ms >= d.dayStartMs &&
      (ms < d.dayEndMs || (isLast && ms === d.dayEndMs))
    ) {
      return { dayIndex: i, hourPosition: (ms - d.dayStartMs) / HOUR_MS };
    }
  }
  return null;
}

// ---------- Color scale (PRD §12.6: min/max of the forecast) ----------

export type ColorScale = {
  min: number;
  max: number;
  t: (value: number) => number;
};

export function makeColorScale(values: number[]): ColorScale {
  const finite = values.filter((v) => Number.isFinite(v));
  const min = finite.length ? Math.min(...finite) : 0;
  const max = finite.length ? Math.max(...finite) : 0;
  const span = max - min;
  return {
    min,
    max,
    t: (value) => {
      if (span <= 0) return 0.5;
      return Math.min(1, Math.max(0, (value - min) / span));
    },
  };
}

/** Matches CSS `--scale-clean` / `--scale-mid` / `--scale-dirty` (fill only; not text on white). */
export const SCALE_CLEAN = "#115E59";
export const SCALE_MID = "#B7BDAF";
export const SCALE_DIRTY = "#F2994A";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r} ${g} ${bl})`;
}

/** t = 0 → clean, 0.5 → moderate, 1 → dirty. Smooth RGB blend across the 24h strip. */
export function colorForT(t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  if (clamped <= 0.5) return mixHex(SCALE_CLEAN, SCALE_MID, clamped * 2);
  return mixHex(SCALE_MID, SCALE_DIRTY, (clamped - 0.5) * 2);
}

// ---------- Formatting ----------

/** Some ICU builds emit U+202F before "PM"; normalize so SSR and browser output match. */
function normalizeSpaces(s: string): string {
  return s.replace(/[\u202f\u00a0]/g, " ");
}

const fullFormatters = new Map<string, Intl.DateTimeFormat>();
/** Same options as GridNowCard: "Tue, Oct 20, 3 PM EDT". */
export function formatHour(iso: string, timeZone: string = TIMEZONE): string {
  let f = fullFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      timeZoneName: "short",
    });
    fullFormatters.set(timeZone, f);
  }
  return normalizeSpaces(f.format(new Date(iso)));
}

const shortFormatters = new Map<string, Intl.DateTimeFormat>();
/** Hour only: "3 PM". */
export function formatHourOfDay(
  ms: number,
  timeZone: string = TIMEZONE,
): string {
  let f = shortFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric" });
    shortFormatters.set(timeZone, f);
  }
  return normalizeSpaces(f.format(new Date(ms)));
}
