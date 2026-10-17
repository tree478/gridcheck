import { describe, expect, it } from "vitest";
import { MOCK_NOW, mockGrid } from "../../lib/mocks/grid";
import type { HourIntensity } from "../../lib/types";
import {
  HOUR_MS,
  colorForT,
  formatHour,
  groupByLocalDay,
  hourSource,
  isoToGridPosition,
  localMidnightMs,
  makeColorScale,
  rowCount,
  sanitizeHours,
} from "./gridMath";

const TZ = "America/New_York";

/** `count` consecutive hours starting at a UTC instant; hourStart in Z form. */
function hoursFrom(startUtcMs: number, count: number): HourIntensity[] {
  return Array.from({ length: count }, (_, i) => ({
    hourStart: new Date(startUtcMs + i * HOUR_MS).toISOString(),
    gco2PerKwh: 200 + i,
    isForecast: true,
  }));
}

describe("groupByLocalDay", () => {
  it("groups the 168 mock hours into 8 local dates with partial first and last days", () => {
    const days = groupByLocalDay(mockGrid.forecast, TZ);
    expect(days.map((d) => d.dateKey)).toEqual([
      "2026-10-18",
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ]);
    expect(days.map((d) => d.hours.length)).toEqual([15, 24, 24, 24, 24, 24, 24, 9]);
    expect(days[0].weekday).toBe("Sun");
    expect(days[0].dayOfMonth).toBe("18");
    expect(days[0].hours[0].position).toBe(9); // MOCK_NOW is 9 AM
    expect(days[1].hours.map((h) => h.position)).toEqual(Array.from({ length: 24 }, (_, i) => i));
    expect(rowCount(days)).toBe(24);
  });

  it("keeps a 25-hour DST-end day (Nov 1, 2026) as one day with positions 0–24", () => {
    // Local midnight Nov 1 is 04:00Z (EDT); the day ends at 05:00Z Nov 2 (EST).
    const start = Date.UTC(2026, 10, 1, 4);
    const days = groupByLocalDay(hoursFrom(start, 25), TZ);
    expect(days).toHaveLength(1);
    expect(days[0].dateKey).toBe("2026-11-01");
    expect(days[0].hours).toHaveLength(25);
    expect(days[0].hours.map((h) => h.position)).toEqual(Array.from({ length: 25 }, (_, i) => i));
    expect(days[0].dayEndMs - days[0].dayStartMs).toBe(25 * HOUR_MS);
    expect(rowCount(days)).toBe(25);
    // Next hour belongs to Nov 2.
    const more = groupByLocalDay(hoursFrom(start, 26), TZ);
    expect(more.map((d) => d.dateKey)).toEqual(["2026-11-01", "2026-11-02"]);
  });

  it("keeps a 23-hour DST-start day (Mar 8, 2026) as one day with positions 0–22", () => {
    // Local midnight Mar 8 is 05:00Z (EST); the day ends at 04:00Z Mar 9 (EDT).
    const start = Date.UTC(2026, 2, 8, 5);
    const days = groupByLocalDay(hoursFrom(start, 23), TZ);
    expect(days).toHaveLength(1);
    expect(days[0].dateKey).toBe("2026-03-08");
    expect(days[0].hours).toHaveLength(23);
    expect(days[0].hours.at(-1)?.position).toBe(22);
    expect(days[0].dayEndMs - days[0].dayStartMs).toBe(23 * HOUR_MS);
    expect(groupByLocalDay(hoursFrom(start, 24), TZ).map((d) => d.dateKey)).toEqual([
      "2026-03-08",
      "2026-03-09",
    ]);
  });

  it("uses the zone passed in, not the machine's local zone", () => {
    const hour: HourIntensity = { hourStart: "2026-10-18T20:00:00-04:00", gco2PerKwh: 1, isForecast: true };
    expect(groupByLocalDay([hour], TZ)[0].dateKey).toBe("2026-10-18");
    expect(groupByLocalDay([hour], "Asia/Tokyo")[0].dateKey).toBe("2026-10-19");
    expect(groupByLocalDay([hour], "UTC")[0].dateKey).toBe("2026-10-19");
  });

  it("sorts unsorted input and skips unparseable timestamps", () => {
    const [a, b] = hoursFrom(Date.UTC(2026, 9, 19, 4), 2);
    const days = groupByLocalDay([b, a, { hourStart: "garbage", gco2PerKwh: 1, isForecast: true }], TZ);
    expect(days[0].hours.map((h) => h.hour.hourStart)).toEqual([a.hourStart, b.hourStart]);
  });
});

describe("localMidnightMs", () => {
  it("finds local midnight on both sides of the DST change", () => {
    expect(localMidnightMs(2026, 10, 31, TZ)).toBe(Date.UTC(2026, 9, 31, 4)); // EDT
    expect(localMidnightMs(2026, 11, 2, TZ)).toBe(Date.UTC(2026, 10, 2, 5)); // EST
  });
});

