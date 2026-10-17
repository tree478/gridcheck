import { describe, expect, it } from "vitest";
import type { RunRecord } from "../types";
import { scoreRun, summarizeRuns } from "./scoring";

function record(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    id: "run-1",
    owner: "guest",
    activityId: "washer",
    start: "2026-10-18T14:00:00.000Z",
    end: "2026-10-18T15:00:00.000Z",
    kwh: 0.5,
    chosenGrams: 100,
    bestGrams: 100,
    worstGrams: 200,
    soonestGrams: 120,
    confidence: "pattern",
    forecastMadeAt: "2026-10-17T12:00:00.000Z",
    status: "scheduled",
    createdAt: "2026-10-17T20:00:00.000Z",
    ...overrides,
  };
}

describe("scoreRun", () => {
  it("scores a chosen window equal to Best as 100", () => {
    const scored = scoreRun(record({ bestGrams: 100, worstGrams: 200, chosenGrams: 100 }));
    expect(scored.score).toBe(100);
    expect(scored.band).toBe("Top choice");
  });

  it("uses the spread formula between Best and Worst", () => {
    expect(scoreRun(record({ bestGrams: 100, worstGrams: 200, chosenGrams: 150 }))).toMatchObject({
      score: 50,
      band: "OK",
    });
    expect(scoreRun(record({ bestGrams: 100, worstGrams: 200, chosenGrams: 125 }))).toMatchObject({
      score: 75,
      band: "Great",
    });
    expect(scoreRun(record({ bestGrams: 100, worstGrams: 200, chosenGrams: 105 }))).toMatchObject({
      score: 95,
      band: "Top choice",
    });
  });

  it("scores a near-tie with Best as 100 and leaves the next gram on the formula", () => {
    expect(scoreRun(record({ bestGrams: 100, worstGrams: 200, chosenGrams: 103 })).score).toBe(100);
    expect(scoreRun(record({ bestGrams: 100, worstGrams: 200, chosenGrams: 103.1 }))).toMatchObject({
      score: 96.9,
      band: "Top choice",
    });
  });

  it("treats a zero Best as a near tie only when chosen is also zero", () => {
    expect(scoreRun(record({ bestGrams: 0, worstGrams: 100, chosenGrams: 0 })).score).toBe(100);
    expect(scoreRun(record({ bestGrams: 0, worstGrams: 100, chosenGrams: 10 }))).toMatchObject({
      score: 90,
      band: "Great",
    });
  });

  it("floors a choice worse than Worst at 0", () => {
    expect(scoreRun(record({ bestGrams: 100, worstGrams: 200, chosenGrams: 250 }))).toMatchObject({
      score: 0,
      band: "Could be cleaner",
    });
  });

  it("scores 100 when Worst has no spread above Best", () => {
    expect(scoreRun(record({ bestGrams: 100, worstGrams: 100, chosenGrams: 100 })).score).toBe(100);
    expect(scoreRun(record({ bestGrams: 150, worstGrams: 100, chosenGrams: 120 })).score).toBe(100);
  });

  it("places band edges on the SCORE_BANDS minimums", () => {
    const edges: { chosenGrams: number; score: number; band: string }[] = [
      { chosenGrams: 5, score: 95, band: "Top choice" },
      { chosenGrams: 5.1, score: 94.9, band: "Great" },
      { chosenGrams: 25, score: 75, band: "Great" },
      { chosenGrams: 25.1, score: 74.9, band: "OK" },
      { chosenGrams: 50, score: 50, band: "OK" },
      { chosenGrams: 50.1, score: 49.9, band: "Could be cleaner" },
    ];
    for (const edge of edges) {
      expect(scoreRun(record({ bestGrams: 0, worstGrams: 100, chosenGrams: edge.chosenGrams }))).toMatchObject({
        score: edge.score,
        band: edge.band,
      });
    }
  });

  it("saves Soonest minus chosen, including a negative", () => {
    expect(scoreRun(record({ soonestGrams: 80, chosenGrams: 50 })).savedGrams).toBe(30);
    expect(scoreRun(record({ soonestGrams: 40, chosenGrams: 70 })).savedGrams).toBe(-30);

    const summary = summarizeRuns([
      record({ id: "cleaner", soonestGrams: 80, chosenGrams: 50 }),
      record({ id: "sooner", soonestGrams: 40, chosenGrams: 70 }),
    ]);
    expect(summary.totalSavedGrams).toBe(0);
  });

  it("scores non-finite grams as 0 without throwing", () => {
    expect(scoreRun(record({ chosenGrams: Number.NaN })).score).toBe(0);
    expect(scoreRun(record({ bestGrams: Number.POSITIVE_INFINITY })).score).toBe(0);
    expect(scoreRun(record({ worstGrams: Number.NEGATIVE_INFINITY })).score).toBe(0);
  });
});

