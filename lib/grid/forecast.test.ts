import { describe, expect, it } from "vitest";
import type { HourIntensity } from "../types";
import raw from "./__fixtures__/eia-28d.raw.json";
import { parseRows, toNewYorkIso } from "./eia";
import { patternForecast } from "./forecast";
import { computeIntensity } from "./intensity";

const HOUR_MS = 60 * 60 * 1000;
const WEEK_HOURS = 7 * 24;

// Measured hours from startMs (inclusive) to endMs (exclusive).
function series(
  startMs: number,
  endMs: number,
  value: (hourStart: string) => number,
): HourIntensity[] {
  const out: HourIntensity[] = [];
  for (let ms = startMs; ms < endMs; ms += HOUR_MS) {
    const hourStart = toNewYorkIso(ms);
    out.push({ hourStart, gco2PerKwh: value(hourStart), tier: "measured" });
  }
  return out;
}

// The `weeks` weeks of measured hours just before nowMs's hour.
function history(nowMs: number, weeks: number, value: (hourStart: string) => number) {
  const currentMs = Math.floor(nowMs / HOUR_MS) * HOUR_MS;
  return series(currentMs - weeks * WEEK_HOURS * HOUR_MS, currentMs, value);
}

const localHour = (hourStart: string) => Number(hourStart.slice(11, 13));

