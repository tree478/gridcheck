import {
  ALTERNATIVE_SPACING_MIN,
  CONFIDENCE_MARGIN,
  MAX_ALTERNATIVES,
  MAX_DELAY_START_HOURS,
  MAX_HORIZON_DAYS,
  NEAR_TIE_MARGIN,
  SLOT_MINUTES,
} from "../constants";
import type {
  ActivityId,
  ActivityResult,
  BusyBlock,
  OptionLabel,
  PlannedActivity,
  ScheduleOption,
  ScheduleRequest,
  ScheduleResult,
  Tier,
} from "../types";
import { modeledGrams } from "./emissions";
import { MissingHourIntensityError, slotsInWindow, type Slot } from "./slots";
import { addMinutes, parseInstant } from "./time";
import { checkValidity, type AttendedMoment, type CandidateRun } from "./validity";

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/** Higher is more trustworthy. Best walks from measured toward pattern. */
const TIER_RANK: Record<Tier, number> = {
  measured: 2,
  forecast: 1,
  pattern: 0,
};

const LABEL_ORDER: readonly OptionLabel[] = [
  "recommended",
  "best",
  "greenest",
  "soonest",
  "worst",
  "alternative",
];

type Chain = {
  start: string;
  end: string;
  intensities: number[];
  tiers: Tier[];
};

type ValidRun = {
  start: string;
  end: string;
  modeledGrams: number;
  confidence: Tier;
  attendedMoments: AttendedMoment[];
  loadAt?: string;
};

type Constraint = "deadline" | "busy time" | "sleep";

/**
 * Ranks a single activity (F8a). Zero items yield no results. More than one
 * item is refused without ranking the rest.
 */
export function schedule(req: ScheduleRequest): ScheduleResult {
  if (req.items.length === 0) return { results: [] };

  const item = req.items[0];
  if (req.items.length > 1) {
    return {
      results: [failure(item.activity.id, "Single-appliance scheduling only.")],
    };
  }

  try {
    return { results: [scheduleOne(req, item)] };
  } catch (error) {
    if (error instanceof MissingHourIntensityError) {
      return { results: [failure(item.activity.id, error.message)] };
    }
    throw error;
  }
}

function scheduleOne(req: ScheduleRequest, item: PlannedActivity): ActivityResult {
  const slotCount = wholeSlotCount(item.durationMin);
  if (slotCount === undefined) {
    return failure(
      item.activity.id,
      `Duration must be a positive whole number of ${SLOT_MINUTES}-minute slots.`,
    );
  }

  const attended = req.fixedRuns.flatMap((run) => run.attendedMoments);
  const deadlineSlots = slotsInWindow({
    now: req.now,
    deadline: req.deadline,
    hours: req.forecast,
  });
  const runs = collectRuns(
    deadlineSlots,
    slotCount,
    item,
    req.deadline,
    req.busy,
    attended,
  );
  if (runs.length > 0) return rank(item, runs, req.diversitySeed);

  const horizonEnd = addMinutes(req.now, MAX_HORIZON_DAYS * 24 * 60);
  const horizonSlots = slotsInWindow({
    now: req.now,
    deadline: horizonEnd,
    hours: req.forecast,
  });
  const horizonRuns = collectRuns(
    horizonSlots,
    slotCount,
    item,
    horizonEnd,
    req.busy,
    attended,
  );
  const deadlineMs = parseInstant(req.deadline);
  const suggestion = horizonRuns.find((run) => parseInstant(run.end) > deadlineMs);
  if (suggestion) {
    return failure(
      item.activity.id,
      "There is no valid window before the deadline.",
      `The earliest valid run starts at ${suggestion.start}.`,
    );
  }

  const constraint = blockingConstraint(
    horizonSlots,
    slotCount,
    item,
    horizonEnd,
    req.busy,
    attended,
  );
  return failure(
    item.activity.id,
    `There is no valid window before the deadline. The constraint is ${constraint}.`,
  );
}

function wholeSlotCount(durationMin: number): number | undefined {
  if (!Number.isFinite(durationMin)) return undefined;
  const count = durationMin / SLOT_MINUTES;
  if (!Number.isInteger(count) || count <= 0) return undefined;
  return count;
}

function collectRuns(
  slots: readonly Slot[],
  slotCount: number,
  item: PlannedActivity,
  deadline: string,
  busy: readonly BusyBlock[],
  attended: readonly AttendedMoment[],
): ValidRun[] {
  const runs: ValidRun[] = [];
  for (const chain of findChains(slots, slotCount, item.durationMin)) {
    const run = acceptChain(chain, slots, item, deadline, busy, attended);
    if (run) runs.push(run);
  }
  return runs;
}

