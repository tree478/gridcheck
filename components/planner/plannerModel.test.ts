import { describe, expect, it } from "vitest";
import {
  ACTIVITY_CATALOG,
  MAX_HORIZON_DAYS,
  SLOT_MINUTES,
} from "../../lib/constants";
import { mockBusy } from "../../lib/mocks/busy";
import { MOCK_NOW, mockGrid } from "../../lib/mocks/grid";
import { mockScheduleRequest } from "../../lib/mocks/schedule";
import {
  DAY_MS,
  buildScheduleRequest,
  busyBlocksToForm,
  defaultDeadlineLocal,
  defaultFormState,
  errorKey,
  formatLocal,
  isoToLocal,
  localToIso,
  localToMs,
  maxDeadlineIso,
  msToIso,
  parseLocalInput,
  validatePlanner,
  type PlannerFormState,
} from "./plannerModel";

const TZ = "America/New_York";

/** The PRD §4 demo: washer + dishwasher (delay-start on), demo schedule, Thursday 9 PM. */
function demoState(): PlannerFormState {
  const state = defaultFormState(MOCK_NOW, TZ);
  for (const a of state.activities) {
    if (a.activity.id === "washer") a.selected = true;
    if (a.activity.id === "dishwasher") {
      a.selected = true;
      a.delayStart = true;
    }
  }
  state.busy = busyBlocksToForm(mockBusy, "demo", TZ);
  state.deadlineLocal = "2026-10-22T21:00";
  return state;
}

const ctx = {
  now: MOCK_NOW,
  forecast: mockGrid.forecast,
  diversitySeed: mockScheduleRequest.diversitySeed,
  timeZone: TZ,
};

describe("defaultFormState", () => {
  it("pre-fills every catalog activity with its defaults, unselected and without delay-start", () => {
    const state = defaultFormState(MOCK_NOW, TZ);
    expect(state.activities.map((a) => a.activity.id)).toEqual(
      ACTIVITY_CATALOG.map((a) => a.id),
    );
    for (const a of state.activities) {
      expect(a.activity).toBe(
        ACTIVITY_CATALOG.find((c) => c.id === a.activity.id),
      );
      expect(a.selected).toBe(false);
      expect(a.delayStart).toBe(false);
      expect(a.durationMin).toBe(String(a.activity.defaultDurationMin));
      expect(a.energyKwh).toBe(String(a.activity.defaultEnergyKwh));
    }
    expect(state.busy).toEqual([]);
  });

  it("defaults the deadline to the next Thursday at 9 PM New York time", () => {
    expect(defaultDeadlineLocal(MOCK_NOW, TZ)).toBe("2026-10-22T21:00"); // demo day is Sunday Oct 18
    expect(defaultDeadlineLocal("2026-10-22T20:00:00-04:00", TZ)).toBe(
      "2026-10-22T21:00",
    );
    expect(defaultDeadlineLocal("2026-10-22T22:00:00-04:00", TZ)).toBe(
      "2026-10-29T21:00",
    );
    expect(defaultDeadlineLocal("garbage", TZ)).toBe("");
  });
});

