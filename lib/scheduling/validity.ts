import {
  ATTENDED_GAP_MINUTES,
  ATTENTION_MINUTES,
  MAX_DELAY_START_HOURS,
} from "../constants";
import type { AttentionType, BusyBlock, PlannedActivity } from "../types";
import { addMinutes, parseInstant } from "./time";

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

export type AttendedMoment = { start: string; end: string };

/**
 * One candidate run. `delayStart` matches {@link PlannedActivity.delayStart}.
 * `supportsDelayStart` matches `PlannedActivity["activity"]["supportsDelayStart"]`.
 * Duration and energy are not part of this check.
 */
export type CandidateRun = {
  start: string;
  end: string;
  attention: AttentionType;
  delayStart: PlannedActivity["delayStart"];
  supportsDelayStart: PlannedActivity["activity"]["supportsDelayStart"];
  loadAt?: string;
};

export type ValidityResult =
  | { ok: true; attendedMoments: AttendedMoment[]; loadAt?: string }
  | { ok: false; reason: string };

/**
 * Judges one candidate. It does not search the horizon or suggest another window.
 * Intervals are half-open: [start, end) overlaps another when each starts before
 * the other ends. A shared boundary does not overlap.
 * A startEnd end moment is [end, end + ATTENTION_MINUTES), after the run finishes.
 */
export function checkValidity(
  run: CandidateRun,
  deadline: string,
  busy: readonly BusyBlock[],
  otherAttended: readonly AttendedMoment[],
): ValidityResult {
  const startMs = parseInstant(run.start);
  const endMs = parseInstant(run.end);

  if (endMs <= startMs) {
    return reject("The run end must be after its start.");
  }
  if (endMs > parseInstant(deadline)) {
    return reject("The run ends after the deadline.");
  }
  if (run.attention === "throughout" && run.delayStart) {
    return reject("Delay-start does not apply when attention is needed throughout the run.");
  }
  if (run.delayStart && !run.supportsDelayStart) {
    return reject("Delay-start is on, but this activity does not support it.");
  }

  const placed = placeAttendedMoments(run, startMs);
  if (!placed.ok) return placed;

  const blocked = blockedMoment(placed.attendedMoments, busy);
  if (blocked) return blocked;

  const crowded = crowdedMoment(placed.attendedMoments, otherAttended);
  if (crowded) return crowded;

  if (placed.loadAt !== undefined) {
    return { ok: true, attendedMoments: placed.attendedMoments, loadAt: placed.loadAt };
  }
  return { ok: true, attendedMoments: placed.attendedMoments };
}

function reject(reason: string): ValidityResult {
  return { ok: false, reason };
}

type Placed =
  | { ok: true; attendedMoments: AttendedMoment[]; loadAt?: string }
  | { ok: false; reason: string };

function placeAttendedMoments(run: CandidateRun, startMs: number): Placed {
  if (run.attention === "throughout") {
    return { ok: true, attendedMoments: [{ start: run.start, end: run.end }] };
  }

  if (run.delayStart) {
    if (run.loadAt === undefined) {
      return reject("Delay-start needs a load time.");
    }
    const loadMs = parseInstant(run.loadAt);
    if (loadMs >= startMs) {
      return reject("Delay-start load time must be before the run starts.");
    }
    const earliest = startMs - MAX_DELAY_START_HOURS * MS_PER_HOUR;
    if (loadMs < earliest) {
      return reject(
        `Delay-start load time is more than ${MAX_DELAY_START_HOURS} hours before the run starts.`,
      );
    }
    return {
      ok: true,
      loadAt: run.loadAt,
      attendedMoments: moments(run.attention, run.loadAt, run.end),
    };
  }

  return { ok: true, attendedMoments: moments(run.attention, run.start, run.end) };
}

function moments(attention: "start" | "startEnd", anchor: string, end: string): AttendedMoment[] {
  const startMoment = attentionMoment(anchor);
  if (attention === "start") return [startMoment];
  return [startMoment, attentionMoment(end)];
}

function attentionMoment(start: string): AttendedMoment {
  return { start, end: addMinutes(start, ATTENTION_MINUTES) };
}

function blockedMoment(
  attended: readonly AttendedMoment[],
  busy: readonly BusyBlock[],
): ValidityResult | undefined {
  for (const moment of attended) {
    const momentStart = parseInstant(moment.start);
    const momentEnd = parseInstant(moment.end);
    for (const block of busy) {
      if (
        overlaps(
          momentStart,
          momentEnd,
          parseInstant(block.start),
          parseInstant(block.end),
        )
      ) {
        return reject(
          block.asleep
            ? "An attended moment overlaps sleep."
            : "An attended moment overlaps a busy block.",
        );
      }
    }
  }
  return undefined;
}

function crowdedMoment(
  attended: readonly AttendedMoment[],
  otherAttended: readonly AttendedMoment[],
): ValidityResult | undefined {
  for (const moment of attended) {
    for (const other of otherAttended) {
      const gap = gapMs(
        parseInstant(moment.start),
        parseInstant(moment.end),
        parseInstant(other.start),
        parseInstant(other.end),
      );
      if (gap < ATTENDED_GAP_MINUTES * MS_PER_MINUTE) {
        return reject(
          `Attended moments must be at least ${ATTENDED_GAP_MINUTES} minutes apart.`,
        );
      }
    }
  }
  return undefined;
}

/** Negative when the half-open intervals overlap. Touching yields 0. */
function gapMs(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  if (aEnd <= bStart) return bStart - aEnd;
  if (bEnd <= aStart) return aStart - bEnd;
  return -1;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}