describe("summarizeRuns", () => {
  it("weights the overall score by kWh and sums saved grams, negatives included", () => {
    const summary = summarizeRuns([
      record({
        id: "clean",
        kwh: 1,
        bestGrams: 100,
        worstGrams: 200,
        chosenGrams: 100,
        soonestGrams: 80,
      }),
      record({
        id: "mid",
        kwh: 3,
        bestGrams: 100,
        worstGrams: 200,
        chosenGrams: 150,
        soonestGrams: 40,
        status: "done",
      }),
    ]);

    expect(summary.overallScore).toBe(62.5);
    expect(summary.overallBand).toBe("OK");
    expect(summary.totalSavedGrams).toBe(-130);
    expect(summary.totalModeledGrams).toBe(250);
    expect(summary.counts).toEqual({ total: 2, scheduled: 1, done: 1 });
    expect(summary.bandBreakdown).toEqual({
      "Top choice": 1,
      Great: 0,
      OK: 1,
      "Could be cleaner": 0,
    });
  });

  it("ranks a higher score first and breaks equal scores toward the later start", () => {
    const summary = summarizeRuns([
      record({
        id: "earlier",
        start: "2026-10-18T12:00:00.000Z",
        bestGrams: 0,
        worstGrams: 100,
        chosenGrams: 20,
      }),
      record({
        id: "later",
        start: "2026-10-18T18:00:00.000Z",
        bestGrams: 0,
        worstGrams: 100,
        chosenGrams: 20,
      }),
      record({
        id: "best",
        start: "2026-10-18T10:00:00.000Z",
        bestGrams: 0,
        worstGrams: 100,
        chosenGrams: 0,
      }),
    ]);

    expect(summary.runs.map((run) => ({ id: run.record.id, rank: run.rank, score: run.score }))).toEqual([
      { id: "best", rank: 1, score: 100 },
      { id: "later", rank: 2, score: 80 },
      { id: "earlier", rank: 3, score: 80 },
    ]);
  });

  it("returns an empty summary when there are no runs", () => {
    expect(summarizeRuns([])).toEqual({
      runs: [],
      overallScore: null,
      overallBand: null,
      totalSavedGrams: 0,
      totalModeledGrams: 0,
      counts: { total: 0, scheduled: 0, done: 0 },
      bandBreakdown: {
        "Top choice": 0,
        Great: 0,
        OK: 0,
        "Could be cleaner": 0,
      },
    });
  });

  it("keeps per-run scores when no run has positive kWh", () => {
    const summary = summarizeRuns([
      record({ id: "zero", kwh: 0, bestGrams: 100, worstGrams: 200, chosenGrams: 100 }),
      record({ id: "negative", kwh: -1, bestGrams: 100, worstGrams: 200, chosenGrams: 150 }),
    ]);

    expect(summary.overallScore).toBeNull();
    expect(summary.overallBand).toBeNull();
    expect(summary.runs.map((run) => run.score)).toEqual([100, 50]);
    expect(summary.counts.total).toBe(2);
  });
});
