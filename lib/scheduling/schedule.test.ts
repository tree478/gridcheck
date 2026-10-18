import { describe, expect, it } from "vitest";
import {
  ACTIVITY_CATALOG,
  ALTERNATIVE_SPACING_MIN,
  MAX_ALTERNATIVES,
  MAX_HORIZON_DAYS,
  NEAR_TIE_MARGIN,
} from "../constants";
import { mockBusy } from "../mocks/busy";
import { MOCK_NOW, mockGrid } from "../mocks/grid";
import type {
  Activity,
  ActivityResult,
  BusyBlock,
  FixedRun,
  HourIntensity,
  OptionLabel,
  PlannedActivity,
  ScheduleRequest,
  ScheduleResult,
  Tier,
} from "../types";
import { schedule } from "./schedule";
import { addMinutes, parseInstant } from "./time";

const NOW = "2026-10-18T08:50:00-04:00";
const HOUR_9 = "2026-10-18T09:00:00-04:00";
const HOUR_10 = "2026-10-18T10:00:00-04:00";
const HOUR_11 = "2026-10-18T11:00:00-04:00";

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "custom",
    name: "Custom",
    defaultDurationMin: 15,
    defaultEnergyKwh: 1,
    attention: "start",
    supportsDelayStart: false,
    ...overrides,
  };
}

function planned(overrides: Partial<PlannedActivity> = {}): PlannedActivity {
  const durationMin = overrides.durationMin ?? 15;
  return {
    activity: activity({ defaultDurationMin: durationMin }),
    durationMin,
    energyKwh: 1,
    delayStart: false,
    ...overrides,
  };
}

function hours(
  start: string,
  count: number,
  gco2PerKwh: number,
  tier: Tier = "pattern",
): HourIntensity[] {
  const forecast: HourIntensity[] = [];
  let cursor = start;
  for (let index = 0; index < count; index += 1) {
    forecast.push({ hourStart: cursor, gco2PerKwh, tier });
    cursor = addMinutes(cursor, 60);
  }
  return forecast;
}

function request(overrides: Partial<ScheduleRequest> & Pick<ScheduleRequest, "items" | "deadline" | "forecast">): ScheduleRequest {
  return {
    now: NOW,
    busy: [],
    fixedRuns: [],
    diversitySeed: 0,
    ...overrides,
  };
}

function only(result: ScheduleResult): ActivityResult {
  expect(result.results).toHaveLength(1);
  return result.results[0];
}

function opened(result: ScheduleResult) {
  const activityResult = only(result);
  expect(activityResult.ok).toBe(true);
  if (!activityResult.ok) throw new Error("expected a valid window");
  return activityResult;
}

function gramsOf(options: { labels: OptionLabel[]; modeledGrams: number }[], label: OptionLabel): number {
  const option = options.find((candidate) => candidate.labels.includes(label));
  if (!option) throw new Error(`missing ${label}`);
  return option.modeledGrams;
}

function withinNearTie(grams: number, bestGrams: number): boolean {
  if (bestGrams === 0) return grams === 0;
  return grams <= bestGrams * (1 + NEAR_TIE_MARGIN);
}