function findChains(slots: readonly Slot[], slotCount: number, durationMin: number): Chain[] {
  const chains: Chain[] = [];
  for (let index = 0; index + slotCount <= slots.length; index += 1) {
    let contiguous = true;
    for (let offset = 0; offset < slotCount - 1; offset += 1) {
      if (slots[index + offset].end !== slots[index + offset + 1].start) {
        contiguous = false;
        break;
      }
    }
    if (!contiguous) continue;

    const start = slots[index].start;
    const end = slots[index + slotCount - 1].end;
    if (addMinutes(start, durationMin) !== end) continue;

    const window = slots.slice(index, index + slotCount);
    chains.push({
      start,
      end,
      intensities: window.map((slot) => slot.gco2PerKwh),
      tiers: window.map((slot) => slot.tier),
    });
  }
  return chains;
}

function acceptChain(
  chain: Chain,
  slots: readonly Slot[],
  item: PlannedActivity,
  deadline: string,
  busy: readonly BusyBlock[],
  attended: readonly AttendedMoment[],
): ValidRun | undefined {
  if (usesDelayStart(item)) {
    const loads = loadStarts(slots, chain.start);
    for (let index = loads.length - 1; index >= 0; index -= 1) {
      const result = checkValidity(
        candidate(item, chain.start, chain.end, loads[index]),
        deadline,
        busy,
        attended,
      );
      if (result.ok) return toValidRun(chain, result, item.energyKwh);
    }
    return undefined;
  }

  const result = checkValidity(candidate(item, chain.start, chain.end), deadline, busy, attended);
  if (!result.ok) return undefined;
  return toValidRun(chain, result, item.energyKwh);
}

function usesDelayStart(item: PlannedActivity): boolean {
  const attention = item.activity.attention;
  return (
    item.delayStart &&
    item.activity.supportsDelayStart &&
    (attention === "start" || attention === "startEnd")
  );
}

/** Slot starts strictly before the run and no earlier than MAX_DELAY_START_HOURS. */
function loadStarts(slots: readonly Slot[], runStart: string): string[] {
  const startMs = parseInstant(runStart);
  const earliest = startMs - MAX_DELAY_START_HOURS * MS_PER_HOUR;
  const starts: string[] = [];
  for (const slot of slots) {
    const ms = parseInstant(slot.start);
    if (ms >= earliest && ms < startMs) starts.push(slot.start);
  }
  return starts;
}

function candidate(item: PlannedActivity, start: string, end: string, loadAt?: string): CandidateRun {
  const run: CandidateRun = {
    start,
    end,
    attention: item.activity.attention,
    delayStart: item.delayStart,
    supportsDelayStart: item.activity.supportsDelayStart,
  };
  if (loadAt !== undefined) run.loadAt = loadAt;
  return run;
}

function toValidRun(
  chain: Chain,
  validity: { attendedMoments: AttendedMoment[]; loadAt?: string },
  energyKwh: number,
): ValidRun {
  const run: ValidRun = {
    start: chain.start,
    end: chain.end,
    modeledGrams: modeledGrams(chain.intensities, energyKwh),
    confidence: lowestTier(chain.tiers),
    attendedMoments: validity.attendedMoments,
  };
  if (validity.loadAt !== undefined) run.loadAt = validity.loadAt;
  return run;
}

function lowestTier(tiers: readonly Tier[]): Tier {
  let lowest = tiers[0];
  for (const tier of tiers) {
    if (TIER_RANK[tier] < TIER_RANK[lowest]) lowest = tier;
  }
  return lowest;
}

function rank(item: PlannedActivity, runs: readonly ValidRun[], seed: number): ActivityResult {
  const ordered = [...runs].sort((a, b) => parseInstant(a.start) - parseInstant(b.start));
  const soonest = ordered[0];
  let greenest = ordered[0];
  let worst = ordered[0];
  let best = ordered[0];
  for (let index = 1; index < ordered.length; index += 1) {
    const run = ordered[index];
    if (run.modeledGrams < greenest.modeledGrams) greenest = run;
    if (run.modeledGrams > worst.modeledGrams) worst = run;
    if (beatsBest(run, best)) best = run;
  }

  const near = nearTieRuns(ordered, best);
  const recommended = near[seedIndex(seed, near.length)];
  const labels = new Map<string, Set<OptionLabel>>();
  assign(labels, recommended, "recommended");
  assign(labels, best, "best");
  assign(labels, greenest, "greenest");
  assign(labels, soonest, "soonest");
  assign(labels, worst, "worst");
  assignAlternatives(ordered, labels);

  return {
    ok: true,
    activityId: item.activity.id,
    options: toOptions(ordered, labels, soonest.modeledGrams),
    reference: {
      bestGrams: best.modeledGrams,
      worstGrams: worst.modeledGrams,
      soonestGrams: soonest.modeledGrams,
      greenestGrams: greenest.modeledGrams,
    },
  };
}

