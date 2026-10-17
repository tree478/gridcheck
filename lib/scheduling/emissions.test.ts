import { describe, expect, it } from "vitest";
import { modeledGrams } from "./emissions";

describe("modeledGrams", () => {
  it("splits one cycle evenly across a one-hour run at a single intensity", () => {
    // 60 minutes = 4 slots. 0.5 kWh / 4 = 0.125 kWh per slot.
    // 300 gCO₂/kWh × 0.125 kWh × 4 slots = 150 g.
    const intensities = [300, 300, 300, 300];
    expect(modeledGrams(intensities, 0.5)).toBe(150);
    expect(intensities).toEqual([300, 300, 300, 300]);
  });

  it("uses each hour's intensity when a run crosses the hour boundary", () => {
    // First hour: 300, 300. Second hour: 200, 200. Energy 0.5 kWh.
    // kWh per slot = 0.5 / 4 = 0.125.
    // 300×0.125 + 300×0.125 + 200×0.125 + 200×0.125 = 125 g.
    expect(modeledGrams([300, 300, 200, 200], 0.5)).toBe(125);
  });

  it("splits an uneven energy total across a two-hour run", () => {
    // 90 minutes = 6 slots, 0.75 kWh → 0.125 kWh per slot.
    // Hour one (2 slots at 400): 400 × 0.125 × 2 = 100.
    // Hour two (4 slots at 100): 100 × 0.125 × 4 = 50.
    // Total = 150 g.
    expect(modeledGrams([400, 400, 100, 100, 100, 100], 0.75)).toBe(150);
  });

  it("returns 0 when the cycle uses no energy", () => {
    expect(modeledGrams([300, 200], 0)).toBe(0);
  });

  it("rejects a run with no slots", () => {
    expect(() => modeledGrams([], 0.5)).toThrow(RangeError);
  });

  it("rejects a non-finite or negative energy", () => {
    expect(() => modeledGrams([300], Number.NaN)).toThrow(RangeError);
    expect(() => modeledGrams([300], -0.1)).toThrow(RangeError);
  });

  it("rejects a non-finite or negative slot intensity", () => {
    expect(() => modeledGrams([300, Number.POSITIVE_INFINITY], 0.5)).toThrow(
      RangeError,
    );
    expect(() => modeledGrams([300, -1], 0.5)).toThrow(RangeError);
  });
});
