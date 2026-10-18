import { describe, expect, it } from "vitest";
import { mockGrid } from "../../lib/mocks/grid";
import { mockScheduleResult } from "../../lib/mocks/schedule";
import { groupByLocalDay } from "./gridMath";
import { mockBusy } from "../../lib/mocks/busy";
import {
  awakeWindowFromBusy,
  desktopVisibleRows,
  drawnOptionsFromResult,
  formatOptionLabels,
  mobileVisibleRows,
  optionDisplayLabel,
  rowsInAwakeWindow,
  segmentStyle,
  segmentsForRange,
  shouldDrawOption,
} from "./overlays";

const TZ = "America/New_York";
const days = groupByLocalDay(mockGrid.forecast, TZ);

describe("segmentsForRange", () => {
  it("splits sleep that crosses midnight into two day columns", () => {
    expect(
      segmentsForRange(
        "2026-10-18T23:30:00-04:00",
        "2026-10-19T07:30:00-04:00",
        days,
      ),
    ).toEqual([
      { dayIndex: 0, startHour: 23.5, endHour: 24 },
      { dayIndex: 1, startHour: 0, endHour: 7.5 },
    ]);
  });

  it("keeps a same-day option on one column", () => {
    expect(
      segmentsForRange(
        "2026-10-18T13:00:00-04:00",
        "2026-10-18T14:00:00-04:00",
        days,
      ),
    ).toEqual([{ dayIndex: 0, startHour: 13, endHour: 14 }]);
  });

  it("maps a fractional soonest window", () => {
    expect(
      segmentsForRange(
        "2026-10-18T09:15:00-04:00",
        "2026-10-18T10:15:00-04:00",
        days,
      ),
    ).toEqual([{ dayIndex: 0, startHour: 9.25, endHour: 10.25 }]);
  });

  it("returns [] for a range entirely before the grid", () => {
    expect(
      segmentsForRange(
        "2026-10-17T08:00:00-04:00",
        "2026-10-17T10:00:00-04:00",
        days,
      ),
    ).toEqual([]);
  });

  it("returns [] for a range entirely after the last day", () => {
    expect(
      segmentsForRange(
        "2026-10-26T01:00:00-04:00",
        "2026-10-26T03:00:00-04:00",
        days,
      ),
    ).toEqual([]);
  });

  it("returns [] for a zero-duration range that only touches the last day end", () => {
    expect(
      segmentsForRange(
        "2026-10-26T00:00:00-04:00",
        "2026-10-26T00:00:00-04:00",
        days,
      ),
    ).toEqual([]);
  });

  it("returns [] for invalid or inverted ranges", () => {
    expect(segmentsForRange("nope", "2026-10-18T14:00:00-04:00", days)).toEqual(
      [],
    );
    expect(
      segmentsForRange(
        "2026-10-18T14:00:00-04:00",
        "2026-10-18T13:00:00-04:00",
        days,
      ),
    ).toEqual([]);
    expect(
      segmentsForRange(
        "2026-10-18T13:00:00-04:00",
        "2026-10-18T13:00:00-04:00",
        days,
      ),
    ).toEqual([]);
    expect(
      segmentsForRange(
        "2026-10-18T13:00:00-04:00",
        "2026-10-18T14:00:00-04:00",
        [],
      ),
    ).toEqual([]);
  });
});