describe("schedule", () => {
  it("returns no results when nothing was requested", () => {
    expect(
      schedule(
        request({
          items: [],
          deadline: "2026-10-18T12:00:00-04:00",
          forecast: hours(HOUR_9, 3, 100),
        }),
      ),
    ).toEqual({ results: [] });
  });

  it("refuses a second activity without ranking it", () => {
    const result = schedule(
      request({
        items: [
          planned({ activity: activity({ id: "washer", name: "Washer" }) }),
          planned({ activity: activity({ id: "dryer", name: "Dryer" }), durationMin: 0 }),
        ],
        deadline: "2026-10-18T12:00:00-04:00",
        forecast: hours(HOUR_9, 3, 100),
      }),
    );

    expect(result.results).toHaveLength(1);
    const activityResult = result.results[0];
    expect(activityResult.ok).toBe(false);
    if (activityResult.ok) throw new Error("expected a refusal");
    expect(activityResult.activityId).toBe("washer");
    expect(activityResult.reason.toLowerCase()).toContain("single-appliance scheduling only");
  });

  it("rejects a duration that is not a whole number of slots", () => {
    const activityResult = only(
      schedule(
        request({
          items: [planned({ durationMin: 10, activity: activity({ id: "laptop", name: "Laptop" }) })],
          deadline: "2026-10-18T12:00:00-04:00",
          forecast: hours(HOUR_9, 3, 100),
        }),
      ),
    );
    expect(activityResult.ok).toBe(false);
    if (activityResult.ok) throw new Error("expected a refusal");
    expect(activityResult.activityId).toBe("laptop");
  });

  it("fails the activity when a slot's hour is missing", () => {
    const activityResult = only(
      schedule(
        request({
          items: [planned()],
          deadline: "2026-10-18T10:15:00-04:00",
          forecast: hours(HOUR_9, 1, 100),
        }),
      ),
    );
    expect(activityResult.ok).toBe(false);
    if (activityResult.ok) throw new Error("expected a missing hour");
    expect(activityResult.reason).toContain("No intensity for hour starting");
    expect(activityResult.reason).toContain(HOUR_10);
    expect(activityResult.suggestion).toBeUndefined();
  });

  it("keeps a run that ends on the deadline even when attention extends past it", () => {
    const activityResult = opened(
      schedule(
        request({
          items: [
            planned({
              durationMin: 15,
              energyKwh: 0.5,
              activity: activity({ attention: "startEnd", defaultEnergyKwh: 0.5 }),
            }),
          ],
          deadline: "2026-10-18T09:15:00-04:00",
          forecast: [{ hourStart: HOUR_9, gco2PerKwh: 333, tier: "measured" }],
        }),
      ),
    );

    expect(activityResult.options).toHaveLength(1);
    expect(activityResult.options[0]).toMatchObject({
      start: HOUR_9,
      end: "2026-10-18T09:15:00-04:00",
      modeledGrams: 166.5,
    });
    expect(activityResult.options[0].loadAt).toBeUndefined();
  });

  it("treats a fixed run's attended moments as busy and leaves its middle free", () => {
    const fixed: FixedRun = {
      activityId: "dryer",
      start: HOUR_9,
      end: HOUR_11,
      attendedMoments: [{ start: HOUR_9, end: "2026-10-18T09:10:00-04:00" }],
    };
    const activityResult = opened(
      schedule(
        request({
          items: [planned({ durationMin: 60 })],
          deadline: "2026-10-18T11:30:00-04:00",
          forecast: [
            { hourStart: HOUR_9, gco2PerKwh: 100, tier: "pattern" },
            { hourStart: HOUR_10, gco2PerKwh: 100, tier: "pattern" },
            { hourStart: HOUR_11, gco2PerKwh: 100, tier: "pattern" },
          ],
          fixedRuns: [fixed],
        }),
      ),
    );

    const soonest = activityResult.options.find((option) => option.labels.includes("soonest"));
    expect(soonest?.start).toBe("2026-10-18T09:30:00-04:00");
  });
});

