import { ACTIVITY_CATALOG } from "../../lib/constants";
import { mockBusy } from "../../lib/mocks/busy";
import { MOCK_NOW, mockGrid } from "../../lib/mocks/grid";
import { mockScheduleResult } from "../../lib/mocks/schedule";
import { schedule } from "../../lib/scheduling/schedule";
import type {
  ActivityId,
  ActivityResult,
  OptionLabel,
  PlannedActivity,
  RunRecord,
  ScheduleOption,
} from "../../lib/types";
import { chosenRecordPreview } from "../option-cards/optionCardModel";

/** Demo deadline used with the calendar file / mockBusy student week. */
const DEMO_DEADLINE = "2026-10-22T21:00:00-04:00";
const DEMO_SEED = 42;

function catalogKwh(id: ActivityId): number {
  const found = ACTIVITY_CATALOG.find((activity) => activity.id === id);
  if (!found) throw new Error(`catalog missing ${id}`);
  return found.defaultEnergyKwh;
}

function planned(id: ActivityId, delayStart = false): PlannedActivity {
  const activity = ACTIVITY_CATALOG.find((entry) => entry.id === id);
  if (!activity) throw new Error(`catalog missing ${id}`);
  return {
    activity,
    durationMin: activity.defaultDurationMin,
    energyKwh: activity.defaultEnergyKwh,
    delayStart,
  };
}

function labeledOption(
  result: ActivityResult,
  label: OptionLabel,
): {
  option: ScheduleOption;
  reference: Extract<ActivityResult, { ok: true }>["reference"];
} {
  if (!result.ok) {
    throw new Error(
      `expected ok result for ${result.activityId}: ${result.reason}`,
    );
  }
  const option = result.options.find((entry) => entry.labels.includes(label));
  if (!option) {
    throw new Error(`expected ${label} option for ${result.activityId}`);
  }
  return { option, reference: result.reference };
}

function runFromLabel(
  activityId: ActivityId,
  result: ActivityResult,
  label: OptionLabel,
  createdAt: string,
): RunRecord {
  const { option, reference } = labeledOption(result, label);
  return {
    ...chosenRecordPreview({
      activityId,
      option,
      reference,
      kwh: catalogKwh(activityId),
      forecastMadeAt: mockGrid.forecastMadeAt,
      createdAt,
    }),
    status: "scheduled",
  };
}

function asFixed(
  activityId: ActivityId,
  option: ScheduleOption,
): {
  activityId: ActivityId;
  start: string;
  end: string;
  attendedMoments: ScheduleOption["attendedMoments"];
} {
  return {
    activityId,
    start: option.start,
    end: option.end,
    attendedMoments: option.attendedMoments,
  };
}

/**
 * Default Impact history: demo-calendar.ics busy times (via mockBusy) + sleep,
 * washer + dryer on Recommended, then EV on Soonest (Choose order).
 */
const washerResult = schedule({
  items: [planned("washer")],
  now: MOCK_NOW,
  deadline: DEMO_DEADLINE,
  busy: mockBusy,
  fixedRuns: [],
  forecast: mockGrid.forecast,
  diversitySeed: DEMO_SEED,
}).results[0];

const { option: washerRecommendedOption } = labeledOption(
  washerResult,
  "recommended",
);

export const washerRecommendedRun: RunRecord = runFromLabel(
  "washer",
  washerResult,
  "recommended",
  "2026-10-18T09:05:00-04:00",
);

const dryerResult = schedule({
  items: [planned("dryer")],
  now: MOCK_NOW,
  deadline: DEMO_DEADLINE,
  busy: mockBusy,
  fixedRuns: [asFixed("washer", washerRecommendedOption)],
  forecast: mockGrid.forecast,
  diversitySeed: DEMO_SEED,
}).results[0];

const { option: dryerRecommendedOption } = labeledOption(
  dryerResult,
  "recommended",
);

