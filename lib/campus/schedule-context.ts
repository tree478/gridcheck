import { ACTIVITY_CATALOG } from "../constants";
import { schedule } from "../scheduling/schedule";
import { parseInstant } from "../scheduling/time";
import type {
  ActivityId,
  BusyBlock,
  FixedRun,
  HourIntensity,
  PlannedActivity,
  ScheduleRequest,
  Tier,
} from "../types";
import {
  MAX_BUSY_BLOCKS,
  MAX_FIXED_RUNS,
  MAX_FORECAST_HOURS,
  SCOPE_NOTE,
} from "./config";
import { invalidRequest } from "./errors";
import type { CampusScheduleContext } from "./types";

const ACTIVITY_IDS = new Set<ActivityId>([
  "washer",
  "dryer",
  "dishwasher",
  "ev",
  "laptop",
  "custom",
]);

const TIERS = new Set<Tier>(["measured", "forecast", "pattern"]);
const HOUR_MS = 60 * 60 * 1000;

function asRecord(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalidRequest(message);
  return value as Record<string, unknown>;
}

function requireInstant(value: unknown, message: string): string {
  if (typeof value !== "string") throw invalidRequest(message);
  try {
    parseInstant(value);
  } catch {
    throw invalidRequest(message);
  }
  return value;
}

function readBusy(value: unknown): BusyBlock[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw invalidRequest("Busy blocks must be a list.");
  if (value.length > MAX_BUSY_BLOCKS) throw invalidRequest("That schedule has too many busy blocks.");
  return value.map((block) => {
    const record = asRecord(block, "A busy block is missing its start, end, or asleep flag.");
    if (typeof record.asleep !== "boolean") {
      throw invalidRequest("A busy block is missing its start, end, or asleep flag.");
    }
    return {
      start: requireInstant(record.start, "A busy block has a timestamp we can't read."),
      end: requireInstant(record.end, "A busy block has a timestamp we can't read."),
      asleep: record.asleep,
    };
  });
}

function readFixedRuns(value: unknown): FixedRun[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw invalidRequest("Could not read the fixed runs on that schedule.");
  if (value.length > MAX_FIXED_RUNS) {
    throw invalidRequest("Could not read the fixed runs on that schedule.");
  }
  return value.map((run) => {
    const record = asRecord(run, "Could not read the fixed runs on that schedule.");
    if (typeof record.activityId !== "string" || !ACTIVITY_IDS.has(record.activityId as ActivityId)) {
      throw invalidRequest("Could not read the fixed runs on that schedule.");
    }
    if (!Array.isArray(record.attendedMoments)) {
      throw invalidRequest("Could not read the fixed runs on that schedule.");
    }
    const attendedMoments = record.attendedMoments.map((moment) => {
      const entry = asRecord(moment, "Could not read the fixed runs on that schedule.");
      return {
        start: requireInstant(entry.start, "Could not read the fixed runs on that schedule."),
        end: requireInstant(entry.end, "Could not read the fixed runs on that schedule."),
      };
    });
    return {
      activityId: record.activityId as ActivityId,
      start: requireInstant(record.start, "Could not read the fixed runs on that schedule."),
      end: requireInstant(record.end, "Could not read the fixed runs on that schedule."),
      attendedMoments,
    };
  });
}

function readForecast(value: unknown): HourIntensity[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw invalidRequest("A schedule needs the forecast hours GridCheck already computed.");
  }
  if (value.length > MAX_FORECAST_HOURS) {
    throw invalidRequest("That forecast is too long to attach to a campus scene.");
  }
  return value.map((hour) => {
    const record = asRecord(hour, "A forecast hour is missing its time, intensity, or tier.");
    if (typeof record.tier !== "string" || !TIERS.has(record.tier as Tier)) {
      throw invalidRequest("A forecast hour is missing its time, intensity, or tier.");
    }
    if (typeof record.gco2PerKwh !== "number" || !Number.isFinite(record.gco2PerKwh) || record.gco2PerKwh < 0 || record.gco2PerKwh > 10_000) {
      throw invalidRequest("A forecast hour has an intensity we can't use.");
    }
    return {
      hourStart: requireInstant(record.hourStart, "A forecast hour has a timestamp we can't read."),
      gco2PerKwh: record.gco2PerKwh,
      tier: record.tier as Tier,
    };
  });
}

