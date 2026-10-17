import { describe, expect, it } from "vitest";
import type { BusyBlock } from "../types";
import { checkValidity, type CandidateRun } from "./validity";

function at(day: number, hours: number, minutes = 0): string {
  const dd = String(day).padStart(2, "0");
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return `2026-10-${dd}T${hh}:${mm}:00-04:00`;
}

function run(overrides: Partial<CandidateRun> & Pick<CandidateRun, "start" | "end" | "attention">): CandidateRun {
  return {
    delayStart: false,
    supportsDelayStart: false,
    ...overrides,
  };
}

function block(start: string, end: string, asleep: boolean): BusyBlock {
  return { start, end, asleep };
}

const DEADLINE = at(19, 21);

describe("checkValidity", () => {
  it("rejects a run whose end is not after its start", () => {
    const result = checkValidity(
      run({ start: at(18, 10), end: at(18, 10), attention: "start" }),
      DEADLINE,
      [],
      [],
    );
    expect(result).toEqual({ ok: false, reason: "The run end must be after its start." });
  });

  it("rejects a start attention moment that overlaps a busy block", () => {
    const result = checkValidity(
      run({ start: at(18, 9), end: at(18, 10), attention: "start" }),
      DEADLINE,
      [block(at(18, 9), at(18, 9, 5), false)],
      [],
    );
    expect(result).toEqual({
      ok: false,
      reason: "An attended moment overlaps a busy block.",
    });
  });

  it("rejects a startEnd end moment that overlaps a busy block", () => {
    const result = checkValidity(
      run({ start: at(18, 9), end: at(18, 10), attention: "startEnd" }),
      DEADLINE,
      [block(at(18, 10), at(18, 10, 5), false)],
      [],
    );
    expect(result).toEqual({
      ok: false,
      reason: "An attended moment overlaps a busy block.",
    });
  });

  it("does not treat the last 10 minutes of a startEnd run as the end attention window", () => {
    const result = checkValidity(
      run({ start: at(18, 9), end: at(18, 10), attention: "startEnd" }),
      DEADLINE,
      [block(at(18, 9, 50), at(18, 10), false)],
      [],
    );
    expect(result).toEqual({
      ok: true,
      attendedMoments: [
        { start: at(18, 9), end: at(18, 9, 10) },
        { start: at(18, 10), end: at(18, 10, 10) },
      ],
    });
  });

  it("allows a busy block that only touches an attended boundary", () => {
    const result = checkValidity(
      run({ start: at(18, 9), end: at(18, 10), attention: "start" }),
      DEADLINE,
      [block(at(18, 9, 10), at(18, 9, 30), false)],
      [],
    );
    expect(result).toEqual({
      ok: true,
      attendedMoments: [{ start: at(18, 9), end: at(18, 9, 10) }],
    });
  });

  it("allows a busy block in the unattended middle", () => {
    const result = checkValidity(
      run({ start: at(18, 9), end: at(18, 10), attention: "start" }),
      DEADLINE,
      [block(at(18, 9, 30), at(18, 9, 45), false)],
      [],
    );
    expect(result).toEqual({
      ok: true,
      attendedMoments: [{ start: at(18, 9), end: at(18, 9, 10) }],
    });
  });

  it("allows a sleep block in the unattended middle", () => {
    const result = checkValidity(
      run({ start: at(18, 9), end: at(18, 10), attention: "startEnd" }),
      DEADLINE,
      [block(at(18, 9, 30), at(18, 9, 45), true)],
      [],
    );
    expect(result).toEqual({
      ok: true,
      attendedMoments: [
        { start: at(18, 9), end: at(18, 9, 10) },
        { start: at(18, 10), end: at(18, 10, 10) },
      ],
    });
  });

  it("rejects a throughout run whose middle overlaps a busy block", () => {
    const result = checkValidity(
      run({ start: at(18, 9), end: at(18, 10), attention: "throughout" }),
      DEADLINE,
      [block(at(18, 9, 30), at(18, 9, 40), false)],
      [],
    );
    expect(result).toEqual({
      ok: false,
      reason: "An attended moment overlaps a busy block.",
    });
  });

  it("rejects delay-start when attention is needed throughout", () => {
    const result = checkValidity(
      run({
        start: at(18, 9),
        end: at(18, 10),
        attention: "throughout",
        delayStart: true,
        supportsDelayStart: true,
        loadAt: at(18, 8),
      }),
      DEADLINE,
      [],
      [],
    );
    expect(result).toEqual({
      ok: false,
      reason: "Delay-start does not apply when attention is needed throughout the run.",
    });
  });

  it("rejects delay-start when the activity does not support it", () => {
    const result = checkValidity(
      run({
        start: at(18, 22),
        end: at(18, 23),
        attention: "start",
        delayStart: true,
        supportsDelayStart: false,
        loadAt: at(18, 20),
      }),
      DEADLINE,
      [],
      [],
    );
    expect(result).toEqual({
      ok: false,
      reason: "Delay-start is on, but this activity does not support it.",
    });
  });

  it("rejects delay-start loading during sleep", () => {
    const result = checkValidity(
      run({
        start: at(18, 23),
        end: at(19, 1),
        attention: "start",
        delayStart: true,
        supportsDelayStart: true,
        loadAt: at(18, 21),
      }),
      DEADLINE,
      [block(at(18, 20), at(18, 22), true)],
      [],
    );
    expect(result).toEqual({ ok: false, reason: "An attended moment overlaps sleep." });
  });

  it("rejects delay-start loading during ordinary busy time", () => {
    const result = checkValidity(
      run({
        start: at(18, 22),
        end: at(18, 23),
        attention: "start",
        delayStart: true,
        supportsDelayStart: true,
        loadAt: at(18, 18),
      }),
      DEADLINE,
      [block(at(18, 17), at(18, 19), false)],
      [],
    );
    expect(result).toEqual({
      ok: false,
      reason: "An attended moment overlaps a busy block.",
    });
  });

  it("accepts a free non-asleep load while the machine start is busy", () => {
    const loadAt = at(18, 18);
    const result = checkValidity(
      run({
        start: at(18, 22),
        end: at(19, 0),
        attention: "start",
        delayStart: true,
        supportsDelayStart: true,
        loadAt,
      }),
      DEADLINE,
      [block(at(18, 21), at(18, 22, 30), false)],
      [],
    );
    expect(result).toEqual({
      ok: true,
      loadAt,
      attendedMoments: [{ start: loadAt, end: at(18, 18, 10) }],
    });
  });

  it("rejects a load earlier than 24 hours and accepts a load exactly 24 hours before start", () => {
    const start = at(18, 22);
    const end = at(18, 23);
    const tooEarly = checkValidity(
      run({
        start,
        end,
        attention: "start",
        delayStart: true,
        supportsDelayStart: true,
        loadAt: at(17, 21, 59),
      }),
      DEADLINE,
      [],
      [],
    );
    expect(tooEarly).toEqual({
      ok: false,
      reason: "Delay-start load time is more than 24 hours before the run starts.",
    });

    const loadAt = at(17, 22);
    const exact = checkValidity(
      run({
        start,
        end,
        attention: "startEnd",
        delayStart: true,
        supportsDelayStart: true,
        loadAt,
      }),
      DEADLINE,
      [],
      [],
    );
    expect(exact).toEqual({
      ok: true,
      loadAt,
      attendedMoments: [
        { start: loadAt, end: at(17, 22, 10) },
        { start: end, end: at(18, 23, 10) },
      ],
    });
  });

  it("rejects a run that ends after the deadline and accepts an end equal to the deadline", () => {
    const start = at(18, 9);
    const end = at(18, 10);
    const late = checkValidity(
      run({ start, end, attention: "start" }),
      at(18, 9, 59),
      [],
      [],
    );
    expect(late).toEqual({ ok: false, reason: "The run ends after the deadline." });

    const onTime = checkValidity(
      run({ start, end, attention: "startEnd" }),
      end,
      [],
      [],
    );
    expect(onTime).toEqual({
      ok: true,
      attendedMoments: [
        { start, end: at(18, 9, 10) },
        { start: end, end: at(18, 10, 10) },
      ],
    });
  });

  it("accepts attended moments exactly 15 minutes apart and rejects a gap one minute closer", () => {
    const candidate = run({ start: at(18, 10), end: at(18, 11), attention: "start" });
    const exact = checkValidity(
      candidate,
      DEADLINE,
      [],
      [{ start: at(18, 10, 25), end: at(18, 10, 35) }],
    );
    expect(exact).toEqual({
      ok: true,
      attendedMoments: [{ start: at(18, 10), end: at(18, 10, 10) }],
    });

    const closer = checkValidity(
      candidate,
      DEADLINE,
      [],
      [{ start: at(18, 10, 24), end: at(18, 10, 34) }],
    );
    expect(closer).toEqual({
      ok: false,
      reason: "Attended moments must be at least 15 minutes apart.",
    });
  });

  it("allows another activity's attended moment during this run's unattended time", () => {
    const result = checkValidity(
      run({ start: at(18, 10), end: at(18, 12), attention: "start" }),
      DEADLINE,
      [],
      [{ start: at(18, 11), end: at(18, 11, 10) }],
    );
    expect(result.ok).toBe(true);
  });
});
