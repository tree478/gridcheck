// Pure, framework-free helpers for the planner form (T-B2).
// Relative imports (not "@/") so Vitest can resolve them without an alias.
import {
  ACTIVITY_CATALOG,
  MAX_HORIZON_DAYS,
  SLOT_MINUTES,
  TIMEZONE,
} from "../../lib/constants";
import type {
  Activity,
  BusyBlock,
  HourIntensity,
  PlannedActivity,
  ScheduleRequest,
} from "../../lib/types";

export const MINUTE_MS = 60 * 1000;
export const DAY_MS = 24 * 60 * MINUTE_MS;

// ---------- Form state ----------

/** One catalog activity as the user sees it. Numbers stay strings so partial typing never throws. */
export type ActivityFormState = {
  activity: Activity;
  selected: boolean;
  durationMin: string;
  energyKwh: string;
  delayStart: boolean;
};

/** A busy block as the user edits it: wall-clock times in `datetime-local` form ("YYYY-MM-DDTHH:mm"). */
export type BusyFormBlock = {
  key: string;
  startLocal: string;
  endLocal: string;
  asleep: boolean;
  /** Shown for demo blocks only; session only, never stored (lib/types.ts). */
  title?: string;
};

export type PlannerFormState = {
  activities: ActivityFormState[];
  busy: BusyFormBlock[];
  deadlineLocal: string;
};

/** Flat map of field key → message. Keys come from the `errorKey` helpers below. */
export type PlannerErrors = Record<string, string>;

export const errorKey = {
  activities: "activities",
  duration: (id: string) => `activity.${id}.durationMin`,
  energy: (id: string) => `activity.${id}.energyKwh`,
  busyStart: (key: string) => `busy.${key}.start`,
  busyEnd: (key: string) => `busy.${key}.end`,
  deadline: "deadline",
} as const;

export function activityFromCatalog(activity: Activity): ActivityFormState {
  return {
    activity,
    selected: false,
    durationMin: String(activity.defaultDurationMin),
    energyKwh: String(activity.defaultEnergyKwh),
    delayStart: false,
  };
}

/** Pre-filled state: every catalog activity with its defaults, no busy blocks, demo deadline (Thursday 9 PM). */
export function defaultFormState(
  nowIso: string,
  timeZone: string = TIMEZONE,
): PlannerFormState {
  return {
    activities: ACTIVITY_CATALOG.map(activityFromCatalog),
    busy: [],
    deadlineLocal: defaultDeadlineLocal(nowIso, timeZone),
  };
}

/**
 * The PRD §4 demo deadline: the next Thursday at 9:00 PM in the given zone that is after `now`.
 * Always within MAX_HORIZON_DAYS. Returns "" if `now` is unreadable.
 */
export function defaultDeadlineLocal(
  nowIso: string,
  timeZone: string = TIMEZONE,
): string {
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(nowMs)) return "";
  const today = localParts(nowMs, timeZone);
  for (let d = 0; d <= MAX_HORIZON_DAYS; d++) {
    const date = new Date(Date.UTC(today.year, today.month - 1, today.day + d));
    const local = `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}T21:00`;
    const iso = localToIso(local, timeZone);
    if (!iso) continue;
    const ms = Date.parse(iso);
    if (ms > nowMs && weekdayOf(ms, timeZone) === "Thu") return local;
  }
  return "";
}

/** Converts stored blocks (ISO with offset) into editable form blocks. Keys are stable per index. */
export function busyBlocksToForm(
  blocks: BusyBlock[],
  keyPrefix = "demo",
  timeZone: string = TIMEZONE,
): BusyFormBlock[] {
  return blocks.map((b, i) => ({
    key: `${keyPrefix}-${i}`,
    startLocal: isoToLocal(b.start, timeZone) ?? "",
    endLocal: isoToLocal(b.end, timeZone) ?? "",
    asleep: b.asleep,
    ...(b.title ? { title: b.title } : {}),
  }));
}

export function emptyBusyBlock(key: string): BusyFormBlock {
  return { key, startLocal: "", endLocal: "", asleep: false };
}

/** Form rows that already have a real start and end, for the week grid before submit. */
export function formBlocksToBusy(
  blocks: BusyFormBlock[],
  timeZone: string = TIMEZONE,
): BusyBlock[] {
  const busy: BusyBlock[] = [];
  for (const block of blocks) {
    const start = localToIso(block.startLocal, timeZone);
    const end = localToIso(block.endLocal, timeZone);
    if (!start || !end) continue;
    if (Date.parse(end) <= Date.parse(start)) continue;
    busy.push({
      start,
      end,
      asleep: block.asleep,
      ...(block.title ? { title: block.title } : {}),
    });
  }
  return busy;
}

