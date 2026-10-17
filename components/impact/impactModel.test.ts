import { describe, expect, it } from "vitest";
import { ACTIVITY_CATALOG, NEAR_TIE_MARGIN, SCORE_BANDS } from "../../lib/constants";
import { mockGrid } from "../../lib/mocks/grid";
import { mockScheduleResult } from "../../lib/mocks/schedule";
import type { RunRecord } from "../../lib/types";
import { chosenRecordPreview } from "../option-cards/optionCardModel";
import {
  bandForScore,
  formatMass,
  formatScore,
  impactTotals,
  modeledLabel,
  runScore,
  scoredRuns,
  sortRuns,
} from "./impactModel";
import {
  dishwasherRecommendedRun,
  evRun,
  kilogramFixture,
  mockRuns,
  washerRecommendedRun,
  washerWorstRun,
} from "./mockRuns";

function catalogKwh(id: "washer" | "ev"): number {
  const found = ACTIVITY_CATALOG.find((activity) => activity.id === id);
  if (!found) throw new Error(`catalog missing ${id}`);
  return found.defaultEnergyKwh;
}

function run(
  partial: Partial<RunRecord> & Pick<RunRecord, "id" | "chosenGrams" | "bestGrams" | "worstGrams">,
): RunRecord {
  return {
    owner: "guest",
    activityId: "washer",
    start: "2026-10-18T13:00:00-04:00",
    end: "2026-10-18T14:00:00-04:00",
    kwh: catalogKwh("washer"),
    soonestGrams: partial.soonestGrams ?? partial.chosenGrams,
    confidence: "pattern",
    forecastMadeAt: mockGrid.forecastMadeAt,
    status: "scheduled",
    createdAt: "2026-10-18T09:00:00-04:00",
    ...partial,
  };
}

function okWasher() {
  const result = mockScheduleResult.results.find((item) => item.activityId === "washer");
  if (!result || !result.ok) throw new Error("expected ok washer result");
  return result;
}

describe("runScore", () => {
  it("scores a near-tie of Best as 100", () => {
    const bestGrams = 100;
    const chosenGrams = bestGrams * (1 + NEAR_TIE_MARGIN);
    expect(chosenGrams).toBe(103);
    expect(runScore({ chosenGrams, bestGrams, worstGrams: 200 })).toBe(100);
  });

  it("scores 100 when worst is at or below best", () => {
    expect(runScore({ chosenGrams: 80, bestGrams: 100, worstGrams: 100 })).toBe(100);
    expect(runScore({ chosenGrams: 80, bestGrams: 100, worstGrams: 90 })).toBe(100);
  });

  it("floors at 0 and caps at 100", () => {
    expect(runScore({ chosenGrams: 300, bestGrams: 100, worstGrams: 200 })).toBe(0);
    expect(runScore({ chosenGrams: 50, bestGrams: 100, worstGrams: 200 })).toBe(100);
  });

  it("gives the washer Recommended mock a perfect score", () => {
    const washer = okWasher();
    const recommended = washer.options.find((option) => option.labels.includes("recommended"));
    if (!recommended) throw new Error("expected washer recommended");
    const record = chosenRecordPreview({
      activityId: "washer",
      option: recommended,
      reference: washer.reference,
      kwh: catalogKwh("washer"),
      forecastMadeAt: mockGrid.forecastMadeAt,
      createdAt: "2026-10-18T09:05:00-04:00",
    });
    expect(record.chosenGrams).toBe(washer.reference.bestGrams);
    expect(runScore(record)).toBe(100);
    expect(runScore(washerRecommendedRun)).toBe(100);
  });
});

describe("bandForScore", () => {
  it("uses each SCORE_BANDS boundary", () => {
    expect(bandForScore(95)).toBe("Top choice");
    expect(bandForScore(94)).toBe("Great");
    expect(bandForScore(75)).toBe("Great");
    expect(bandForScore(74)).toBe("OK");
    expect(bandForScore(50)).toBe("OK");
    expect(bandForScore(49)).toBe("Could be cleaner");
    expect(SCORE_BANDS.map((entry) => entry.band)).toEqual([
      "Top choice",
      "Great",
      "OK",
      "Could be cleaner",
    ]);
  });
});

