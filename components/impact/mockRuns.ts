import { ACTIVITY_CATALOG } from "../../lib/constants";
import { mockGrid } from "../../lib/mocks/grid";
import { mockScheduleResult } from "../../lib/mocks/schedule";
import type {
  ActivityId,
  ActivityResult,
  OptionLabel,
  RunRecord,
} from "../../lib/types";
import { chosenRecordPreview } from "../option-cards/optionCardModel";

function okResult(id: ActivityId): Extract<ActivityResult, { ok: true }> {
  const result = mockScheduleResult.results.find(
    (item) => item.activityId === id,
  );
  if (!result || !result.ok) throw new Error(`expected ok result for ${id}`);
  return result;
}

function optionWith(id: ActivityId, label: OptionLabel) {
  const found = okResult(id).options.find((option) =>
    option.labels.includes(label),
  );
  if (!found) throw new Error(`expected ${label} option for ${id}`);
  return found;
}

function catalogKwh(id: ActivityId): number {
  const found = ACTIVITY_CATALOG.find((activity) => activity.id === id);
  if (!found) throw new Error(`catalog missing ${id}`);
  return found.defaultEnergyKwh;
}

const washerResult = okResult("washer");
const dishwasherResult = okResult("dishwasher");

export const washerRecommendedRun: RunRecord = {
  ...chosenRecordPreview({
    activityId: "washer",
    option: optionWith("washer", "recommended"),
    reference: washerResult.reference,
    kwh: catalogKwh("washer"),
    forecastMadeAt: mockGrid.forecastMadeAt,
    createdAt: "2026-10-18T09:05:00-04:00",
  }),
  status: "done",
};

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
  reference: washerResult.reference,
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

export const mockRuns: RunRecord[] = [
  washerRecommendedRun,
  dishwasherRecommendedRun,
  washerWorstRun,
  evRun,
];

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