/**
 * Later run replaces Best when it is more confident, when it is equally
 * confident and strictly cleaner, or when it is less confident and at least
 * CONFIDENCE_MARGIN cleaner. Equal grams at the same confidence keep the earlier run.
 */
function beatsBest(candidateRun: ValidRun, best: ValidRun): boolean {
  const candidateRank = TIER_RANK[candidateRun.confidence];
  const bestRank = TIER_RANK[best.confidence];
  if (candidateRank > bestRank) return true;
  if (candidateRank < bestRank) {
    return candidateRun.modeledGrams <= best.modeledGrams * (1 - CONFIDENCE_MARGIN);
  }
  return candidateRun.modeledGrams < best.modeledGrams;
}

function nearTieRuns(runs: readonly ValidRun[], best: ValidRun): ValidRun[] {
  const matched =
    best.modeledGrams === 0
      ? runs.filter((run) => run.modeledGrams === 0)
      : runs.filter((run) => run.modeledGrams <= best.modeledGrams * (1 + NEAR_TIE_MARGIN));
  return [...matched].sort((a, b) => parseInstant(a.start) - parseInstant(b.start));
}

function seedIndex(seed: number, length: number): number {
  const truncated = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  return ((truncated % length) + length) % length;
}

function assign(labels: Map<string, Set<OptionLabel>>, run: ValidRun, label: OptionLabel): void {
  const set = labels.get(run.start) ?? new Set<OptionLabel>();
  set.add(label);
  labels.set(run.start, set);
}

function assignAlternatives(runs: readonly ValidRun[], labels: Map<string, Set<OptionLabel>>): void {
  const taken = [...labels.keys()];
  let count = 0;
  for (const run of runs) {
    if (count >= MAX_ALTERNATIVES) return;
    if (labels.has(run.start)) continue;
    const spaced = taken.every(
      (start) => minutesApart(start, run.start) >= ALTERNATIVE_SPACING_MIN,
    );
    if (!spaced) continue;
    labels.set(run.start, new Set(["alternative"]));
    taken.push(run.start);
    count += 1;
  }
}

function minutesApart(a: string, b: string): number {
  return Math.abs(parseInstant(a) - parseInstant(b)) / MS_PER_MINUTE;
}

function toOptions(
  runs: readonly ValidRun[],
  labels: ReadonlyMap<string, ReadonlySet<OptionLabel>>,
  soonestGrams: number,
): ScheduleOption[] {
  const options: ScheduleOption[] = [];
  for (const run of runs) {
    const roles = labels.get(run.start);
    if (!roles) continue;
    options.push(
      toOption(
        run,
        LABEL_ORDER.filter((label) => roles.has(label)),
        soonestGrams,
      ),
    );
  }
  options.sort((a, b) => parseInstant(a.start) - parseInstant(b.start));
  return options;
}

function toOption(run: ValidRun, labels: OptionLabel[], soonestGrams: number): ScheduleOption {
  const savedVsSoonestGrams = soonestGrams - run.modeledGrams;
  const option: ScheduleOption = {
    labels,
    start: run.start,
    end: run.end,
    modeledGrams: run.modeledGrams,
    savedVsSoonestGrams,
    savedVsSoonestPct: soonestGrams === 0 ? 0 : (savedVsSoonestGrams / soonestGrams) * 100,
    confidence: run.confidence,
    attendedMoments: run.attendedMoments,
  };
  if (run.loadAt !== undefined) option.loadAt = run.loadAt;
  return option;
}

function blockingConstraint(
  slots: readonly Slot[],
  slotCount: number,
  item: PlannedActivity,
  horizonEnd: string,
  busy: readonly BusyBlock[],
  attended: readonly AttendedMoment[],
): Constraint {
  if (findChains(slots, slotCount, item.durationMin).length === 0) return "deadline";

  const withoutSleep = busy.filter((block) => !block.asleep);
  if (collectRuns(slots, slotCount, item, horizonEnd, withoutSleep, attended).length > 0) {
    return "sleep";
  }

  const withoutBusy = busy.filter((block) => block.asleep);
  if (collectRuns(slots, slotCount, item, horizonEnd, withoutBusy, attended).length > 0) {
    return "busy time";
  }

  // fixedRuns count as busy time only after removing sleep and busy still leaves no window.
  if (attended.length > 0) {
    const withoutEither = collectRuns(slots, slotCount, item, horizonEnd, [], attended);
    if (withoutEither.length === 0) {
      const withoutFixed = collectRuns(slots, slotCount, item, horizonEnd, [], []);
      if (withoutFixed.length > 0) return "busy time";
    }
  }

  return "deadline";
}

function failure(activityId: ActivityId, reason: string, suggestion?: string): ActivityResult {
  if (suggestion === undefined) return { ok: false, activityId, reason };
  return { ok: false, activityId, reason, suggestion };
}