export const dryerRecommendedRun: RunRecord = runFromLabel(
  "dryer",
  dryerResult,
  "recommended",
  "2026-10-18T09:06:00-04:00",
);

const evResult = schedule({
  items: [planned("ev")],
  now: MOCK_NOW,
  deadline: DEMO_DEADLINE,
  busy: mockBusy,
  fixedRuns: [
    asFixed("washer", washerRecommendedOption),
    asFixed("dryer", dryerRecommendedOption),
  ],
  forecast: mockGrid.forecast,
  diversitySeed: DEMO_SEED,
}).results[0];

/** Demo path: user picked Soonest for EV charging. */
export const evSoonestRun: RunRecord = runFromLabel(
  "ev",
  evResult,
  "soonest",
  "2026-10-18T09:07:00-04:00",
);

/** Impact dashboard default list — the demo path above. */
export const mockRuns: RunRecord[] = [
  washerRecommendedRun,
  dryerRecommendedRun,
  evSoonestRun,
];

// --- Fixtures kept for unit tests / edge-case UI (not the Impact default) ---

function okHandPicked(id: ActivityId): Extract<ActivityResult, { ok: true }> {
  const result = mockScheduleResult.results.find(
    (item) => item.activityId === id,
  );
  if (!result || !result.ok) throw new Error(`expected ok result for ${id}`);
  return result;
}

function optionWith(id: ActivityId, label: OptionLabel) {
  const found = okHandPicked(id).options.find((option) =>
    option.labels.includes(label),
  );
  if (!found) throw new Error(`expected ${label} option for ${id}`);
  return found;
}

const dishwasherResult = okHandPicked("dishwasher");

export const dishwasherRecommendedRun: RunRecord = {
  ...chosenRecordPreview({
    activityId: "dishwasher",
    option: optionWith("dishwasher", "recommended"),
    reference: dishwasherResult.reference,
    kwh: catalogKwh("dishwasher"),
    forecastMadeAt: mockGrid.forecastMadeAt,
    createdAt: "2026-10-18T11:00:00-04:00",
  }),
  status: "scheduled",
};

/** Dirtier than Soonest so saved grams are negative. */
export const washerWorstRun: RunRecord = chosenRecordPreview({
  activityId: "washer",
  option: optionWith("washer", "worst"),
  reference: okHandPicked("washer").reference,
  kwh: catalogKwh("washer"),
  forecastMadeAt: mockGrid.forecastMadeAt,
  createdAt: "2026-10-18T10:00:00-04:00",
});

/** High-energy EV fixture so energy-weighted overall score and kg formatting have a real row. */
export const evRun: RunRecord = {
  id: "guest:ev:2026-10-22T01:00:00-04:00",
  owner: "guest",
  activityId: "ev",
  start: "2026-10-22T01:00:00-04:00",
  end: "2026-10-22T05:00:00-04:00",
  kwh: catalogKwh("ev"),
  chosenGrams: 6624,
  bestGrams: 6048,
  worstGrams: 10022,
  soonestGrams: 8640,
  confidence: "pattern",
  forecastMadeAt: mockGrid.forecastMadeAt,
  status: "scheduled",
  createdAt: "2026-10-17T20:00:00-04:00",
};

/** Not shown in the default list; chosen and |saved| are both ≥ 1000 g for formatMass. */
export const kilogramFixture: RunRecord = {
  id: "guest:ev:kilogram-fixture",
  owner: "guest",
  activityId: "ev",
  start: "2026-10-23T01:00:00-04:00",
  end: "2026-10-23T05:00:00-04:00",
  kwh: catalogKwh("ev"),
  chosenGrams: 1500,
  bestGrams: 1000,
  worstGrams: 2000,
  soonestGrams: 3000,
  confidence: "pattern",
  forecastMadeAt: mockGrid.forecastMadeAt,
  status: "scheduled",
  createdAt: "2026-10-18T12:00:00-04:00",
};