function readItem(value: unknown): PlannedActivity {
  const record = asRecord(value, "Attach one catalog appliance.");
  const activity = asRecord(record.activity, "Attach one catalog appliance.");
  if (typeof activity.id !== "string") throw invalidRequest("Attach one catalog appliance.");
  const catalog = ACTIVITY_CATALOG.find((entry) => entry.id === activity.id);
  if (!catalog) throw invalidRequest("Attach one catalog appliance.");
  if (typeof record.durationMin !== "number" || !Number.isInteger(record.durationMin) || record.durationMin < 15 || record.durationMin > 1440) {
    throw invalidRequest("Duration must be a whole number of minutes from 15 to 1440.");
  }
  if (typeof record.energyKwh !== "number" || !Number.isFinite(record.energyKwh) || record.energyKwh < 0 || record.energyKwh > 100) {
    throw invalidRequest("Energy must be a number of kilowatt-hours from 0 to 100.");
  }
  if (typeof record.delayStart !== "boolean") throw invalidRequest("delayStart must be true or false.");
  return {
    activity: catalog,
    durationMin: record.durationMin,
    energyKwh: record.energyKwh,
    delayStart: record.delayStart,
  };
}

export function readScheduleRequest(value: unknown): ScheduleRequest {
  const record = asRecord(value, "scheduleRequest must be an object.");
  if (!Array.isArray(record.items) || record.items.length !== 1) {
    throw invalidRequest("Campus scenes can attach one appliance. That is all GridCheck schedules at a time.");
  }
  if (typeof record.diversitySeed !== "number" || !Number.isFinite(record.diversitySeed)) {
    throw invalidRequest("diversitySeed must be a finite number.");
  }
  return {
    items: [readItem(record.items[0])],
    now: requireInstant(record.now, "now must be an ISO timestamp with a timezone offset."),
    deadline: requireInstant(record.deadline, "deadline must be an ISO timestamp with a timezone offset."),
    busy: readBusy(record.busy),
    fixedRuns: readFixedRuns(record.fixedRuns),
    forecast: readForecast(record.forecast),
    diversitySeed: record.diversitySeed,
  };
}

function intensityAt(forecast: readonly HourIntensity[], startIso: string): number | null {
  let startMs: number;
  try {
    startMs = parseInstant(startIso);
  } catch {
    return null;
  }
  for (const hour of forecast) {
    try {
      const hourMs = parseInstant(hour.hourStart);
      if (startMs >= hourMs && startMs < hourMs + HOUR_MS) return hour.gco2PerKwh;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Recomputes a recommendation with the existing scheduler. Client-supplied
 * gram totals are ignored. Catalog names replace any client-supplied name.
 */
export function readScheduleContext(value: unknown): CampusScheduleContext {
  const request = readScheduleRequest(value);
  let result;
  try {
    result = schedule(request);
  } catch {
    throw invalidRequest("Could not read that schedule.");
  }

  const activityResult = result.results[0];
  if (!activityResult || !activityResult.ok) {
    const reason = activityResult && !activityResult.ok ? activityResult.reason : "No recommendation was produced.";
    throw invalidRequest(reason.length > 300 ? `${reason.slice(0, 300)}…` : reason);
  }

  const recommended = activityResult.options.find((option) => option.labels.includes("recommended"));
  if (!recommended) throw invalidRequest("That schedule has no recommended time.");

  const item = request.items[0];
  return {
    activityId: activityResult.activityId,
    activityName: item.activity.name,
    durationMin: item.durationMin,
    energyKwh: item.energyKwh,
    recommendedStart: recommended.start,
    recommendedEnd: recommended.end,
    loadAt: recommended.loadAt ?? null,
    modeledGrams: recommended.modeledGrams,
    savedVsSoonestGrams: recommended.savedVsSoonestGrams,
    savedVsSoonestPct: recommended.savedVsSoonestPct,
    confidence: recommended.confidence,
    gco2PerKwh: intensityAt(request.forecast, recommended.start),
    estimatesAreModeled: true,
    scope: "one-appliance",
    scopeNote: SCOPE_NOTE,
  };
}