describe("time conversion (New York wall time, never the machine zone)", () => {
  it("converts an EDT and an EST wall time to ISO with the right offset", () => {
    expect(localToIso("2026-10-22T21:00", TZ)).toBe(
      "2026-10-22T21:00:00-04:00",
    );
    expect(localToIso("2026-12-01T08:15", TZ)).toBe(
      "2026-12-01T08:15:00-05:00",
    );
  });

  it("round-trips ISO → local → ISO", () => {
    for (const iso of [
      "2026-10-18T23:30:00-04:00",
      "2026-11-15T07:30:00-05:00",
      "2026-10-19T00:00:00-04:00",
    ]) {
      const local = isoToLocal(iso, TZ);
      expect(local).not.toBeNull();
      expect(localToIso(local as string, TZ)).toBe(iso);
    }
    // A UTC input lands on the New York calendar day, not the UTC one.
    expect(isoToLocal("2026-10-19T03:30:00Z", TZ)).toBe("2026-10-18T23:30");
  });

  it("picks the earlier (EDT) instant in the fall-back overlap on Nov 1, 2026", () => {
    expect(localToIso("2026-11-01T01:30", TZ)).toBe(
      "2026-11-01T01:30:00-04:00",
    );
    expect(localToMs("2026-11-01T01:30", TZ)).toBe(
      Date.UTC(2026, 10, 1, 5, 30),
    );
    // Just after the overlap is EST.
    expect(localToIso("2026-11-01T02:00", TZ)).toBe(
      "2026-11-01T02:00:00-05:00",
    );
  });

  it("shifts forward through the spring-forward gap on Mar 8, 2026", () => {
    // 2:30 AM never happens; the first real instant is 3:30 AM EDT.
    expect(localToIso("2026-03-08T02:30", TZ)).toBe(
      "2026-03-08T03:30:00-04:00",
    );
    expect(localToIso("2026-03-08T01:59", TZ)).toBe(
      "2026-03-08T01:59:00-05:00",
    );
    expect(localToIso("2026-03-08T03:00", TZ)).toBe(
      "2026-03-08T03:00:00-04:00",
    );
  });

  it("rejects malformed and impossible inputs instead of throwing", () => {
    expect(parseLocalInput("2026-02-30T10:00")).toBeNull();
    expect(parseLocalInput("2026-10-18T24:00")).toBeNull();
    expect(parseLocalInput("not a time")).toBeNull();
    expect(localToIso("", TZ)).toBeNull();
    expect(localToIso("2026-13-01T00:00", TZ)).toBeNull();
    expect(isoToLocal("nope", TZ)).toBeNull();
    expect(formatLocal("nope", TZ)).toBe("");
  });

  it("formats offsets and human labels from the zone, not the host", () => {
    expect(msToIso(Date.UTC(2026, 9, 18, 13), TZ)).toBe(
      "2026-10-18T09:00:00-04:00",
    );
    expect(msToIso(Date.UTC(2026, 9, 18, 13), "Asia/Kolkata")).toBe(
      "2026-10-18T18:30:00+05:30",
    );
    expect(formatLocal("2026-10-22T21:00:00-04:00", TZ)).toBe(
      "Thu, Oct 22, 9:00 PM EDT",
    );
    expect(maxDeadlineIso(MOCK_NOW, TZ)).toBe("2026-10-25T09:00:00-04:00");
  });
});