// ---------- Time zone math (Intl only, never the machine's local zone) ----------

type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const partsFormatters = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatters.set(timeZone, f);
  }
  return f;
}

function localParts(ms: number, timeZone: string): LocalParts {
  const parts = partsFormatter(timeZone).formatToParts(new Date(ms));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

/** Zone offset (local − UTC) in ms at the given instant. */
function zoneOffsetMs(ms: number, timeZone: string): number {
  const whole = Math.floor(ms / 1000) * 1000;
  const p = localParts(whole, timeZone);
  return (
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - whole
  );
}

const weekdayFormatters = new Map<string, Intl.DateTimeFormat>();
function weekdayOf(ms: number, timeZone: string): string {
  let f = weekdayFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" });
    weekdayFormatters.set(timeZone, f);
  }
  return f.format(new Date(ms));
}

const pad2 = (n: number) => String(n).padStart(2, "0");

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Parses "YYYY-MM-DDTHH:mm[:ss]" into wall-clock parts; null if malformed or the date doesn't exist. */
export function parseLocalInput(local: string): LocalParts | null {
  const m = LOCAL_RE.exec(local.trim());
  if (!m) return null;
  const p: LocalParts = {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: Number(m[4]),
    minute: Number(m[5]),
    second: m[6] ? Number(m[6]) : 0,
  };
  if (p.hour > 23 || p.minute > 59 || p.second > 59) return null;
  const check = new Date(Date.UTC(p.year, p.month - 1, p.day));
  if (
    check.getUTCFullYear() !== p.year ||
    check.getUTCMonth() !== p.month - 1 ||
    check.getUTCDate() !== p.day
  ) {
    return null;
  }
  return p;
}

function partsEqual(a: LocalParts, b: LocalParts): boolean {
  return (
    a.year === b.year &&
    a.month === b.month &&
    a.day === b.day &&
    a.hour === b.hour &&
    a.minute === b.minute &&
    a.second === b.second
  );
}

/**
 * The instant for a wall-clock time in the given zone.
 * DST rules: in a fall-back overlap the earlier instant wins; a spring-forward gap shifts forward
 * to the first real instant. Returns null for malformed input.
 */
export function localToMs(
  local: string,
  timeZone: string = TIMEZONE,
): number | null {
  const p = parseLocalInput(local);
  if (!p) return null;
  const guess = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
  );
  const first = guess - zoneOffsetMs(guess, timeZone);
  const second = guess - zoneOffsetMs(first, timeZone);
  const candidates = [...new Set([first, second])].sort((a, b) => a - b);
  const matching = candidates.filter((ms) =>
    partsEqual(localParts(ms, timeZone), p),
  );
  if (matching.length > 0) return matching[0];
  return candidates[candidates.length - 1];
}

