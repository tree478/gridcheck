import { describe, expect, it } from "vitest";
import { mockBusy } from "../mocks/busy";
import type { BusyBlock } from "../types";
import { createSchedule, demoSchedule, mergeBusy } from "./schedule";

const gym: BusyBlock = {
  start: "2026-10-19T16:00:00-04:00",
  end: "2026-10-19T17:00:00-04:00",
  asleep: false,
  title: "Gym",
};

describe("demoSchedule", () => {
  it("returns a deep copy of the student week", () => {
    const copy = demoSchedule();
    expect(copy).toEqual(mockBusy);
    expect(copy).not.toBe(mockBusy);
    expect(copy[0]).not.toBe(mockBusy[0]);

    expect(copy.filter((block) => block.asleep)).toHaveLength(7);
    expect(copy.some((block) => block.title === "Library desk shift")).toBe(true);
    expect(copy.some((block) => block.title === "Climate club meeting")).toBe(true);
    expect(
      copy.some(
        (block, index) =>
          index > 0 && Date.parse(copy[index - 1].end) < Date.parse(block.start),
      ),
    ).toBe(true);

    copy[0].title = "changed";
    expect(mockBusy[0].title).toBe("Sleep");
    expect(demoSchedule()[0].title).toBe("Sleep");
  });
});

describe("mergeBusy", () => {
  it("sorts valid blocks by start", () => {
    const early: BusyBlock = {
      start: "2026-10-19T08:00:00-04:00",
      end: "2026-10-19T09:00:00-04:00",
      asleep: false,
      title: "Early",
    };
    const mid: BusyBlock = {
      start: "2026-10-19T10:00:00-04:00",
      end: "2026-10-19T11:00:00-04:00",
      asleep: false,
      title: "Mid",
    };
    const late: BusyBlock = {
      start: "2026-10-19T12:00:00-04:00",
      end: "2026-10-19T13:00:00-04:00",
      asleep: true,
      title: "Late",
    };
    expect(mergeBusy([late, early, mid])).toEqual([early, mid, late]);
  });

  it("merges two overlapping asleep blocks into the outer span", () => {
    const first: BusyBlock = {
      start: "2026-10-19T23:30:00-04:00",
      end: "2026-10-20T07:30:00-04:00",
      asleep: true,
      title: "Sleep",
    };
    const second: BusyBlock = {
      start: "2026-10-20T06:00:00-04:00",
      end: "2026-10-20T08:30:00-04:00",
      asleep: true,
      title: "Nap",
    };
    expect(mergeBusy([second, first])).toEqual([
      {
        start: "2026-10-19T23:30:00-04:00",
        end: "2026-10-20T08:30:00-04:00",
        asleep: true,
      },
    ]);
  });

  it("makes a union awake when an asleep block overlaps an awake block", () => {
    const sleep: BusyBlock = {
      start: "2026-10-19T23:30:00-04:00",
      end: "2026-10-20T07:30:00-04:00",
      asleep: true,
      title: "Sleep",
    };
    const alarm: BusyBlock = {
      start: "2026-10-20T07:00:00-04:00",
      end: "2026-10-20T08:00:00-04:00",
      asleep: false,
      title: "Alarm",
    };
    expect(mergeBusy([sleep, alarm])).toEqual([
      {
        start: "2026-10-19T23:30:00-04:00",
        end: "2026-10-20T08:00:00-04:00",
        asleep: false,
      },
    ]);
  });

  it("merges two overlapping awake blocks into one awake block", () => {
    expect(
      mergeBusy([
        {
          start: "2026-10-19T10:00:00-04:00",
          end: "2026-10-19T12:00:00-04:00",
          asleep: false,
          title: "A",
        },
        {
          start: "2026-10-19T11:00:00-04:00",
          end: "2026-10-19T13:00:00-04:00",
          asleep: false,
          title: "B",
        },
      ]),
    ).toEqual([
      {
        start: "2026-10-19T10:00:00-04:00",
        end: "2026-10-19T13:00:00-04:00",
        asleep: false,
      },
    ]);
  });

  it("expands a contained block to the outer span and stays awake if either part is", () => {
    const outer: BusyBlock = {
      start: "2026-10-19T09:00:00-04:00",
      end: "2026-10-19T15:00:00-04:00",
      asleep: true,
      title: "Long",
    };
    const inner: BusyBlock = {
      start: "2026-10-19T10:00:00-04:00",
      end: "2026-10-19T11:00:00-04:00",
      asleep: false,
      title: "Class",
    };
    expect(mergeBusy([inner, outer])).toEqual([
      {
        start: "2026-10-19T09:00:00-04:00",
        end: "2026-10-19T15:00:00-04:00",
        asleep: false,
      },
    ]);
  });

  it("keeps blocks that only touch at an endpoint", () => {
    const left: BusyBlock = {
      start: "2026-10-19T10:00:00-04:00",
      end: "2026-10-19T11:00:00-04:00",
      asleep: false,
      title: "Left",
    };
    const right: BusyBlock = {
      start: "2026-10-19T11:00:00-04:00",
      end: "2026-10-19T12:00:00-04:00",
      asleep: true,
      title: "Right",
    };
    expect(mergeBusy([right, left])).toEqual([left, right]);
  });

  it("merges an overlap chain even when the ends do not overlap", () => {
    const a: BusyBlock = {
      start: "2026-10-19T08:00:00-04:00",
      end: "2026-10-19T10:00:00-04:00",
      asleep: true,
      title: "A",
    };
    const b: BusyBlock = {
      start: "2026-10-19T09:30:00-04:00",
      end: "2026-10-19T11:00:00-04:00",
      asleep: true,
      title: "B",
    };
    const c: BusyBlock = {
      start: "2026-10-19T10:30:00-04:00",
      end: "2026-10-19T12:00:00-04:00",
      asleep: true,
      title: "C",
    };
    const aOverlapsC =
      Date.parse(a.start) < Date.parse(c.end) && Date.parse(c.start) < Date.parse(a.end);
    expect(aOverlapsC).toBe(false);
    expect(mergeBusy([c, a, b])).toEqual([
      {
        start: "2026-10-19T08:00:00-04:00",
        end: "2026-10-19T12:00:00-04:00",
        asleep: true,
      },
    ]);
  });

  it("drops the title on a union and keeps it on an unmerged block", () => {
    const left: BusyBlock = {
      start: "2026-10-19T08:00:00-04:00",
      end: "2026-10-19T10:00:00-04:00",
      asleep: false,
      title: "Left",
    };
    const overlap: BusyBlock = {
      start: "2026-10-19T09:00:00-04:00",
      end: "2026-10-19T11:00:00-04:00",
      asleep: false,
      title: "Overlap",
    };
    const kept: BusyBlock = {
      start: "2026-10-19T12:00:00-04:00",
      end: "2026-10-19T13:00:00-04:00",
      asleep: false,
      title: "Kept",
    };
    const result = mergeBusy([kept, overlap, left]);
    expect(result).toEqual([
      {
        start: "2026-10-19T08:00:00-04:00",
        end: "2026-10-19T11:00:00-04:00",
        asleep: false,
      },
      kept,
    ]);
    expect(result[0]).not.toHaveProperty("title");
    expect(result[1].title).toBe("Kept");
  });

  it("drops an element that is not a valid block", () => {
    const invalid = { start: "nope", end: "also", asleep: false } as BusyBlock;
    expect(() => mergeBusy([invalid, gym, null as unknown as BusyBlock])).not.toThrow();
    expect(mergeBusy([invalid, gym, null as unknown as BusyBlock])).toEqual([gym]);
  });
});

