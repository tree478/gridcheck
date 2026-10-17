import { afterEach, describe, expect, it, vi } from "vitest";
import raw from "./__fixtures__/eia-28d.raw.json";
import { parseRows, type EiaFuelRow } from "./eia";
import { computeIntensity } from "./intensity";

const H1 = "2026-10-16T14:00:00-04:00";
const H2 = "2026-10-16T15:00:00-04:00";
const H3 = "2026-10-16T16:00:00-04:00";

function row(hourStart: string, fuelCode: string, mwh: number): EiaFuelRow {
  return { hourStart, fuelCode, mwh };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("computeIntensity", () => {
  it("matches a hand-calculated hour, excluding storage and mapping SNB to SUN", () => {
    const out = computeIntensity([
      row(H1, "NG", 1000),
      row(H1, "NUC", 3000),
      row(H1, "SNB", 100),
      row(H1, "BAT", 50),
      row(H1, "PS", 200),
    ]);
    // (1000·490 + 3000·12 + 100·45) / 4100 = 530500 / 4100
    expect(out).toHaveLength(1);
    expect(out[0].hourStart).toBe(H1);
    expect(out[0].tier).toBe("measured");
    expect(out[0].gco2PerKwh).toBeCloseTo(530500 / 4100, 10);
    expect(out[0].gco2PerKwh).toBeCloseTo(129.39, 2);
  });

  it("treats negative MWh as 0", () => {
    const out = computeIntensity([row(H1, "NG", 1000), row(H1, "WND", -500)]);
    expect(out[0].gco2PerKwh).toBe(490);
  });

  it("treats an unknown code as OTH and warns once per code", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = computeIntensity([
      row(H1, "XYZ", 100),
      row(H1, "NUC", 100),
      row(H2, "XYZ", 100),
    ]);
    expect(out.map((h) => h.gco2PerKwh)).toEqual([(230 + 12) / 2, 230]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("XYZ");
  });

  it("does not treat Object prototype names as fuel codes", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = computeIntensity([row(H1, "toString", 100)]);
    expect(out[0].gco2PerKwh).toBe(230);
  });

  it("leaves missing hours missing and drops hours with only storage or zero output", () => {
    const out = computeIntensity([
      row(H3, "NG", 100),
      row(H2, "BAT", 50),
      row(H2, "PS", 200),
      row(H1, "NUC", 100),
      row("2026-10-16T17:00:00-04:00", "NG", 0),
    ]);
    expect(out.map((h) => h.hourStart)).toEqual([H1, H3]);
    for (const h of out) expect(h.gco2PerKwh).toBeGreaterThan(0);
  });

  it("handles the real 28-day fixture", () => {
    const out = computeIntensity(parseRows(raw));
    // 658 hours, but EIA reports every fuel as 0 at 2026-10-14T20 and T21 UTC.
    expect(out).toHaveLength(656);
    const hours = new Set(out.map((h) => h.hourStart));
    expect(hours.has("2026-10-14T16:00:00-04:00")).toBe(false);
    expect(hours.has("2026-10-14T17:00:00-04:00")).toBe(false);
    for (let i = 0; i < out.length; i++) {
      expect(out[i].tier).toBe("measured");
      expect(out[i].gco2PerKwh).toBeGreaterThanOrEqual(11);
      expect(out[i].gco2PerKwh).toBeLessThanOrEqual(820);
      if (i > 0) {
        expect(Date.parse(out[i].hourStart)).toBeGreaterThan(Date.parse(out[i - 1].hourStart));
      }
    }
  });
});
