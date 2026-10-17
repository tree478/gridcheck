import { MAX_HORIZON_DAYS, PATTERN_WEEKS } from "../constants";
import type { HourIntensity } from "../types";
import { toNewYorkIso } from "./eia";

// Pattern forecast: each hour = mean of the same New York weekday + hour
// over the most recent PATTERN_WEEKS measured weeks.

const HOUR_MS = 60 * 60 * 1000;
const FORECAST_HOURS = MAX_HORIZON_DAYS * 24; // 168

// Read from the hourStart text ("2026-11-01T01:00:00-05:00"), so both
// measured and target hours match on New York local time with no zone math.
function localHour(hourStart: string): string {
  return hourStart.slice(11, 13);
}

function patternKey(hourStart: string): string {
  const [y, m, d] = hourStart.slice(0, 10).split("-").map(Number);
  return `${new Date(Date.UTC(y, m - 1, d)).getUTCDay()}|${localHour(hourStart)}`;
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function push(map: Map<string, number[]>, key: string, value: number) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

// Empty input returns empty arrays; the caller treats that as a failure.
export function patternForecast(
  measured: HourIntensity[],
  now: Date,
): { gap: HourIntensity[]; forecast: HourIntensity[] } {
  if (measured.length === 0) return { gap: [], forecast: [] };

  const sorted = [...measured].sort(
    (a, b) => Date.parse(a.hourStart) - Date.parse(b.hourStart),
  );
  // Values per key and per local hour, oldest first.
  const byKey = new Map<string, number[]>();
  const byHour = new Map<string, number[]>();
  for (const h of sorted) {
    push(byKey, patternKey(h.hourStart), h.gco2PerKwh);
    push(byHour, localHour(h.hourStart), h.gco2PerKwh);
  }
  const overall = mean(sorted.map((h) => h.gco2PerKwh));

  // Same weekday + hour, else same hour on any weekday, else everything.
  function at(ms: number): HourIntensity {
    const hourStart = toNewYorkIso(ms);
    const samples = byKey.get(patternKey(hourStart));
    const sameHour = byHour.get(localHour(hourStart));
    const gco2PerKwh = samples
      ? mean(samples.slice(-PATTERN_WEEKS))
      : sameHour
        ? mean(sameHour)
        : overall;
    return { hourStart, gco2PerKwh, tier: "pattern" };
  }

  const currentMs = Math.floor(now.getTime() / HOUR_MS) * HOUR_MS;
  const latestMs = Date.parse(sorted[sorted.length - 1].hourStart);

  const gap: HourIntensity[] = [];
  for (let ms = latestMs + HOUR_MS; ms < currentMs; ms += HOUR_MS) gap.push(at(ms));

  const forecast: HourIntensity[] = [];
  for (let i = 0; i < FORECAST_HOURS; i++) forecast.push(at(currentMs + i * HOUR_MS));

  return { gap, forecast };
}