describe("patternForecast", () => {
  const NOW = new Date("2026-10-17T18:32:00Z");

  it("returns 168 pattern hours starting at the current hour", () => {
    const { gap, forecast } = patternForecast(history(NOW.getTime(), 4, () => 300), NOW);
    expect(gap).toEqual([]);
    expect(forecast).toHaveLength(168);
    expect(forecast[0].hourStart).toBe("2026-10-17T14:00:00-04:00");
    for (let i = 0; i < forecast.length; i++) {
      expect(forecast[i].tier).toBe("pattern");
      if (i > 0) {
        expect(Date.parse(forecast[i].hourStart) - Date.parse(forecast[i - 1].hourStart)).toBe(
          HOUR_MS,
        );
      }
    }
  });

  it("turns flat input into flat output", () => {
    const { gap, forecast } = patternForecast(
      history(NOW.getTime() - 10 * HOUR_MS, 4, () => 200),
      NOW,
    );
    for (const h of [...gap, ...forecast]) expect(h.gco2PerKwh).toBe(200);
  });

  it("fills the gap between the latest measured hour and now", () => {
    // The latest measured hour ends 15 h before the current hour.
    const measured = history(NOW.getTime() - 15 * HOUR_MS, 4, () => 200);
    const { gap, forecast } = patternForecast(measured, NOW);
    expect(gap).toHaveLength(15);
    expect(Date.parse(gap[0].hourStart)).toBe(Date.parse(measured.at(-1)!.hourStart) + HOUR_MS);
    for (let i = 1; i < gap.length; i++) {
      expect(Date.parse(gap[i].hourStart) - Date.parse(gap[i - 1].hourStart)).toBe(HOUR_MS);
    }
    expect(Date.parse(gap.at(-1)!.hourStart) + HOUR_MS).toBe(Date.parse(forecast[0].hourStart));
    for (const h of gap) expect(h.tier).toBe("pattern");
  });

  it("does not depend on input order", () => {
    const measured = history(NOW.getTime() - 5 * HOUR_MS, 4, (s) => localHour(s) * 10);
    const reversed = [...measured].reverse();
    expect(patternForecast(reversed, NOW)).toEqual(patternForecast(measured, NOW));
  });

  describe("DST alignment", () => {
    // Measured value = its own New York hour, so every forecast value must
    // equal its own New York hour if alignment is right.
    it.each([
      ["forecast crosses fall-back (Nov 1)", "2026-10-29T12:00:00Z"],
      ["history crosses fall-back (Nov 1)", "2026-11-12T12:00:00Z"],
      ["forecast crosses spring-forward (Mar 8)", "2026-03-05T12:00:00Z"],
      ["history crosses spring-forward (Mar 8)", "2026-03-19T12:00:00Z"],
    ])("%s", (_name, iso) => {
      const now = new Date(iso);
      const { forecast } = patternForecast(history(now.getTime(), 5, localHour), now);
      expect(forecast).toHaveLength(168);
      for (const h of forecast) expect(h.gco2PerKwh).toBe(localHour(h.hourStart));
    });

    it("has two 1 AM hours on Nov 1 2026", () => {
      const now = new Date("2026-10-29T12:00:00Z");
      const { forecast } = patternForecast(history(now.getTime(), 5, localHour), now);
      const oneAm = forecast.filter((h) => h.hourStart.startsWith("2026-11-01T01"));
      expect(oneAm.map((h) => h.hourStart)).toEqual([
        "2026-11-01T01:00:00-04:00",
        "2026-11-01T01:00:00-05:00",
      ]);
      expect(forecast.filter((h) => h.hourStart.startsWith("2026-11-01"))).toHaveLength(25);
    });

    it("has no 2 AM hour on Mar 8 2026", () => {
      const now = new Date("2026-03-05T12:00:00Z");
      const { forecast } = patternForecast(history(now.getTime(), 5, localHour), now);
      const mar8 = forecast.filter((h) => h.hourStart.startsWith("2026-03-08"));
      expect(mar8).toHaveLength(23);
      expect(mar8.some((h) => h.hourStart.startsWith("2026-03-08T02"))).toBe(false);
    });
  });

  describe("same weekday + hour samples", () => {
    const currentMs = Date.parse("2026-10-17T18:00:00Z");
    const target = toNewYorkIso(currentMs); // Saturday 14:00 EDT
    const weeksBefore = (n: number) => toNewYorkIso(currentMs - n * WEEK_HOURS * HOUR_MS);

    it("uses the mean of the 3 that exist when a week is missing", () => {
      const values: Record<string, number> = {
        [weeksBefore(1)]: 10,
        [weeksBefore(3)]: 20,
        [weeksBefore(4)]: 60,
      };
      const measured = history(currentMs, 4, (s) => values[s] ?? 100).filter(
        (h) => h.hourStart !== weeksBefore(2),
      );
      const { forecast } = patternForecast(measured, new Date(currentMs));
      expect(forecast[0].hourStart).toBe(target);
      expect(forecast[0].gco2PerKwh).toBe(30);
    });

    it("uses only the most recent PATTERN_WEEKS samples", () => {
      const values: Record<string, number> = {
        [weeksBefore(1)]: 10,
        [weeksBefore(2)]: 20,
        [weeksBefore(3)]: 30,
        [weeksBefore(4)]: 40,
        [weeksBefore(5)]: 1000,
      };
      const measured = history(currentMs, 5, (s) => values[s] ?? 100);
      const { forecast } = patternForecast(measured, new Date(currentMs));
      expect(forecast[0].gco2PerKwh).toBe(25);
    });
  });

  describe("fallbacks", () => {
    const measured: HourIntensity[] = [
      { hourStart: "2026-10-12T14:00:00-04:00", gco2PerKwh: 100, tier: "measured" }, // Mon 14
      { hourStart: "2026-10-13T14:00:00-04:00", gco2PerKwh: 300, tier: "measured" }, // Tue 14
      { hourStart: "2026-10-13T15:00:00-04:00", gco2PerKwh: 500, tier: "measured" }, // Tue 15
    ];
    const now = new Date("2026-10-13T20:00:00Z"); // Tue 16:00 EDT
    const valueAt = (forecast: HourIntensity[], hourStart: string) =>
      forecast.find((h) => h.hourStart === hourStart)?.gco2PerKwh;

    it("uses the key's samples when they exist", () => {
      const { forecast } = patternForecast(measured, now);
      expect(valueAt(forecast, "2026-10-19T14:00:00-04:00")).toBe(100);
      expect(valueAt(forecast, "2026-10-20T15:00:00-04:00")).toBe(500);
    });

    it("falls back to the same hour on any weekday", () => {
      const { forecast } = patternForecast(measured, now);
      expect(valueAt(forecast, "2026-10-14T14:00:00-04:00")).toBe(200);
    });

    it("falls back to the overall mean", () => {
      const { forecast } = patternForecast(measured, now);
      expect(forecast[0].hourStart).toBe("2026-10-13T16:00:00-04:00");
      expect(forecast[0].gco2PerKwh).toBe(300);
      for (const h of forecast) expect(Number.isFinite(h.gco2PerKwh)).toBe(true);
    });

    it("returns empty arrays for empty input without throwing", () => {
      expect(patternForecast([], now)).toEqual({ gap: [], forecast: [] });
    });
  });

  it("handles the real 28-day fixture", () => {
    const measured = computeIntensity(parseRows(raw));
    const { gap, forecast } = patternForecast(measured, new Date("2026-10-17T18:00:00Z"));
    expect(forecast).toHaveLength(168);
    expect(forecast[0].hourStart).toBe("2026-10-17T14:00:00-04:00");
    // Latest measured hour starts at 03:00 UTC; the gap is 04:00–17:00 UTC.
    expect(gap).toHaveLength(14);
    expect(gap[0].hourStart).toBe("2026-10-17T00:00:00-04:00");
    for (const h of [...gap, ...forecast]) {
      expect(Number.isNaN(h.gco2PerKwh)).toBe(false);
      expect(h.gco2PerKwh).toBeGreaterThanOrEqual(11);
      expect(h.gco2PerKwh).toBeLessThanOrEqual(820);
    }
  });
});
