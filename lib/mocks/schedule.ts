import { ACTIVITY_CATALOG, ATTENTION_MINUTES, SLOT_MINUTES } from "../constants";
import type {
  Activity,
  ActivityId,
  OptionLabel,
  PlannedActivity,
  ScheduleOption,
  ScheduleRequest,
  ScheduleResult,
} from "../types";
import { mockBusy } from "./busy";
import { MOCK_NOW, mockGrid, toEdtIso } from "./grid";

// MOCK DATA: the PRD §4 demo (washer + dishwasher with delay-start, deadline Thu 9 PM)
// against mockGrid and mockBusy. Times were picked by hand so attended moments avoid
// busy blocks and loading never happens while asleep. Grams are computed from mockGrid
// so they stay consistent with it. This is NOT the real scheduler (lib/scheduling/, T-C4).

const MIN_MS = 60 * 1000;
const HOUR_MS = 60 * MIN_MS;
const NOW_MS = Date.parse(MOCK_NOW);

function activity(id: ActivityId): Activity {
  const found = ACTIVITY_CATALOG.find((a) => a.id === id);
  if (!found) throw new Error(`No catalog entry for ${id}`);
  return found;
}

function planned(id: ActivityId, delayStart: boolean): PlannedActivity {
  const a = activity(id);
  return { activity: a, durationMin: a.defaultDurationMin, energyKwh: a.defaultEnergyKwh, delayStart };
}

const washer = planned("washer", false);
const dishwasher = planned("dishwasher", true);

export const mockScheduleRequest: ScheduleRequest = {
  items: [washer, dishwasher],
  now: MOCK_NOW,
  deadline: "2026-10-22T21:00:00-04:00",
  busy: mockBusy,
  fixedRuns: [],
  forecast: mockGrid.forecast,
  diversitySeed: 42,
};

const round1 = (n: number) => Math.round(n * 10) / 10;

// Σ over 15-min slots of (hour intensity × kWh per slot).
function runGrams(item: PlannedActivity, startMs: number): number {
  const slots = item.durationMin / SLOT_MINUTES;
  const kwhPerSlot = item.energyKwh / slots;
  let grams = 0;
  for (let i = 0; i < slots; i++) {
    const hourIndex = Math.floor((startMs + i * SLOT_MINUTES * MIN_MS - NOW_MS) / HOUR_MS);
    grams += mockGrid.forecast[hourIndex].gco2PerKwh * kwhPerSlot;
  }
  return round1(grams);
}

function moment(ms: number) {
  return { start: toEdtIso(ms), end: toEdtIso(ms + ATTENTION_MINUTES * MIN_MS) };
}

function option(
  item: PlannedActivity,
  labels: OptionLabel[],
  start: string,
  soonestGrams: number,
  loadAt?: string,
): ScheduleOption {
  const startMs = Date.parse(start);
  const endMs = startMs + item.durationMin * MIN_MS;
  const modeledGrams = runGrams(item, startMs);
  const saved = round1(soonestGrams - modeledGrams);
  const attendedMoments = [moment(loadAt ? Date.parse(loadAt) : startMs)];
  if (item.activity.attention === "startEnd") attendedMoments.push(moment(endMs));
  return {
    labels,
    start: toEdtIso(startMs),
    end: toEdtIso(endMs),
    ...(loadAt ? { loadAt } : {}),
    modeledGrams,
    savedVsSoonestGrams: saved,
    savedVsSoonestPct: round1((saved / soonestGrams) * 100),
    confidence: "pattern",
    attendedMoments,
  };
}

const washerSoonest = runGrams(washer, Date.parse("2026-10-18T09:15:00-04:00"));
const washerOptions = [
  option(washer, ["soonest"], "2026-10-18T09:15:00-04:00", washerSoonest),
  option(washer, ["recommended", "best", "greenest"], "2026-10-18T13:00:00-04:00", washerSoonest),
  option(washer, ["alternative"], "2026-10-19T13:00:00-04:00", washerSoonest),
  option(washer, ["alternative"], "2026-10-21T12:00:00-04:00", washerSoonest),
  option(washer, ["worst"], "2026-10-19T18:00:00-04:00", washerSoonest),
];

// Mon–Wed nights tie at 02:00–04:00; Recommended is the seeded pick among the tie.
const dishSoonest = runGrams(dishwasher, Date.parse("2026-10-18T09:15:00-04:00"));
const dishOptions = [
  option(dishwasher, ["soonest"], "2026-10-18T09:15:00-04:00", dishSoonest),
  option(dishwasher, ["best", "greenest"], "2026-10-19T02:00:00-04:00", dishSoonest, "2026-10-18T22:00:00-04:00"),
  option(dishwasher, ["recommended"], "2026-10-21T02:00:00-04:00", dishSoonest, "2026-10-20T22:00:00-04:00"),
  option(dishwasher, ["worst"], "2026-10-19T18:00:00-04:00", dishSoonest),
];

function reference(options: ScheduleOption[]) {
  const grams = (label: OptionLabel) => options.find((o) => o.labels.includes(label))!.modeledGrams;
  return {
    bestGrams: grams("best"),
    worstGrams: grams("worst"),
    soonestGrams: grams("soonest"),
    greenestGrams: grams("greenest"),
  };
}

export const mockScheduleResult: ScheduleResult = {
  results: [
    { ok: true, activityId: "washer", options: washerOptions, reference: reference(washerOptions) },
    { ok: true, activityId: "dishwasher", options: dishOptions, reference: reference(dishOptions) },
  ],
};

export const mockNoWindowResult: ScheduleResult = {
  results: [
    {
      ok: false,
      activityId: "ev",
      reason: "No free 10-minute moment before your deadline.",
      suggestion: "The nearest valid run starts Fri Oct 23 at 7:30 AM. Move your deadline later to include it.",
    },
  ],
};
