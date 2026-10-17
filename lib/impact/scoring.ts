import { NEAR_TIE_MARGIN, SCORE_BANDS } from "../constants";
import type { RunRecord, ScoreBand } from "../types";

export type RunScore = {
  score: number;
  band: ScoreBand;
  savedGrams: number;
};

export type ScoredRun = RunScore & {
  record: RunRecord;
  rank: number;
};

export type ScoreSummary = {
  runs: ScoredRun[];
  overallScore: number | null;
  overallBand: ScoreBand | null;
  totalSavedGrams: number;
  totalModeledGrams: number;
  counts: { total: number; scheduled: number; done: number };
  bandBreakdown: Record<ScoreBand, number>;
};

function bandFor(score: number): ScoreBand {
  for (const entry of SCORE_BANDS) {
    if (score >= entry.min) return entry.band;
  }
  return "Could be cleaner";
}

function withinNearTie(chosenGrams: number, bestGrams: number): boolean {
  if (bestGrams === 0) return chosenGrams === 0;
  return chosenGrams <= bestGrams * (1 + NEAR_TIE_MARGIN);
}

function clampScore(score: number): number {
  if (!Number.isFinite(score) || score < 0) return 0;
  if (score > 100) return 100;
  return score;
}

/**
 * Planning-time score for one stored run.
 * Near-tie matches Recommended in lib/scheduling/schedule.ts.
 */
export function scoreRun(record: RunRecord): RunScore {
  const { chosenGrams, bestGrams, worstGrams, soonestGrams } = record;
  const savedGrams =
    Number.isFinite(soonestGrams) && Number.isFinite(chosenGrams) ? soonestGrams - chosenGrams : 0;

  if (!Number.isFinite(chosenGrams) || !Number.isFinite(bestGrams) || !Number.isFinite(worstGrams)) {
    return { score: 0, band: bandFor(0), savedGrams };
  }
  if (worstGrams <= bestGrams || withinNearTie(chosenGrams, bestGrams)) {
    return { score: 100, band: bandFor(100), savedGrams };
  }

  const score = clampScore(((worstGrams - chosenGrams) / (worstGrams - bestGrams)) * 100);
  return { score, band: bandFor(score), savedGrams };
}

function compareInstantDesc(left: string, right: string): number {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  const leftOk = !Number.isNaN(leftTime);
  const rightOk = !Number.isNaN(rightTime);
  if (leftOk && rightOk) {
    if (leftTime === rightTime) return 0;
    return leftTime > rightTime ? -1 : 1;
  }
  if (leftOk) return -1;
  if (rightOk) return 1;
  return 0;
}

function compareByRecency(left: RunRecord, right: RunRecord): number {
  const byStart = compareInstantDesc(left.start, right.start);
  if (byStart !== 0) return byStart;
  const byCreated = compareInstantDesc(left.createdAt, right.createdAt);
  if (byCreated !== 0) return byCreated;
  return right.id.localeCompare(left.id);
}

function emptyBandBreakdown(): Record<ScoreBand, number> {
  const breakdown = {} as Record<ScoreBand, number>;
  for (const entry of SCORE_BANDS) breakdown[entry.band] = 0;
  return breakdown;
}

function addFinite(total: number, value: number): number {
  return Number.isFinite(value) ? total + value : total;
}

export function summarizeRuns(records: readonly RunRecord[]): ScoreSummary {
  const bandBreakdown = emptyBandBreakdown();
  const scored = records.map((record) => ({ record, ...scoreRun(record) }));
  scored.sort((left, right) => {
    if (left.score !== right.score) return right.score - left.score;
    return compareByRecency(left.record, right.record);
  });

  let weight = 0;
  let weighted = 0;
  let totalSavedGrams = 0;
  let totalModeledGrams = 0;
  let scheduled = 0;
  let done = 0;

  const runs: ScoredRun[] = scored.map((entry, index) => {
    bandBreakdown[entry.band] += 1;
    totalSavedGrams = addFinite(totalSavedGrams, entry.savedGrams);
    totalModeledGrams = addFinite(totalModeledGrams, entry.record.chosenGrams);
    if (Number.isFinite(entry.record.kwh) && entry.record.kwh > 0) {
      weight += entry.record.kwh;
      weighted += entry.score * entry.record.kwh;
    }
    if (entry.record.status === "done") done += 1;
    else scheduled += 1;
    return { ...entry, rank: index + 1 };
  });

  const overallScore = weight === 0 ? null : weighted / weight;
  return {
    runs,
    overallScore,
    overallBand: overallScore === null ? null : bandFor(overallScore),
    totalSavedGrams,
    totalModeledGrams,
    counts: { total: records.length, scheduled, done },
    bandBreakdown,
  };
}
