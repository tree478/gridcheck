// Display-only scoring until T-I3 wires T-C9. Formula is PRD F15 — do not "fix" it.
// Relative imports so Vitest resolves without a path alias.
import { NEAR_TIE_MARGIN, SCORE_BANDS, TIMEZONE } from "../../lib/constants";
import type { RunRecord, ScoreBand } from "../../lib/types";

export type SortMode = "recent" | "sustainable";

export type ScoredRun = {
  run: RunRecord;
  score: number;
  band: ScoreBand;
  rank: number;
  savedGrams: number;
};

export type ImpactTotals = {
  overallScore: number;
  overallBand: ScoreBand;
  totalSavedGrams: number;
  totalModeledGrams: number;
  runCount: number;
  bandBreakdown: Record<ScoreBand, number>;
};

export function runScore(run: Pick<RunRecord, "chosenGrams" | "bestGrams" | "worstGrams">): number {
  const { chosenGrams, bestGrams, worstGrams } = run;
  if (worstGrams <= bestGrams) return 100;
  // Same 3% relative margin C4 uses for Recommended near-ties (PRD F15 / NEAR_TIE_MARGIN).
  if (chosenGrams <= bestGrams * (1 + NEAR_TIE_MARGIN)) return 100;
  const raw = ((worstGrams - chosenGrams) / (worstGrams - bestGrams)) * 100;
  return Math.min(100, Math.max(0, raw));
}

export function bandForScore(score: number): ScoreBand {
  for (const entry of SCORE_BANDS) {
    if (score >= entry.min) return entry.band;
  }
  return SCORE_BANDS[SCORE_BANDS.length - 1]!.band;
}

export function scoredRuns(runs: RunRecord[]): ScoredRun[] {
  const rows: ScoredRun[] = runs.map((run) => ({
    run,
    score: runScore(run),
    band: bandForScore(runScore(run)),
    rank: 0,
    savedGrams: run.soonestGrams - run.chosenGrams,
  }));

  const ranked = [...rows].sort(compareSustainable);
  const rankById = new Map(ranked.map((row, index) => [row.run.id, index + 1]));
  return rows.map((row) => ({ ...row, rank: rankById.get(row.run.id) ?? 0 }));
}

export function sortRuns(rows: ScoredRun[], mode: SortMode): ScoredRun[] {
  const copy = [...rows];
  if (mode === "recent") {
    copy.sort(compareRecent);
  } else {
    copy.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.run.start !== b.run.start) return a.run.start < b.run.start ? 1 : -1;
      return 0;
    });
  }
  return copy;
}

export function impactTotals(runs: RunRecord[]): ImpactTotals {
  const rows = scoredRuns(runs);
  const totalKwh = runs.reduce((sum, run) => sum + run.kwh, 0);
  const overallScore =
    totalKwh === 0 ? 0 : rows.reduce((sum, row) => sum + row.score * row.run.kwh, 0) / totalKwh;

  return {
    overallScore,
    overallBand: bandForScore(overallScore),
    totalSavedGrams: runs.reduce((sum, run) => sum + (run.soonestGrams - run.chosenGrams), 0),
    totalModeledGrams: runs.reduce((sum, run) => sum + run.chosenGrams, 0),
    runCount: runs.length,
    bandBreakdown: bandBreakdown(rows),
  };
}

export function formatMass(grams: number): string {
  if (Math.abs(grams) >= 1000) {
    return `${(grams / 1000).toFixed(1)} kg`;
  }
  const rounded = Math.round(grams * 10) / 10;
  return `${rounded} g`;
}

export function formatScore(score: number): string {
  return String(Math.round(score));
}

export function modeledLabel(text: string): string {
  return text.includes("modeled estimate") ? text : `${text} (modeled estimate)`;
}

export function formatRunDate(iso: string, timeZone: string = TIMEZONE): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function emptyBreakdown(): Record<ScoreBand, number> {
  const breakdown = {} as Record<ScoreBand, number>;
  for (const { band } of SCORE_BANDS) {
    breakdown[band] = 0;
  }
  return breakdown;
}

function bandBreakdown(rows: ScoredRun[]): Record<ScoreBand, number> {
  const breakdown = emptyBreakdown();
  for (const row of rows) {
    breakdown[row.band] += 1;
  }
  return breakdown;
}

function compareSustainable(a: ScoredRun, b: ScoredRun): number {
  if (a.score !== b.score) return b.score - a.score;
  if (a.run.start !== b.run.start) return a.run.start < b.run.start ? 1 : -1;
  if (a.run.createdAt !== b.run.createdAt) return a.run.createdAt < b.run.createdAt ? 1 : -1;
  return 0;
}

function compareRecent(a: ScoredRun, b: ScoredRun): number {
  if (a.run.start !== b.run.start) return a.run.start < b.run.start ? 1 : -1;
  if (a.run.createdAt !== b.run.createdAt) return a.run.createdAt < b.run.createdAt ? 1 : -1;
  return 0;
}