describe("validatePlanner", () => {
  it("passes the demo state", () => {
    expect(validatePlanner(demoState(), MOCK_NOW, TZ)).toEqual({});
  });

  it("requires at least one activity", () => {
    const state = demoState();
    for (const a of state.activities) a.selected = false;
    expect(validatePlanner(state, MOCK_NOW, TZ)).toHaveProperty(
      errorKey.activities,
    );
  });

  it("rejects non-positive, non-numeric, and off-slot durations and energy", () => {
    const state = demoState();
    const washer = state.activities.find((a) => a.activity.id === "washer")!;
    const dish = state.activities.find((a) => a.activity.id === "dishwasher")!;
    washer.durationMin = "0";
    washer.energyKwh = "-1";
    dish.durationMin = String(SLOT_MINUTES + 1);
    dish.energyKwh = "abc";
    const errors = validatePlanner(state, MOCK_NOW, TZ);
    expect(errors[errorKey.duration("washer")]).toMatch(String(SLOT_MINUTES));
    expect(errors[errorKey.energy("washer")]).toBeTruthy();
    expect(errors[errorKey.duration("dishwasher")]).toBeTruthy();
    expect(errors[errorKey.energy("dishwasher")]).toBeTruthy();

    dish.durationMin = "";
    dish.energyKwh = "";
    expect(Object.keys(validatePlanner(state, MOCK_NOW, TZ))).toContain(
      errorKey.duration("dishwasher"),
    );
  });

  it("ignores duration and energy on activities that are not selected", () => {
    const state = demoState();
    const dryer = state.activities.find((a) => a.activity.id === "dryer")!;
    dryer.durationMin = "nope";
    expect(validatePlanner(state, MOCK_NOW, TZ)).toEqual({});
  });

  it("checks deadline bounds: missing, past, now, exactly 7 days, beyond", () => {
    const state = demoState();
    const maxMs = Date.parse(MOCK_NOW) + MAX_HORIZON_DAYS * DAY_MS;

    state.deadlineLocal = "";
    expect(validatePlanner(state, MOCK_NOW, TZ)[errorKey.deadline]).toBe(
      "Choose a deadline.",
    );

    state.deadlineLocal = "2026-10-17T09:00";
    expect(validatePlanner(state, MOCK_NOW, TZ)[errorKey.deadline]).toMatch(
      /after now/,
    );

    state.deadlineLocal = isoToLocal(MOCK_NOW, TZ) as string;
    expect(validatePlanner(state, MOCK_NOW, TZ)[errorKey.deadline]).toMatch(
      /after now/,
    );

    state.deadlineLocal = isoToLocal(msToIso(maxMs, TZ), TZ) as string; // exactly 7 days: allowed
    expect(validatePlanner(state, MOCK_NOW, TZ)).toEqual({});

    state.deadlineLocal = isoToLocal(msToIso(maxMs + 60_000, TZ), TZ) as string;
    expect(validatePlanner(state, MOCK_NOW, TZ)[errorKey.deadline]).toMatch(
      new RegExp(`${MAX_HORIZON_DAYS} days`),
    );

    state.deadlineLocal = "2026-02-30T10:00";
    expect(validatePlanner(state, MOCK_NOW, TZ)[errorKey.deadline]).toMatch(
      /couldn't be read/,
    );
  });

  it("flags a busy block whose end is not after its start, and empty times", () => {
    const state = demoState();
    state.busy = [
      {
        key: "a",
        startLocal: "2026-10-19T10:00",
        endLocal: "2026-10-19T10:00",
        asleep: false,
      },
      {
        key: "b",
        startLocal: "2026-10-19T12:00",
        endLocal: "2026-10-19T11:00",
        asleep: true,
      },
      { key: "c", startLocal: "", endLocal: "2026-10-19T11:00", asleep: false },
      { key: "d", startLocal: "2026-10-19T10:00", endLocal: "", asleep: false },
    ];
    const errors = validatePlanner(state, MOCK_NOW, TZ);
    expect(errors[errorKey.busyEnd("a")]).toMatch(/after the start/);
    expect(errors[errorKey.busyEnd("b")]).toMatch(/after the start/);
    expect(errors[errorKey.busyStart("c")]).toBe("Enter a start time.");
    expect(errors[errorKey.busyEnd("d")]).toBe("Enter an end time.");
    expect(errors).not.toHaveProperty(errorKey.busyStart("a"));
  });

  it("does not throw when now is unreadable", () => {
    expect(
      validatePlanner(demoState(), "garbage", TZ)[errorKey.deadline],
    ).toBeTruthy();
  });
});

describe("buildScheduleRequest", () => {
  it("builds the PRD demo request equal to mockScheduleRequest", () => {
    const result = buildScheduleRequest(demoState(), ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request).toEqual(mockScheduleRequest);
    expect(result.request.items[0].activity).toBe(
      ACTIVITY_CATALOG.find((a) => a.id === "washer"),
    );
    expect(result.request.busy).toEqual(mockBusy);
  });

  it("forces delayStart to false where the appliance does not support it", () => {
    const state = demoState();
    const dryer = state.activities.find((a) => a.activity.id === "dryer")!;
    dryer.selected = true;
    dryer.delayStart = true;
    const result = buildScheduleRequest(state, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const built = result.request.items.find((i) => i.activity.id === "dryer")!;
    expect(built.delayStart).toBe(false);
    expect(
      result.request.items.find((i) => i.activity.id === "dishwasher")!
        .delayStart,
    ).toBe(true);
  });

  it("uses the edited numbers and converts times as New York wall time", () => {
    const state = demoState();
    const washer = state.activities.find((a) => a.activity.id === "washer")!;
    washer.durationMin = " 45 ";
    washer.energyKwh = "0.75";
    state.busy = [
      {
        key: "m",
        startLocal: "2026-10-20T09:00",
        endLocal: "2026-10-20T10:30",
        asleep: true,
      },
    ];
    const result = buildScheduleRequest(state, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.items[0]).toMatchObject({
      durationMin: 45,
      energyKwh: 0.75,
    });
    expect(result.request.busy).toEqual([
      {
        start: "2026-10-20T09:00:00-04:00",
        end: "2026-10-20T10:30:00-04:00",
        asleep: true,
      },
    ]);
    expect(result.request.fixedRuns).toEqual([]);
    expect(result.request.forecast).toBe(mockGrid.forecast);
  });

  it("returns the errors instead of a request when invalid", () => {
    const state = demoState();
    state.deadlineLocal = "";
    const result = buildScheduleRequest(state, ctx);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[errorKey.deadline]).toBe("Choose a deadline.");
  });
});