/** ISO 8601 with the zone's offset at that instant, e.g. "2026-10-22T21:00:00-04:00". */
export function msToIso(ms: number, timeZone: string = TIMEZONE): string {
  const p = localParts(ms, timeZone);
  const offsetMin = Math.round(zoneOffsetMs(ms, timeZone) / MINUTE_MS);
  const sign = offsetMin < 0 ? "-" : "+";
  const abs = Math.abs(offsetMin);
  return (
    `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}` +
    `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
  );
}

/** `datetime-local` value (zone wall time) → ISO with offset. Null for malformed input. */
export function localToIso(
  local: string,
  timeZone: string = TIMEZONE,
): string | null {
  const ms = localToMs(local, timeZone);
  return ms === null ? null : msToIso(ms, timeZone);
}

/** ISO instant → `datetime-local` value ("YYYY-MM-DDTHH:mm") in the zone. Null if unreadable. */
export function isoToLocal(
  iso: string,
  timeZone: string = TIMEZONE,
): string | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const p = localParts(ms, timeZone);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** Some ICU builds emit U+202F before "PM"; normalize so SSR and browser output match. */
function normalizeSpaces(s: string): string {
  return s.replace(/[\u202f\u00a0]/g, " ");
}

const humanFormatters = new Map<string, Intl.DateTimeFormat>();
/** "Thu, Oct 22, 9:00 PM EDT" in the zone, for messages and hints. */
export function formatLocal(iso: string, timeZone: string = TIMEZONE): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  let f = humanFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
    humanFormatters.set(timeZone, f);
  }
  return normalizeSpaces(f.format(new Date(ms)));
}

/** Latest allowed deadline for `now`, as an ISO string. */
export function maxDeadlineIso(
  nowIso: string,
  timeZone: string = TIMEZONE,
): string | null {
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(nowMs)) return null;
  return msToIso(nowMs + MAX_HORIZON_DAYS * DAY_MS, timeZone);
}

// ---------- Validation ----------

function parsePositive(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function validatePlanner(
  state: PlannerFormState,
  nowIso: string,
  timeZone: string = TIMEZONE,
): PlannerErrors {
  const errors: PlannerErrors = {};

  const selected = state.activities.filter((a) => a.selected);
  if (selected.length === 0) {
    errors[errorKey.activities] = "Pick at least one appliance to plan.";
  }
  for (const a of selected) {
    const duration = parsePositive(a.durationMin);
    if (
      duration === null ||
      !Number.isInteger(duration) ||
      duration % SLOT_MINUTES !== 0
    ) {
      errors[errorKey.duration(a.activity.id)] =
        `Enter a duration in whole minutes, in steps of ${SLOT_MINUTES} (for example ${a.activity.defaultDurationMin}).`;
    }
    if (parsePositive(a.energyKwh) === null) {
      errors[errorKey.energy(a.activity.id)] =
        "Enter the energy per cycle in kWh, greater than 0.";
    }
  }

  for (const b of state.busy) {
    const startMs = b.startLocal ? localToMs(b.startLocal, timeZone) : null;
    const endMs = b.endLocal ? localToMs(b.endLocal, timeZone) : null;
    if (startMs === null) {
      errors[errorKey.busyStart(b.key)] = b.startLocal
        ? "That start time couldn't be read."
        : "Enter a start time.";
    }
    if (endMs === null) {
      errors[errorKey.busyEnd(b.key)] = b.endLocal
        ? "That end time couldn't be read."
        : "Enter an end time.";
    } else if (startMs !== null && endMs <= startMs) {
      errors[errorKey.busyEnd(b.key)] =
        "The end time needs to be after the start time.";
    }
  }

  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(nowMs)) {
    errors[errorKey.deadline] =
      "We couldn't tell what time it is right now, so the deadline can't be checked.";
  } else if (!state.deadlineLocal) {
    errors[errorKey.deadline] = "Choose a deadline.";
  } else {
    const deadlineMs = localToMs(state.deadlineLocal, timeZone);
    const maxMs = nowMs + MAX_HORIZON_DAYS * DAY_MS;
    if (deadlineMs === null) {
      errors[errorKey.deadline] = "That deadline couldn't be read.";
    } else if (deadlineMs <= nowMs) {
      errors[errorKey.deadline] =
        `The deadline needs to be after now (${formatLocal(nowIso, timeZone)}).`;
    } else if (deadlineMs > maxMs) {
      errors[errorKey.deadline] =
        `Deadlines can be at most ${MAX_HORIZON_DAYS} days out (by ${formatLocal(msToIso(maxMs, timeZone), timeZone)}).`;
    }
  }

  return errors;
}

// ---------- Build the request ----------

export type BuildContext = {
  now: string;
  forecast: HourIntensity[];
  diversitySeed: number;
  timeZone?: string;
};

export type BuildResult =
  { ok: true; request: ScheduleRequest } | { ok: false; errors: PlannerErrors };

export function buildScheduleRequest(
  state: PlannerFormState,
  ctx: BuildContext,
): BuildResult {
  const timeZone = ctx.timeZone ?? TIMEZONE;
  const errors = validatePlanner(state, ctx.now, timeZone);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const items: PlannedActivity[] = state.activities
    .filter((a) => a.selected)
    .map((a) => ({
      activity: a.activity,
      durationMin: Number(a.durationMin.trim()),
      energyKwh: Number(a.energyKwh.trim()),
      // Always false where the appliance has no timer, whatever the toggle says.
      delayStart: a.activity.supportsDelayStart && a.delayStart,
    }));

  // Passed through as entered; sorting and merging belong to lib/schedule-input (T-C7).
  const busy: BusyBlock[] = state.busy.map((b) => ({
    start: localToIso(b.startLocal, timeZone) as string,
    end: localToIso(b.endLocal, timeZone) as string,
    asleep: b.asleep,
    ...(b.title ? { title: b.title } : {}),
  }));

  return {
    ok: true,
    request: {
      items,
      now: ctx.now,
      deadline: localToIso(state.deadlineLocal, timeZone) as string,
      busy,
      fixedRuns: [],
      forecast: ctx.forecast,
      diversitySeed: ctx.diversitySeed,
    },
  };
}
