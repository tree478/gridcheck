// Pure option-card display helpers. Relative imports so Vitest resolves without an alias.
import { ACTIVITY_CATALOG, TIMEZONE } from "../../lib/constants";
import type {
  Activity,
  ActivityId,
  ActivityResult,
  AttentionType,
  OptionLabel,
  RunRecord,
  ScheduleOption,
  Tier,
} from "../../lib/types";
import {
  activityDisplayName,
  formatClock,
  formatOptionLabels,
} from "../schedule-grid/overlays";

export const DIVERSITY_EXPLANATION =
  "Several times are nearly as clean. We spread users across them so we don't create a new peak.";

export const CALENDAR_PLACEHOLDER =
  "Calendar download will be available once export is connected.";

export const ATTENTION_TEXT: Record<AttentionType, string> = {
  start: "You're needed at the start",
  startEnd: "You're needed at the start and the end",
  throughout: "You're needed the whole time",
};

export function activityById(id: ActivityId): Activity | undefined {
  return ACTIVITY_CATALOG.find((a) => a.id === id);
}

export function activityName(id: ActivityId): string {
  return activityDisplayName(id);
}

/** Drop Worst — it is scoring-only (PRD §12 #8). */
export function visibleOptions(options: ScheduleOption[]): ScheduleOption[] {
  return options.filter((option) => !option.labels.includes("worst"));
}

export function cardTitle(labels: OptionLabel[]): string {
  const merged = formatOptionLabels(labels);
  if (merged) return merged;
  if (labels.includes("alternative")) return "Alternative";
  return merged;
}

export function cardTone(
  labels: OptionLabel[],
): "recommended" | "greenest" | "soonest" | "alternative" {
  if (labels.includes("recommended")) return "recommended";
  if (labels.includes("greenest")) return "greenest";
  if (labels.includes("soonest")) return "soonest";
  return "alternative";
}

export function attentionLines(
  activity: Activity,
  option: ScheduleOption,
): string[] {
  const lines = [ATTENTION_TEXT[activity.attention]];
  if (option.loadAt) {
    lines.push(`Load at ${formatClock(option.loadAt)}`);
  }
  return lines;
}

/** Honest vs-Soonest copy. Soonest is a baseline, not a savings boast. */
export function savingsLine(option: ScheduleOption): string {
  const pct = option.savedVsSoonestPct;
  const grams = option.savedVsSoonestGrams;
  if (option.labels.includes("soonest") || (pct === 0 && grams === 0)) {
    return "0% vs Soonest · baseline (Soonest)";
  }
  if (grams < 0) {
    return `${pct}% vs Soonest (${grams} g, modeled estimate)`;
  }
  return `${pct}% vs Soonest (${grams} g saved, modeled estimate)`;
}

export function modeledGramsLine(grams: number): string {
  return `${grams} g CO₂ (modeled estimate)`;
}

export function confidenceLabel(tier: Tier): string {
  if (tier === "pattern") return "Pattern forecast";
  if (tier === "forecast") return "Demand forecast";
  return "Measured";
}

export function formatWeekday(
  iso: string,
  timeZone: string = TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(new Date(iso));
}

export function formatWindow(startIso: string, endIso: string): string {
  return `${formatWeekday(startIso)} ${formatClock(startIso)}–${formatClock(endIso)}`;
}

export function chosenSummary(name: string, option: ScheduleOption): string {
  return `${name} chosen — ${formatWindow(option.start, option.end)}`;
}

export function noWindowDetails(result: ActivityResult): {
  activityId: ActivityId;
  name: string;
  reason: string;
  suggestion?: string;
} | null {
  if (result.ok) return null;
  return {
    activityId: result.activityId,
    name: activityName(result.activityId),
    reason: result.reason,
    ...(result.suggestion ? { suggestion: result.suggestion } : {}),
  };
}

export function hasRecommendedCard(options: ScheduleOption[]): boolean {
  return visibleOptions(options).some((option) =>
    option.labels.includes("recommended"),
  );
}

export function chosenRecordPreview(input: {
  activityId: ActivityId;
  option: ScheduleOption;
  reference: { bestGrams: number; worstGrams: number; soonestGrams: number };
  kwh: number;
  forecastMadeAt: string;
  createdAt: string;
}): RunRecord {
  return {
    id: `guest:${input.activityId}:${input.option.start}`,
    owner: "guest",
    activityId: input.activityId,
    start: input.option.start,
    end: input.option.end,
    kwh: input.kwh,
    chosenGrams: input.option.modeledGrams,
    bestGrams: input.reference.bestGrams,
    worstGrams: input.reference.worstGrams,
    soonestGrams: input.reference.soonestGrams,
    confidence: input.option.confidence,
    forecastMadeAt: input.forecastMadeAt,
    status: "scheduled",
    createdAt: input.createdAt,
  };
}