describe("segmentStyle", () => {
  const sunday = days[0];
  const mobileSun = mobileVisibleRows(sunday);
  const desktopRows = desktopVisibleRows(24);

  it("uses Sunday's visible hours on mobile, not a 24-row column", () => {
    expect(mobileSun[0]).toBe(9);
    expect(mobileSun.at(-1)).toBe(23);
    expect(mobileSun).toHaveLength(15);
  });

  it("places a 23.5–24 sleep cap in the last half of the 11 PM mobile cell", () => {
    expect(
      segmentStyle(
        { dayIndex: 0, startHour: 23.5, endHour: 24 },
        mobileSun,
        44,
        1,
      ),
    ).toEqual({
      topPx: 14 * 45 + 22,
      heightPx: 22,
    });
  });

  it("places the same cap 23.5 hours down a desktop 24-row stack", () => {
    expect(
      segmentStyle(
        { dayIndex: 0, startHour: 23.5, endHour: 24 },
        desktopRows,
        28,
        1,
      ),
    ).toEqual({
      topPx: 23 * 29 + 14,
      heightPx: 14,
    });
  });

  it("maps a 1 PM–2 PM Sunday option onto the 1 PM mobile row", () => {
    expect(
      segmentStyle(
        { dayIndex: 0, startHour: 13, endHour: 14 },
        mobileSun,
        44,
        1,
      ),
    ).toEqual({
      topPx: 4 * 45,
      heightPx: 44,
    });
  });

  it("returns null when the segment misses every visible row", () => {
    expect(
      segmentStyle({ dayIndex: 0, startHour: 2, endHour: 4 }, mobileSun, 44, 1),
    ).toBeNull();
  });
});

describe("awake window", () => {
  it("derives 7:30 AM–11:30 PM from mock overnight sleep", () => {
    expect(awakeWindowFromBusy(mockBusy)).toEqual({
      startHour: 7.5,
      endHour: 23.5,
    });
    // Hours 7 AM–11 PM (row 23 covers 11:00–11:30 PM of the awake window)
    expect(rowsInAwakeWindow(7.5, 23.5, 24)).toEqual(
      Array.from({ length: 17 }, (_, i) => i + 7),
    );
  });

  it("returns null when there are no sleep blocks", () => {
    expect(awakeWindowFromBusy([])).toBeNull();
    expect(awakeWindowFromBusy(mockBusy.filter((b) => !b.asleep))).toBeNull();
  });
});

describe("option drawing", () => {
  it("draws recommended and greenest, and skips soonest, worst, and alternatives", () => {
    expect(shouldDrawOption({ labels: ["soonest"] })).toBe(false);
    expect(
      shouldDrawOption({ labels: ["recommended", "best", "greenest"] }),
    ).toBe(true);
    expect(shouldDrawOption({ labels: ["best", "greenest"] })).toBe(true);
    expect(shouldDrawOption({ labels: ["worst"] })).toBe(false);
    expect(shouldDrawOption({ labels: ["alternative"] })).toBe(false);
  });

  it("formats combined labels for the grid", () => {
    const labels = ["recommended", "best", "greenest"] as const;
    expect(formatOptionLabels([...labels])).toBe(
      "Recommended · Best · Greenest",
    );
    expect(optionDisplayLabel([...labels])).toBe(
      "Recommended · Best · Greenest",
    );
    expect(optionDisplayLabel(["soonest"])).toBe("Soonest");
  });

  it("flattens mock options to the windows we draw", () => {
    const drawn = drawnOptionsFromResult(mockScheduleResult);
    expect(
      drawn.map((d) => ({
        id: d.activityId,
        labels: d.option.labels,
        start: d.option.start,
      })),
    ).toEqual([
      {
        id: "washer",
        labels: ["recommended", "best", "greenest"],
        start: "2026-10-18T13:00:00-04:00",
      },
      {
        id: "dishwasher",
        labels: ["best", "greenest"],
        start: "2026-10-19T02:00:00-04:00",
      },
      {
        id: "dishwasher",
        labels: ["recommended"],
        start: "2026-10-21T02:00:00-04:00",
      },
    ]);
  });

  it("drops overnight Greenest when an awake window is provided", () => {
    const awake = awakeWindowFromBusy(mockBusy);
    const drawn = drawnOptionsFromResult(mockScheduleResult, awake, days);
    expect(
      drawn.map((d) => ({
        id: d.activityId,
        labels: d.option.labels,
        start: d.option.start,
      })),
    ).toEqual([
      {
        id: "washer",
        labels: ["recommended", "best", "greenest"],
        start: "2026-10-18T13:00:00-04:00",
      },
      {
        id: "dishwasher",
        labels: ["recommended"],
        start: "2026-10-21T02:00:00-04:00",
      },
    ]);
  });
});