describe("confidence and diversity", () => {
  function tiered(second: HourIntensity, seed = 0) {
    return opened(
      schedule(
        request({
          now: "2026-10-18T09:50:00-04:00",
          items: [planned()],
          deadline: "2026-10-18T11:15:00-04:00",
          forecast: [{ hourStart: HOUR_10, gco2PerKwh: 100, tier: "measured" }, second],
          diversitySeed: seed,
        }),
      ),
    );
  }

  it("lets a later pattern run that is exactly 10% cleaner become Best", () => {
    const activityResult = tiered({ hourStart: HOUR_11, gco2PerKwh: 90, tier: "pattern" });
    const best = activityResult.options.find((option) => option.labels.includes("best"));
    const greenest = activityResult.options.find((option) => option.labels.includes("greenest"));
    expect(best?.start).toBe("2026-10-18T11:00:00-04:00");
    expect(best?.confidence).toBe("pattern");
    expect(best?.modeledGrams).toBe(90);
    expect(greenest?.start).toBe(best?.start);
    const soonest = activityResult.options.find((option) => option.labels.includes("soonest"));
    expect(soonest?.modeledGrams).toBe(100);
    expect(best && soonest ? best.savedVsSoonestGrams : undefined).toBe(10);
    expect(best && soonest ? best.savedVsSoonestPct : undefined).toBe(10);
  });

  it("keeps a nearer measured run when a later pattern run is less than 10% cleaner", () => {
    const activityResult = tiered({ hourStart: HOUR_11, gco2PerKwh: 91, tier: "pattern" });
    const best = activityResult.options.find((option) => option.labels.includes("best"));
    const greenest = activityResult.options.find((option) => option.labels.includes("greenest"));
    expect(best?.start).toBe(HOUR_10);
    expect(best?.confidence).toBe("measured");
    expect(greenest?.start).toBe(HOUR_11);
    expect(greenest?.modeledGrams).toBe(91);
    expect(greenest?.start).not.toBe(best?.start);
  });

  it("makes Best equal Greenest when every run is pattern", () => {
    const activityResult = opened(
      schedule(
        request({
          now: "2026-10-18T09:50:00-04:00",
          items: [planned()],
          deadline: "2026-10-18T11:15:00-04:00",
          forecast: [
            { hourStart: HOUR_10, gco2PerKwh: 100, tier: "pattern" },
            { hourStart: HOUR_11, gco2PerKwh: 95, tier: "pattern" },
          ],
        }),
      ),
    );
    const best = activityResult.options.find((option) => option.labels.includes("best"));
    const greenest = activityResult.options.find((option) => option.labels.includes("greenest"));
    expect(best?.start).toBe(greenest?.start);
    expect(best?.start).toBe(HOUR_11);
  });

  it("returns the same Recommended start for a fixed seed and another start for a different seed", () => {
    const forecast = hours(HOUR_9, 1, 100);
    const base = {
      items: [planned()],
      deadline: "2026-10-18T09:45:00-04:00",
      forecast,
    };
    const recommendedStart = (seed: number) => {
      const activityResult = opened(schedule(request({ ...base, diversitySeed: seed })));
      const recommended = activityResult.options.find((option) => option.labels.includes("recommended"));
      const bestGrams = gramsOf(activityResult.options, "best");
      expect(recommended).toBeDefined();
      expect(withinNearTie(recommended?.modeledGrams ?? -1, bestGrams)).toBe(true);
      return recommended?.start;
    };

    const first = recommendedStart(0);
    expect(recommendedStart(0)).toBe(first);
    expect(recommendedStart(1)).not.toBe(first);
    expect(recommendedStart(1)).toBe(recommendedStart(1.9));
    expect(recommendedStart(Number.NaN)).toBe(first);
    expect(recommendedStart(-1)).toBe("2026-10-18T09:30:00-04:00");
  });

  it("merges recommended, best, greenest, soonest, and worst onto the earliest flat-forecast run", () => {
    const activityResult = opened(
      schedule(
        request({
          items: [planned()],
          deadline: "2026-10-18T11:00:00-04:00",
          forecast: hours(HOUR_9, 2, 120, "forecast"),
          diversitySeed: 0,
        }),
      ),
    );

    expect(activityResult.options[0].labels).toEqual([
      "recommended",
      "best",
      "greenest",
      "soonest",
      "worst",
    ]);
    expect(activityResult.options[0].start).toBe(HOUR_9);
    expect(activityResult.options[0].confidence).toBe("forecast");
    for (const option of activityResult.options.slice(1)) {
      expect(option.labels).toEqual(["alternative"]);
    }
  });
});