describe("impactTotals", () => {
  it("preserves negative saved grams in the total", () => {
    const dirty = run({
      id: "dirty",
      chosenGrams: 200,
      bestGrams: 100,
      worstGrams: 200,
      soonestGrams: 150,
    });
    const clean = run({
      id: "clean",
      chosenGrams: 100,
      bestGrams: 100,
      worstGrams: 200,
      soonestGrams: 150,
    });
    expect(dirty.soonestGrams - dirty.chosenGrams).toBe(-50);
    expect(impactTotals([dirty, clean]).totalSavedGrams).toBe(0);
    expect(washerWorstRun.soonestGrams - washerWorstRun.chosenGrams).toBeLessThan(0);
    const fromMocks = impactTotals(mockRuns);
    const expectedSaved = mockRuns.reduce(
      (sum, item) => sum + (item.soonestGrams - item.chosenGrams),
      0,
    );
    expect(fromMocks.totalSavedGrams).toBe(expectedSaved);
  });

  it("weights the overall score by energy so an EV outweighs a washer", () => {
    const washer = run({
      id: "washer-perfect",
      activityId: "washer",
      kwh: catalogKwh("washer"),
      chosenGrams: 100,
      bestGrams: 100,
      worstGrams: 200,
      soonestGrams: 150,
    });
    const ev = run({
      id: "ev-worst",
      activityId: "ev",
      kwh: catalogKwh("ev"),
      chosenGrams: 200,
      bestGrams: 100,
      worstGrams: 200,
      soonestGrams: 150,
    });
    expect(washer.kwh).toBe(0.5);
    expect(ev.kwh).toBe(28.8);
    expect(runScore(washer)).toBe(100);
    expect(runScore(ev)).toBe(0);
    const overall = impactTotals([washer, ev]).overallScore;
    expect(overall).toBeCloseTo((100 * 0.5) / (0.5 + 28.8));
    expect(overall).toBeLessThan(10);
  });

  it("returns zeros on empty input without throwing", () => {
    const empty = impactTotals([]);
    expect(empty.overallScore).toBe(0);
    expect(empty.totalSavedGrams).toBe(0);
    expect(empty.totalModeledGrams).toBe(0);
    expect(empty.runCount).toBe(0);
    expect(empty.bandBreakdown).toEqual(
      Object.fromEntries(SCORE_BANDS.map(({ band }) => [band, 0])),
    );
  });
});

describe("formatMass, formatScore, modeledLabel", () => {
  it("switches to kilograms at 1000 g and keeps a minus sign", () => {
    expect(formatMass(999)).toBe("999 g");
    expect(formatMass(1000)).toBe("1.0 kg");
    expect(formatMass(-1500)).toBe("-1.5 kg");
    expect(formatMass(-33.099999999999994)).toBe("-33.1 g");
    expect(formatMass(kilogramFixture.chosenGrams)).toBe("1.5 kg");
    expect(formatMass(kilogramFixture.soonestGrams - kilogramFixture.chosenGrams)).toBe("1.5 kg");
  });

  it("shows scores as integers and labels modeled estimates once", () => {
    expect(formatScore(88.4)).toBe("88");
    expect(modeledLabel("420 g")).toBe("420 g (modeled estimate)");
    expect(modeledLabel("420 g (modeled estimate)")).toBe("420 g (modeled estimate)");
  });
});

describe("scoredRuns rank", () => {
  it("ranks a higher score first", () => {
    const high = run({
      id: "high",
      chosenGrams: 100,
      bestGrams: 100,
      worstGrams: 200,
      start: "2026-10-18T10:00:00-04:00",
    });
    const low = run({
      id: "low",
      chosenGrams: 200,
      bestGrams: 100,
      worstGrams: 200,
      start: "2026-10-20T10:00:00-04:00",
    });
    const rows = scoredRuns([low, high]);
    expect(rows.find((row) => row.run.id === "high")?.rank).toBe(1);
    expect(rows.find((row) => row.run.id === "low")?.rank).toBe(2);
  });

  it("breaks a score tie with the later start", () => {
    const earlier = run({
      id: "earlier",
      chosenGrams: 100,
      bestGrams: 100,
      worstGrams: 200,
      start: "2026-10-18T13:00:00-04:00",
      createdAt: "2026-10-18T12:00:00-04:00",
    });
    const later = run({
      id: "later",
      chosenGrams: 100,
      bestGrams: 100,
      worstGrams: 200,
      start: "2026-10-19T13:00:00-04:00",
      createdAt: "2026-10-18T09:00:00-04:00",
    });
    const rows = scoredRuns([earlier, later]);
    expect(rows.find((row) => row.run.id === "later")?.rank).toBe(1);
    expect(rows.find((row) => row.run.id === "earlier")?.rank).toBe(2);
  });
});

describe("sortRuns", () => {
  it("reorders mockRuns between most recent and most sustainable", () => {
    const rows = scoredRuns(mockRuns);
    const recent = sortRuns(rows, "recent").map((row) => row.run.id);
    const sustainable = sortRuns(rows, "sustainable").map((row) => row.run.id);

    expect(recent).toEqual([
      evRun.id,
      dishwasherRecommendedRun.id,
      washerWorstRun.id,
      washerRecommendedRun.id,
    ]);
    expect(sustainable).toEqual([
      dishwasherRecommendedRun.id,
      washerRecommendedRun.id,
      evRun.id,
      washerWorstRun.id,
    ]);
    expect(recent).not.toEqual(sustainable);
  });
});
