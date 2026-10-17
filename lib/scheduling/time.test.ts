import { describe, expect, it } from "vitest";
import {
  InvalidInstantError,
  addMinutes,
  formatInstant,
  nextSlotStart,
  parseInstant,
  slotBounds,
} from "./time";

const SLOT = 15;
const HORIZON_DAYS = 7;

describe("parseInstant", () => {
  it("reads an offset timestamp as epoch milliseconds", () => {
    expect(parseInstant("2026-10-18T09:00:00-04:00")).toBe(
      Date.parse("2026-10-18T13:00:00Z"),
    );
  });

  it("treats Z and the matching New York offset as the same instant", () => {
    expect(parseInstant("2026-10-18T13:00:00Z")).toBe(
      parseInstant("2026-10-18T09:00:00-04:00"),
    );
  });

  it.each([
    "",
    "not-a-date",
    "2026-10-18",
    "2026-10-18T09:00:00",
    "2026-10-18T09:00:00-0400",
    "2026-13-01T00:00:00Z",
    "2026-02-31T00:00:00Z",
    "2026-10-18T24:00:00Z",
    "2026-10-18T25:00:00Z",
  ])("rejects %j", (iso) => {
    expect(() => parseInstant(iso)).toThrow(InvalidInstantError);
  });
});

describe("formatInstant", () => {
  it("writes America/New_York with the EDT offset", () => {
    const ms = parseInstant("2026-10-18T13:15:00Z");
    expect(formatInstant(ms)).toBe("2026-10-18T09:15:00-04:00");
  });

  it("writes the EST offset in winter", () => {
    expect(formatInstant(parseInstant("2026-01-15T15:00:00Z"))).toBe(
      "2026-01-15T10:00:00-05:00",
    );
  });

  it("keeps sub-second precision", () => {
    const iso = "2026-10-18T09:00:00.500-04:00";
    expect(formatInstant(parseInstant(iso))).toBe(iso);
  });

  it("rejects a non-finite epoch", () => {
    expect(() => formatInstant(Number.NaN)).toThrow(InvalidInstantError);
  });
});

describe("addMinutes", () => {
  it("adds through epoch milliseconds", () => {
    expect(addMinutes("2026-10-18T09:07:00-04:00", 8)).toBe(
      "2026-10-18T09:15:00-04:00",
    );
    expect(addMinutes("2026-10-18T09:50:00-04:00", 20)).toBe(
      "2026-10-18T10:10:00-04:00",
    );
  });

  it("crosses the spring-forward gap in real minutes", () => {
    expect(addMinutes("2026-03-08T01:45:00-05:00", 15)).toBe(
      "2026-03-08T03:00:00-04:00",
    );
  });

  it("crosses the fall-back repeat hour in real minutes", () => {
    expect(addMinutes("2026-11-01T01:45:00-04:00", 15)).toBe(
      "2026-11-01T01:00:00-05:00",
    );
    expect(addMinutes("2026-11-01T01:30:00-04:00", 60)).toBe(
      "2026-11-01T01:30:00-05:00",
    );
  });
});

describe("nextSlotStart", () => {
  it("moves an exact boundary forward one slot", () => {
    expect(nextSlotStart("2026-10-18T09:00:00-04:00", SLOT)).toBe(
      "2026-10-18T09:15:00-04:00",
    );
    expect(nextSlotStart("2026-10-18T09:45:00-04:00", SLOT)).toBe(
      "2026-10-18T10:00:00-04:00",
    );
  });

  it("rounds a partial minute up to the next boundary", () => {
    expect(nextSlotStart("2026-10-18T08:59:00-04:00", SLOT)).toBe(
      "2026-10-18T09:00:00-04:00",
    );
    expect(nextSlotStart("2026-10-18T09:07:00-04:00", SLOT)).toBe(
      "2026-10-18T09:15:00-04:00",
    );
    expect(nextSlotStart("2026-10-18T09:00:00.001-04:00", SLOT)).toBe(
      "2026-10-18T09:15:00-04:00",
    );
  });

  it("skips the missing hour when clocks spring forward", () => {
    expect(nextSlotStart("2026-03-08T01:50:00-05:00", SLOT)).toBe(
      "2026-03-08T03:00:00-04:00",
    );
  });

  it("steps into the repeated hour when clocks fall back", () => {
    expect(nextSlotStart("2026-11-01T01:45:00-04:00", SLOT)).toBe(
      "2026-11-01T01:00:00-05:00",
    );
    expect(nextSlotStart("2026-11-01T01:00:00-05:00", SLOT)).toBe(
      "2026-11-01T01:15:00-05:00",
    );
  });
});