describe("isoToGridPosition", () => {
  const days = groupByLocalDay(mockGrid.forecast, TZ);

  it("maps an hour in the middle of the week", () => {
    expect(isoToGridPosition("2026-10-20T15:00:00-04:00", days)).toEqual({ dayIndex: 2, hourPosition: 15 });
  });

  it("maps 'now' to the first day at 9 AM", () => {
    expect(isoToGridPosition(MOCK_NOW, days)).toEqual({ dayIndex: 0, hourPosition: 9 });
  });

  it("splits a range that crosses midnight across two day columns", () => {
    expect(isoToGridPosition("2026-10-20T23:00:00-04:00", days)).toEqual({ dayIndex: 2, hourPosition: 23 });
    expect(isoToGridPosition("2026-10-21T01:00:00-04:00", days)).toEqual({ dayIndex: 3, hourPosition: 1 });
    expect(isoToGridPosition("2026-10-21T00:00:00-04:00", days)).toEqual({ dayIndex: 3, hourPosition: 0 });
  });

  it("returns fractional positions", () => {
    expect(isoToGridPosition("2026-10-20T15:30:00-04:00", days)).toEqual({ dayIndex: 2, hourPosition: 15.5 });
  });

  it("returns the last day's length for an instant exactly at its end", () => {
    expect(isoToGridPosition("2026-10-26T00:00:00-04:00", days)).toEqual({ dayIndex: 7, hourPosition: 24 });
  });

  it("returns null outside the grid or for bad input", () => {
    expect(isoToGridPosition("2026-10-17T12:00:00-04:00", days)).toBeNull();
    expect(isoToGridPosition("2026-10-26T01:00:00-04:00", days)).toBeNull();
    expect(isoToGridPosition("nope", days)).toBeNull();
    expect(isoToGridPosition(MOCK_NOW, [])).toBeNull();
  });
});

describe("makeColorScale", () => {
  it("maps min to the green end and max to the red end", () => {
    const scale = makeColorScale([300, 210, 348]);
    expect(scale.min).toBe(210);
    expect(scale.max).toBe(348);
    expect(scale.t(210)).toBe(0);
    expect(scale.t(348)).toBe(1);
    expect(scale.t(279)).toBeCloseTo(0.5);
    expect(colorForT(scale.t(210))).toBe("hsl(120 65% 55%)");
    expect(colorForT(scale.t(348))).toBe("hsl(0 65% 55%)");
    expect(colorForT(0.5)).toBe("hsl(60 65% 55%)");
  });

  it("clamps values outside the range", () => {
    const scale = makeColorScale([200, 300]);
    expect(scale.t(100)).toBe(0);
    expect(scale.t(400)).toBe(1);
  });

  it("does not divide by zero when all values are equal", () => {
    const scale = makeColorScale([250, 250, 250]);
    expect(scale.t(250)).toBe(0.5);
    expect(Number.isNaN(scale.t(250))).toBe(false);
    expect(colorForT(scale.t(250))).toBe("hsl(60 65% 55%)");
  });

  it("handles an empty list", () => {
    const scale = makeColorScale([]);
    expect(scale.min).toBe(0);
    expect(scale.max).toBe(0);
    expect(scale.t(5)).toBe(0.5);
  });
});

describe("sanitizeHours", () => {
  it("drops malformed entries and counts them", () => {
    const good: HourIntensity = { hourStart: MOCK_NOW, gco2PerKwh: 250, isForecast: true };
    const { valid, dropped } = sanitizeHours([
      good,
      { hourStart: "not a date", gco2PerKwh: 250, isForecast: true },
      { hourStart: MOCK_NOW, gco2PerKwh: Number.NaN, isForecast: true },
      { hourStart: MOCK_NOW, gco2PerKwh: "250", isForecast: true },
      null,
      "x",
    ]);
    expect(valid).toEqual([good]);
    expect(dropped).toBe(5);
  });

  it("treats non-arrays as empty", () => {
    expect(sanitizeHours(undefined)).toEqual({ valid: [], dropped: 0 });
    expect(sanitizeHours({})).toEqual({ valid: [], dropped: 0 });
  });
});

describe("hourSource and formatHour", () => {
  it("reads the forecast flag through one helper", () => {
    expect(hourSource({ hourStart: MOCK_NOW, gco2PerKwh: 1, isForecast: true })).toBe("forecast");
    expect(hourSource({ hourStart: MOCK_NOW, gco2PerKwh: 1, isForecast: false })).toBe("measured");
  });

  it("formats in America/New_York with plain spaces", () => {
    const s = formatHour("2026-10-20T15:00:00-04:00", TZ);
    expect(s).toBe("Tue, Oct 20, 3 PM EDT");
    expect(s).not.toMatch(/[\u202f\u00a0]/);
    expect(formatHour("2026-11-03T15:00:00-05:00", TZ)).toBe("Tue, Nov 3, 3 PM EST");
  });
});