describe("alternatives", () => {
  it("returns at most five alternatives, each at least 60 minutes from every other returned start", () => {
    const activityResult = opened(
      schedule(
        request({
          items: [planned()],
          deadline: "2026-10-18T16:00:00-04:00",
          forecast: hours(HOUR_9, 7, 80, "forecast"),
          diversitySeed: 0,
        }),
      ),
    );

    const alternatives = activityResult.options.filter((option) =>
      option.labels.includes("alternative"),
    );
    expect(alternatives).toHaveLength(MAX_ALTERNATIVES);
    for (const alternative of alternatives) {
      expect(alternative.labels).toEqual(["alternative"]);
      for (const other of activityResult.options) {
        if (other.start === alternative.start) continue;
        const apart = Math.abs(parseInstant(alternative.start) - parseInstant(other.start)) / 60_000;
        expect(apart).toBeGreaterThanOrEqual(ALTERNATIVE_SPACING_MIN);
      }
    }

    const starts = activityResult.options.map((option) => option.start);
    expect(starts).toContain("2026-10-18T10:00:00-04:00");
    expect(starts).not.toContain("2026-10-18T09:45:00-04:00");
    expect(
      Math.abs(parseInstant(starts[0]) - parseInstant("2026-10-18T10:00:00-04:00")) / 60_000,
    ).toBe(ALTERNATIVE_SPACING_MIN);
  });
});

describe("delay-start", () => {
  it("loads at the latest free slot and skips a later slot that falls in sleep", () => {
    const activityResult = opened(
      schedule(
        request({
          now: "2026-10-18T09:20:00-04:00",
          items: [
            planned({
              durationMin: 15,
              delayStart: true,
              activity: activity({
                id: "dishwasher",
                name: "Dishwasher",
                attention: "startEnd",
                supportsDelayStart: true,
              }),
            }),
          ],
          deadline: "2026-10-18T10:15:00-04:00",
          busy: [
            {
              start: "2026-10-18T09:45:00-04:00",
              end: "2026-10-18T09:55:00-04:00",
              asleep: true,
            },
            {
              start: HOUR_10,
              end: "2026-10-18T10:10:00-04:00",
              asleep: false,
            },
          ],
          forecast: [
            { hourStart: HOUR_9, gco2PerKwh: 100, tier: "pattern" },
            { hourStart: HOUR_10, gco2PerKwh: 100, tier: "pattern" },
          ],
        }),
      ),
    );

    expect(activityResult.options).toHaveLength(1);
    expect(activityResult.options[0].start).toBe(HOUR_10);
    expect(activityResult.options[0].loadAt).toBe("2026-10-18T09:30:00-04:00");
    expect(activityResult.options[0].loadAt).not.toBe("2026-10-18T09:45:00-04:00");
  });
});

