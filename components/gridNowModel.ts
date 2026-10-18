// Relative imports so Vitest resolves without an alias.
import { TIMEZONE } from "../lib/constants";
import type { HourIntensity } from "../lib/types";

export type CleanestWindow = {
  start: HourIntensity;
  end: HourIntensity;
  avg: number;
  /** Inclusive start index into the hours array. */
  startIndex: number;
  /** Number of hours in the window. */
  length: number;
};

const DEFAULT_WINDOW_HOURS = 3;

/**
 * Lowest average stretch among the hours shown on the home chart.
 * Uses the same series as the bars so the label matches the graph.
 */
export function cleanestWindow(
  hours: HourIntensity[],
  windowHours: number = DEFAULT_WINDOW_HOURS,
): CleanestWindow | null {
  const win = Math.min(windowHours, hours.length);
  if (win < 2) return null;

  let bestStart = -1;
  let bestAvg = Infinity;
  for (let i = 0; i <= hours.length - win; i++) {
    let sum = 0;
    for (let j = 0; j < win; j++) sum += hours[i + j].gco2PerKwh;
    const avg = sum / win;
    if (avg < bestAvg) {
      bestAvg = avg;
      bestStart = i;
    }
  }
  if (bestStart < 0) return null;
  return {
    start: hours[bestStart],
    end: hours[bestStart + win - 1],
    avg: bestAvg,
    startIndex: bestStart,
    length: win,
  };
}

export function localHour(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  return Number(parts.find((p) => p.type === "hour")?.value ?? "0");
}

function normalizeSpaces(s: string): string {
  return s.replace(/[\u202f\u00a0]/g, " ");
}

function sameLocalDay(aIso: string, bIso: string): boolean {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date(aIso)) === fmt.format(new Date(bIso));
}

/** Human label for the cleanest window, e.g. "today 2–5 AM" or "Mon 11 PM–2 AM". */
export function formatWindowLabel(
  startIso: string,
  endIso: string,
  nowIso?: string,
): string {
  const hourFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "numeric",
  });
  const start = new Date(startIso);
  const endExclusive = new Date(Date.parse(endIso) + 60 * 60 * 1000);
  const a = normalizeSpaces(hourFmt.format(start));
  const b = normalizeSpaces(hourFmt.format(endExclusive));

  const ref = nowIso ?? startIso;
  if (sameLocalDay(startIso, ref)) {
    const h = localHour(startIso);
    const when =
      h < 5 ? "tonight" : h < 12 ? "this morning" : h < 17 ? "this afternoon" : "this evening";
    return `${when} ${a}–${b}`;
  }

  const weekday = normalizeSpaces(
    start.toLocaleDateString("en-US", {
      timeZone: TIMEZONE,
      weekday: "short",
    }),
  );
  return `${weekday} ${a}–${b}`;
}
