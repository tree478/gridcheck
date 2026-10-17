import { readFileSync } from "node:fs";
import { join } from "node:path";
import ICAL from "ical.js";
import { describe, expect, it } from "vitest";
import { mockBusy } from "./busy";
import { MOCK_NOW, mockGrid } from "./grid";

const HOUR_MS = 60 * 60 * 1000;
const EDT_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:00:00-04:00$/;

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
    expect(mockGrid.recent.at(-1)?.hourStart).toBe(mockGrid.latestDataHour);
    expect(Date.parse(mockGrid.latestDataHour)).toBeLessThan(Date.parse(MOCK_NOW));
  });

  it("flags forecast vs actual and keeps values plausible", () => {
    expect(mockGrid.recent.every((h) => !h.isForecast)).toBe(true);
    expect(mockGrid.forecast.every((h) => h.isForecast)).toBe(true);
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
});

describe("demo-calendar.ics", () => {
  const text = readFileSync(join(process.cwd(), "public/demo-calendar.ics"), "utf8");

  it("is valid iCalendar that ical.js can read", () => {
    const comp = new ICAL.Component(ICAL.parse(text));
    expect(comp.getAllSubcomponents("vevent")).toHaveLength(8);
    expect(comp.getFirstSubcomponent("vtimezone")).not.toBeNull();
  });

  it("contains the cases T-S5 must handle", () => {
    expect(text).toContain("RRULE:FREQ=WEEKLY");
    expect(text).toContain("TRANSP:TRANSPARENT");
    expect(text).toContain("DTSTART;VALUE=DATE:");
  });

  it("uses CRLF line endings (RFC 5545)", () => {
    expect(text.split("\n").every((line, i, all) => i === all.length - 1 || line.endsWith("\r"))).toBe(true);
  });
});