describe("createSchedule", () => {
  it("merges an added overlap into the demo week and restores it on remove", () => {
    const lectureStart = "2026-10-19T10:10:00-04:00";
    const manualEnd = "2026-10-19T12:00:00-04:00";
    const schedule = createSchedule();
    expect(
      schedule.add({
        start: "2026-10-19T10:30:00-04:00",
        end: manualEnd,
        asleep: false,
        title: "Review",
      }),
    ).toBe(true);

    const listed = schedule.list();
    expect(listed.find((block) => block.start === lectureStart)).toEqual({
      start: lectureStart,
      end: manualEnd,
      asleep: false,
    });
    expect(listed).toHaveLength(mockBusy.length);

    expect(schedule.remove(0)).toBe(true);
    expect(schedule.list()).toEqual(demoSchedule());
  });

  it("rejects remove when there are no manual blocks", () => {
    const schedule = createSchedule();
    expect(schedule.remove(-1)).toBe(false);
    expect(schedule.remove(0)).toBe(false);
    expect(schedule.list()).toEqual(demoSchedule());
  });

  it("rejects a block whose end is not after its start", () => {
    const schedule = createSchedule();
    const before = schedule.list();
    expect(
      schedule.add({
        start: "2026-10-19T12:00:00-04:00",
        end: "2026-10-19T12:00:00-04:00",
        asleep: false,
      }),
    ).toBe(false);
    expect(
      schedule.add({
        start: "2026-10-19T13:00:00-04:00",
        end: "2026-10-19T12:00:00-04:00",
        asleep: true,
      }),
    ).toBe(false);
    expect(schedule.list()).toEqual(before);
    expect(schedule.list()).toEqual(demoSchedule());
  });

  it("copies blocks on add and on list", () => {
    const schedule = createSchedule();
    const block: BusyBlock = { ...gym };
    expect(schedule.add(block)).toBe(true);
    block.title = "mutated argument";
    block.end = "2026-10-19T18:00:00-04:00";

    const listed = schedule.list();
    const shown = listed.find((item) => item.title === "Gym");
    expect(shown).toEqual(gym);
    shown!.title = "mutated result";

    expect(schedule.list().find((item) => item.start === gym.start)).toEqual(gym);
  });

  it("skips an invalid initial block and keeps a valid one", () => {
    const schedule = createSchedule([
      { start: "bad", end: "worse", asleep: true } as BusyBlock,
      gym,
    ]);
    const listed = schedule.list();
    expect(listed.some((block) => block.title === "Gym")).toBe(true);
    expect(listed.some((block) => block.start === "bad")).toBe(false);
    expect(listed).toHaveLength(mockBusy.length + 1);
  });
});
