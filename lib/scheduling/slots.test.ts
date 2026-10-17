import { describe, expect, it } from "vitest";
import type { HourIntensity } from "../types";
import { MissingHourIntensityError, slotsInWindow } from "./slots";

const HOUR_9: HourIntensity = {
  hourStart: "2026-10-18T09:00:00-04:00",
  gco2PerKwh: 412,
  tier: "measured",
};
const HOUR_10: HourIntensity = {
  hourStart: "2026-10-18T10:00:00-04:00",
  gco2PerKwh: 188,
  tier: "forecast",
};

describe("slotsInWindow", () => {
  it("repeats an hour's intensity and tier on every 15-minute slot, including the next hour", () => {
    const hours = [HOUR_9, HOUR_10];
    const slots = slotsInWindow({
      now: "2026-10-18T08:50:00-04:00",
      deadline: "2026-10-18T10:30:00-04:00",
      hours,
    });

    expect(slots).toEqual([
      {
        start: "2026-10-18T09:00:00-04:00",
        end: "2026-10-18T09:15:00-04:00",
        gco2PerKwh: 412,
        tier: "measured",
      },
      {
        start: "2026-10-18T09:15:00-04:00",
        end: "2026-10-18T09:30:00-04:00",
        gco2PerKwh: 412,
        tier: "measured",
      },
      {
        start: "2026-10-18T09:30:00-04:00",
        end: "2026-10-18T09:45:00-04:00",
        gco2PerKwh: 412,
        tier: "measured",
      },
      {
        start: "2026-10-18T09:45:00-04:00",
        end: "2026-10-18T10:00:00-04:00",
        gco2PerKwh: 412,
        tier: "measured",
      },
      {
        start: "2026-10-18T10:00:00-04:00",
        end: "2026-10-18T10:15:00-04:00",
        gco2PerKwh: 188,
        tier: "forecast",
      },
      {
        start: "2026-10-18T10:15:00-04:00",
        end: "2026-10-18T10:30:00-04:00",
        gco2PerKwh: 188,
        tier: "forecast",
      },
    ]);
    expect(hours).toEqual([HOUR_9, HOUR_10]);
  });

  it("matches an hour given as the same instant with a Zulu timestamp", () => {
    const slots = slotsInWindow({
      now: "2026-10-18T08:50:00-04:00",
      deadline: "2026-10-18T09:15:00-04:00",
      hours: [{ hourStart: "2026-10-18T13:00:00Z", gco2PerKwh: 412, tier: "measured" }],
    });

    expect(slots).toEqual([
      {
        start: "2026-10-18T09:00:00-04:00",
        end: "2026-10-18T09:15:00-04:00",
        gco2PerKwh: 412,
        tier: "measured",
      },
    ]);
  });

  it("returns no slots when the deadline is shorter than one slot, even with no hours", () => {
    expect(
      slotsInWindow({
        now: "2026-10-18T09:07:00-04:00",
        deadline: "2026-10-18T09:20:00-04:00",
        hours: [],
      }),
    ).toEqual([]);
  });

  it("throws when a slot's hour is missing", () => {
    expect(() =>
      slotsInWindow({
        now: "2026-10-18T08:50:00-04:00",
        deadline: "2026-10-18T10:15:00-04:00",
        hours: [HOUR_9],
      }),
    ).toThrow(MissingHourIntensityError);

    try {
      slotsInWindow({
        now: "2026-10-18T08:50:00-04:00",
        deadline: "2026-10-18T10:15:00-04:00",
        hours: [HOUR_9],
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MissingHourIntensityError);
      expect((error as MissingHourIntensityError).hourStart).toBe(
        "2026-10-18T10:00:00-04:00",
      );
      expect((error as MissingHourIntensityError).message).toBe(
        "No intensity for hour starting 2026-10-18T10:00:00-04:00",
      );
    }
  });

  it("uses the hour that contains the slot start across the spring-forward gap", () => {
    const slots = slotsInWindow({
      now: "2026-03-08T01:30:00-05:00",
      deadline: "2026-03-08T03:30:00-04:00",
      hours: [
        {
          hourStart: "2026-03-08T01:00:00-05:00",
          gco2PerKwh: 500,
          tier: "measured",
        },
        {
          hourStart: "2026-03-08T03:00:00-04:00",
          gco2PerKwh: 120,
          tier: "pattern",
        },
      ],
    });

    expect(slots.map((slot) => [slot.start, slot.gco2PerKwh, slot.tier])).toEqual([
      ["2026-03-08T01:45:00-05:00", 500, "measured"],
      ["2026-03-08T03:00:00-04:00", 120, "pattern"],
      ["2026-03-08T03:15:00-04:00", 120, "pattern"],
    ]);
  });

  it("keeps the two fall-back 1 o'clock hours distinct", () => {
    const slots = slotsInWindow({
      now: "2026-11-01T01:30:00-04:00",
      deadline: "2026-11-01T01:30:00-05:00",
      hours: [
        {
          hourStart: "2026-11-01T01:00:00-04:00",
          gco2PerKwh: 410,
          tier: "measured",
        },
        {
          hourStart: "2026-11-01T01:00:00-05:00",
          gco2PerKwh: 255,
          tier: "pattern",
        },
      ],
    });

    expect(slots).toEqual([
      {
        start: "2026-11-01T01:45:00-04:00",
        end: "2026-11-01T01:00:00-05:00",
        gco2PerKwh: 410,
        tier: "measured",
      },
      {
        start: "2026-11-01T01:00:00-05:00",
        end: "2026-11-01T01:15:00-05:00",
        gco2PerKwh: 255,
        tier: "pattern",
      },
      {
        start: "2026-11-01T01:15:00-05:00",
        end: "2026-11-01T01:30:00-05:00",
        gco2PerKwh: 255,
        tier: "pattern",
      },
    ]);
  });
});