describe("no valid window", () => {
  const horizonHours = hours(HOUR_9, MAX_HORIZON_DAYS * 24, 100);

  it("suggests the earliest horizon run when the deadline is too soon", () => {
    const activityResult = only(
      schedule(
        request({
          now: HOUR_9,
          items: [planned({ durationMin: 60 })],
          deadline: "2026-10-18T09:10:00-04:00",
          forecast: horizonHours,
        }),
      ),
    );
    expect(activityResult.ok).toBe(false);
    if (activityResult.ok) throw new Error("expected no window");
    expect(activityResult.reason.toLowerCase()).toContain("no valid window before the deadline");
    expect(activityResult.suggestion).toContain("2026-10-18T09:15:00-04:00");
  });

  it("names sleep and omits a suggestion when one asleep block covers the horizon", () => {
    const horizonEnd = addMinutes(HOUR_9, MAX_HORIZON_DAYS * 24 * 60);
    const activityResult = only(
      schedule(
        request({
          now: HOUR_9,
          items: [planned()],
          deadline: horizonEnd,
          busy: [{ start: HOUR_9, end: horizonEnd, asleep: true }],
          forecast: horizonHours,
        }),
      ),
    );
    expect(activityResult.ok).toBe(false);
    if (activityResult.ok) throw new Error("expected no window");
    expect(activityResult.reason.toLowerCase()).toContain("sleep");
    expect(activityResult.suggestion).toBeUndefined();
  });

  it("names busy time and omits a suggestion when one ordinary busy block covers the horizon", () => {
    const horizonEnd = addMinutes(HOUR_9, MAX_HORIZON_DAYS * 24 * 60);
    const cover: BusyBlock = { start: HOUR_9, end: horizonEnd, asleep: false };
    const activityResult = only(
      schedule(
        request({
          now: HOUR_9,
          items: [planned()],
          deadline: horizonEnd,
          busy: [cover],
          forecast: horizonHours,
        }),
      ),
    );
    expect(activityResult.ok).toBe(false);
    if (activityResult.ok) throw new Error("expected no window");
    expect(activityResult.reason.toLowerCase()).toContain("busy time");
    expect(activityResult.reason.toLowerCase()).not.toContain("sleep");
    expect(activityResult.suggestion).toBeUndefined();
  });

  it("names the deadline when the duration cannot fit in the horizon", () => {
    const activityResult = only(
      schedule(
        request({
          now: HOUR_9,
          items: [planned({ durationMin: MAX_HORIZON_DAYS * 24 * 60 })],
          deadline: "2026-10-18T09:30:00-04:00",
          forecast: horizonHours,
        }),
      ),
    );
    expect(activityResult.ok).toBe(false);
    if (activityResult.ok) throw new Error("expected no window");
    expect(activityResult.reason).toContain("The constraint is deadline.");
    expect(activityResult.suggestion).toBeUndefined();
  });
});

describe("mock forecast", () => {
  it("ranks one washer against the mocks without using the hand-picked schedule", () => {
    const washer = ACTIVITY_CATALOG.find((entry) => entry.id === "washer");
    if (!washer) throw new Error("washer missing from catalog");

    const activityResult = opened(
      schedule({
        items: [
          {
            activity: washer,
            durationMin: washer.defaultDurationMin,
            energyKwh: washer.defaultEnergyKwh,
            delayStart: false,
          },
        ],
        now: MOCK_NOW,
        deadline: "2026-10-22T21:00:00-04:00",
        busy: mockBusy,
        forecast: mockGrid.forecast,
        fixedRuns: [],
        diversitySeed: 42,
      }),
    );

    expect(activityResult.activityId).toBe("washer");
    for (const label of ["soonest", "greenest", "best", "recommended", "worst"] as const) {
      expect(activityResult.options.filter((option) => option.labels.includes(label))).toHaveLength(1);
    }

    const bestGrams = gramsOf(activityResult.options, "best");
    const greenestGrams = gramsOf(activityResult.options, "greenest");
    expect(bestGrams).toBe(greenestGrams);
    expect(activityResult.reference).toEqual({
      bestGrams,
      worstGrams: gramsOf(activityResult.options, "worst"),
      soonestGrams: gramsOf(activityResult.options, "soonest"),
      greenestGrams,
    });

    const recommended = activityResult.options.find((option) => option.labels.includes("recommended"));
    expect(withinNearTie(recommended?.modeledGrams ?? -1, bestGrams)).toBe(true);

    const alternatives = activityResult.options.filter((option) =>
      option.labels.includes("alternative"),
    );
    expect(alternatives.length).toBeLessThanOrEqual(MAX_ALTERNATIVES);
    for (const alternative of alternatives) {
      for (const other of activityResult.options) {
        if (other.start === alternative.start) continue;
        const apart = Math.abs(parseInstant(alternative.start) - parseInstant(other.start)) / 60_000;
        expect(apart).toBeGreaterThanOrEqual(ALTERNATIVE_SPACING_MIN);
      }
    }

    const starts = activityResult.options.map((option) => parseInstant(option.start));
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    for (const option of activityResult.options) {
      expect(option.loadAt).toBeUndefined();
    }
  });
});
