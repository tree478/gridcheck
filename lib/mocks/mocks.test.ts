import { readFileSync } from "node:fs";
import { join } from "node:path";
import ICAL from "ical.js";
import { describe, expect, it } from "vitest";
import { MAX_DELAY_START_HOURS } from "../constants";
import type { BusyBlock } from "../types";
import { mockBusy } from "./busy";
import { MOCK_NOW, mockGrid } from "./grid";
import { mockNoWindowResult, mockScheduleRequest, mockScheduleResult } from "./schedule";

const HOUR_MS = 60 * 60 * 1000;
const EDT_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:00:00-04:00$/;

const overlaps = (a: { start: string; end: string }, b: BusyBlock) =>
  Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end);

describe("mockGrid", () => {
  it("has 48 recent and 168 forecast hours", () => {
    expect(mockGrid.recent).toHaveLength(48);
    expect(mockGrid.forecast).toHaveLength(168);
  });

  it("uses on-the-hour EDT timestamps, one hour apart", () => {
    for (const series of [mockGrid.recent, mockGrid.forecast]) {
      series.forEach((h, i) => {
        expect(h.hourStart).toMatch(EDT_ISO);
        if (i > 0) {
          expect(Date.parse(h.hourStart) - Date.parse(series[i - 1].hourStart)).toBe(HOUR_MS);
        }
      });
    }
  });

  it("starts the forecast at MOCK_NOW and ends recent at latestDataHour", () => {
    expect(mockGrid.forecast[0].hourStart).toBe(MOCK_NOW);
    expect(mockGrid.forecastMadeAt).toBe(MOCK_NOW);
    expect(mockGrid.recent.at(-1)?.hourStart).toBe(mockGrid.latestDataHour);
    expect(Date.parse(mockGrid.latestDataHour)).toBeLessThan(Date.parse(MOCK_NOW));
  });

  it("tags tiers and keeps values plausible", () => {
    expect(mockGrid.recent.every((h) => h.tier === "measured")).toBe(true);
    expect(mockGrid.forecast.every((h) => h.tier === "pattern")).toBe(true);
    for (const h of [...mockGrid.recent, ...mockGrid.forecast]) {
      expect(h.gco2PerKwh).toBeGreaterThan(150);
      expect(h.gco2PerKwh).toBeLessThan(400);
    }
  });
});

describe("mockBusy", () => {
  it("is sorted and non-overlapping with start < end", () => {
    mockBusy.forEach((b, i) => {
      expect(Date.parse(b.start)).toBeLessThan(Date.parse(b.end));
      if (i > 0) {
        expect(Date.parse(b.start)).toBeGreaterThanOrEqual(Date.parse(mockBusy[i - 1].end));
      }
    });
  });

  it("falls inside the mock forecast horizon", () => {
    const first = Date.parse(mockGrid.forecast[0].hourStart);
    const last = Date.parse(mockGrid.forecast.at(-1)!.hourStart) + HOUR_MS;
    for (const b of mockBusy) {
      expect(Date.parse(b.start)).toBeGreaterThanOrEqual(first);
      expect(Date.parse(b.end)).toBeLessThanOrEqual(last);
    }
  });

  it("has a nightly sleep block that crosses midnight", () => {
    const sleep = mockBusy.filter((b) => b.asleep);
    expect(sleep).toHaveLength(7);
    for (const b of sleep) {
      expect(b.start.slice(0, 10)).not.toBe(b.end.slice(0, 10));
    }
  });
});

describe("mockScheduleResult", () => {
  const deadline = Date.parse(mockScheduleRequest.deadline);

  it("covers every requested item", () => {
    expect(mockScheduleResult.results.map((r) => r.activityId)).toEqual(
      mockScheduleRequest.items.map((i) => i.activity.id),
    );
  });

  for (const result of mockScheduleResult.results) {
    if (!result.ok) continue;
    const item = mockScheduleRequest.items.find((i) => i.activity.id === result.activityId)!;

    describe(result.activityId, () => {
      it("uses each label at most once and merges at least one option", () => {
        const labels = result.options.flatMap((o) => o.labels).filter((l) => l !== "alternative");
        expect(new Set(labels).size).toBe(labels.length);
        expect(result.options.some((o) => o.labels.length > 1)).toBe(true);
      });

      it("runs for the item's duration and ends by the deadline", () => {
        for (const o of result.options) {
          expect(Date.parse(o.end) - Date.parse(o.start)).toBe(item.durationMin * 60 * 1000);
          expect(Date.parse(o.end)).toBeLessThanOrEqual(deadline);
          expect(Date.parse(o.start)).toBeGreaterThan(Date.parse(MOCK_NOW));
        }
      });

      it("keeps attended moments clear of busy and sleep blocks", () => {
        for (const o of result.options) {
          for (const m of o.attendedMoments) {
            expect(mockBusy.filter((b) => overlaps(m, b))).toEqual([]);
          }
        }
      });

      it("loads delay-start runs while awake, at most 24 h early", () => {
        for (const o of result.options.filter((o) => o.loadAt)) {
          const lead = Date.parse(o.start) - Date.parse(o.loadAt!);
          expect(lead).toBeGreaterThan(0);
          expect(lead).toBeLessThanOrEqual(MAX_DELAY_START_HOURS * HOUR_MS);
          expect(o.attendedMoments[0].start).toBe(o.loadAt);
        }
      });

      it("matches reference grams and savings vs Soonest", () => {
        const soonest = result.options.find((o) => o.labels.includes("soonest"))!;
        const best = result.options.find((o) => o.labels.includes("best"))!;
        expect(result.reference.soonestGrams).toBe(soonest.modeledGrams);
        expect(result.reference.bestGrams).toBe(best.modeledGrams);
        expect(soonest.savedVsSoonestGrams).toBe(0);
        for (const o of result.options) {
          expect(o.modeledGrams).toBeGreaterThanOrEqual(result.reference.greenestGrams);
          expect(o.modeledGrams).toBeLessThanOrEqual(result.reference.worstGrams);
        }
      });
    });
  }

  it("has a no-window variant with a reason and suggestion", () => {
    const [r] = mockNoWindowResult.results;
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason.length).toBeGreaterThan(0);
      expect(r.suggestion).toBeTruthy();
    }
  });
});

describe("demo-calendar.ics", () => {
  const text = readFileSync(join(process.cwd(), "public/demo-calendar.ics"), "utf8");

  it("is valid iCalendar that ical.js can read", () => {
    const comp = new ICAL.Component(ICAL.parse(text));
    expect(comp.getAllSubcomponents("vevent")).toHaveLength(8);
    expect(comp.getFirstSubcomponent("vtimezone")).not.toBeNull();
  });

  it("contains the cases T-S7 option B must handle", () => {
    expect(text).toContain("RRULE:FREQ=WEEKLY");
    expect(text).toContain("TRANSP:TRANSPARENT");
    expect(text).toContain("DTSTART;VALUE=DATE:");
  });

  it("uses CRLF line endings (RFC 5545)", () => {
    expect(text.split("\n").every((line, i, all) => i === all.length - 1 || line.endsWith("\r"))).toBe(true);
  });
});