describe("slotBounds", () => {
  it("excludes an exact start boundary and includes a slot that ends on the deadline", () => {
    expect(
      slotBounds({
        now: "2026-10-18T09:00:00-04:00",
        deadline: "2026-10-18T10:00:00-04:00",
        slotMinutes: SLOT,
        maxHorizonDays: HORIZON_DAYS,
      }),
    ).toEqual([
      { start: "2026-10-18T09:15:00-04:00", end: "2026-10-18T09:30:00-04:00" },
      { start: "2026-10-18T09:30:00-04:00", end: "2026-10-18T09:45:00-04:00" },
      { start: "2026-10-18T09:45:00-04:00", end: "2026-10-18T10:00:00-04:00" },
    ]);
  });

  it("starts a partial minute at the next boundary", () => {
    const bounds = slotBounds({
      now: "2026-10-18T09:07:00-04:00",
      deadline: "2026-10-18T10:00:00-04:00",
      slotMinutes: SLOT,
      maxHorizonDays: HORIZON_DAYS,
    });
    expect(bounds[0]).toEqual({
      start: "2026-10-18T09:15:00-04:00",
      end: "2026-10-18T09:30:00-04:00",
    });
    expect(bounds).toHaveLength(3);
  });

  it("returns nothing when the deadline cuts through the only candidate slot", () => {
    expect(
      slotBounds({
        now: "2026-10-18T09:07:00-04:00",
        deadline: "2026-10-18T09:20:00-04:00",
        slotMinutes: SLOT,
        maxHorizonDays: HORIZON_DAYS,
      }),
    ).toEqual([]);
  });

  it("drops a trailing partial slot and keeps the one that ends on the deadline", () => {
    expect(
      slotBounds({
        now: "2026-10-18T09:00:00-04:00",
        deadline: "2026-10-18T09:45:00-04:00",
        slotMinutes: SLOT,
        maxHorizonDays: HORIZON_DAYS,
      }).map((slot) => slot.end),
    ).toEqual(["2026-10-18T09:30:00-04:00", "2026-10-18T09:45:00-04:00"]);

    expect(
      slotBounds({
        now: "2026-10-18T09:00:00-04:00",
        deadline: "2026-10-18T09:44:00-04:00",
        slotMinutes: SLOT,
        maxHorizonDays: HORIZON_DAYS,
      }),
    ).toEqual([
      { start: "2026-10-18T09:15:00-04:00", end: "2026-10-18T09:30:00-04:00" },
    ]);
  });

  it("returns nothing when the deadline is at or before now", () => {
    const now = "2026-10-18T09:07:00-04:00";
    expect(
      slotBounds({
        now,
        deadline: now,
        slotMinutes: SLOT,
        maxHorizonDays: HORIZON_DAYS,
      }),
    ).toEqual([]);
    expect(
      slotBounds({
        now,
        deadline: "2026-10-18T09:00:00-04:00",
        slotMinutes: SLOT,
        maxHorizonDays: HORIZON_DAYS,
      }),
    ).toEqual([]);
  });

  it("stops an eight-day deadline at seven elapsed days from now", () => {
    const now = "2026-10-18T09:07:00-04:00";
    const bounds = slotBounds({
      now,
      deadline: "2026-10-30T09:07:00-04:00",
      slotMinutes: SLOT,
      maxHorizonDays: HORIZON_DAYS,
    });

    expect(bounds[0]?.start).toBe("2026-10-18T09:15:00-04:00");
    expect(bounds.at(-1)).toEqual({
      start: "2026-10-25T08:45:00-04:00",
      end: "2026-10-25T09:00:00-04:00",
    });
    expect(bounds).toHaveLength(671);

    const horizon = parseInstant(now) + HORIZON_DAYS * 24 * 60 * 60 * 1000;
    for (const slot of bounds) {
      expect(parseInstant(slot.end)).toBeLessThanOrEqual(horizon);
      expect(parseInstant(slot.end) - parseInstant(slot.start)).toBe(SLOT * 60_000);
    }
  });

  it("uses elapsed hours across the spring-forward change, not a local midnight", () => {
    const now = "2026-03-07T12:00:00-05:00";
    const bounds = slotBounds({
      now,
      deadline: "2026-03-10T00:00:00-04:00",
      slotMinutes: SLOT,
      maxHorizonDays: 1,
    });

    expect(bounds.at(-1)?.end).toBe("2026-03-08T13:00:00-04:00");
    expect(parseInstant(bounds.at(-1)!.end) - parseInstant(now)).toBe(
      24 * 60 * 60 * 1000,
    );
  });

  it("uses elapsed hours across the fall-back change", () => {
    const now = "2026-10-31T12:00:00-04:00";
    const bounds = slotBounds({
      now,
      deadline: "2026-11-03T00:00:00-05:00",
      slotMinutes: SLOT,
      maxHorizonDays: 1,
    });

    expect(bounds.at(-1)?.end).toBe("2026-11-01T11:00:00-05:00");
    expect(parseInstant(bounds.at(-1)!.end) - parseInstant(now)).toBe(
      24 * 60 * 60 * 1000,
    );
  });

  it("emits the real 15-minute slot that spans the missing spring hour", () => {
    expect(
      slotBounds({
        now: "2026-03-08T01:30:00-05:00",
        deadline: "2026-03-08T03:30:00-04:00",
        slotMinutes: SLOT,
        maxHorizonDays: HORIZON_DAYS,
      }),
    ).toEqual([
      { start: "2026-03-08T01:45:00-05:00", end: "2026-03-08T03:00:00-04:00" },
      { start: "2026-03-08T03:00:00-04:00", end: "2026-03-08T03:15:00-04:00" },
      { start: "2026-03-08T03:15:00-04:00", end: "2026-03-08T03:30:00-04:00" },
    ]);
  });

  it("keeps both fall-back 1:30 instants distinct", () => {
    const first = formatInstant(parseInstant("2026-11-01T01:30:00-04:00"));
    const second = formatInstant(parseInstant("2026-11-01T01:30:00-05:00"));
    expect(first).toBe("2026-11-01T01:30:00-04:00");
    expect(second).toBe("2026-11-01T01:30:00-05:00");
    expect(parseInstant(second) - parseInstant(first)).toBe(60 * 60 * 1000);

    expect(
      slotBounds({
        now: first,
        deadline: second,
        slotMinutes: SLOT,
        maxHorizonDays: HORIZON_DAYS,
      }),
    ).toEqual([
      { start: "2026-11-01T01:45:00-04:00", end: "2026-11-01T01:00:00-05:00" },
      { start: "2026-11-01T01:00:00-05:00", end: "2026-11-01T01:15:00-05:00" },
      { start: "2026-11-01T01:15:00-05:00", end: "2026-11-01T01:30:00-05:00" },
    ]);
  });

  it("does not mutate the input object", () => {
    const input = {
      now: "2026-10-18T09:00:00-04:00",
      deadline: "2026-10-18T10:00:00-04:00",
      slotMinutes: SLOT,
      maxHorizonDays: HORIZON_DAYS,
    };
    const snapshot = { ...input };
    slotBounds(input);
    expect(input).toEqual(snapshot);
  });

  it("throws on an invalid timestamp", () => {
    expect(() =>
      slotBounds({
        now: "2026-10-18T09:00:00",
        deadline: "2026-10-18T10:00:00-04:00",
        slotMinutes: SLOT,
        maxHorizonDays: HORIZON_DAYS,
      }),
    ).toThrow(InvalidInstantError);
  });
});
