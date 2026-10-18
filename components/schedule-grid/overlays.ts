// Pure overlay geometry and labels. Relative imports so Vitest resolves without an alias.
import { ACTIVITY_CATALOG, TIMEZONE } from "../../lib/constants";
import type {
  ActivityId,
  BusyBlock,
  OptionLabel,
  ScheduleOption,
  ScheduleResult,
} from "../../lib/types";
import { HOUR_MS, isoToGridPosition, type GridDay } from "./gridMath";

export type OverlaySegment = {
  dayIndex: number;
  startHour: number;
  endHour: number;
};

export type DrawnOption = {
  activityId: ActivityId;
  name: string;
  option: ScheduleOption;
};

const LABEL_ORDER = ["recommended", "best", "greenest", "soonest"] as const;
const LABEL_WORDS: Record<(typeof LABEL_ORDER)[number], string> = {
  recommended: "Recommended",
  best: "Best",
  greenest: "Greenest",
  soonest: "Soonest",
};

function normalizeSpaces(s: string): string {
  return s.replace(/[\u202f\u00a0]/g, " ");
}

/** Split an ISO [start, end) across day columns. Parts outside the grid are dropped. */
export function segmentsForRange(
  startIso: string,
  endIso: string,
  days: GridDay[],
): OverlaySegment[] {
  if (days.length === 0) return [];
  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endIso);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs)
    return [];

  const startPos = startPosition(startIso, startMs, days);
  const endPos = endPosition(endIso, endMs, days);
  if (!startPos || !endPos) return [];
  if (endPos.dayIndex < startPos.dayIndex) return [];

  const out: OverlaySegment[] = [];
  for (let i = startPos.dayIndex; i <= endPos.dayIndex; i++) {
    const startHour = i === startPos.dayIndex ? startPos.hourPosition : 0;
    const endHour =
      i === endPos.dayIndex
        ? endPos.hourPosition
        : (days[i].dayEndMs - days[i].dayStartMs) / HOUR_MS;
    if (endHour > startHour) out.push({ dayIndex: i, startHour, endHour });
  }
  return out;
}

function startPosition(
  iso: string,
  ms: number,
  days: GridDay[],
): { dayIndex: number; hourPosition: number } | null {
  const pos = isoToGridPosition(iso, days);
  if (pos) return pos;
  if (ms < days[0].dayStartMs) return { dayIndex: 0, hourPosition: 0 };
  return null;
}

function endPosition(
  iso: string,
  ms: number,
  days: GridDay[],
): { dayIndex: number; hourPosition: number } | null {
  const pos = isoToGridPosition(iso, days);
  if (pos) return pos;
  const last = days[days.length - 1];
  if (ms > last.dayEndMs) {
    return {
      dayIndex: days.length - 1,
      hourPosition: (last.dayEndMs - last.dayStartMs) / HOUR_MS,
    };
  }
  return null;
}

/**
 * Map a segment onto the rows a column actually paints.
 * Mobile Sunday is [9..23], not [0..23] — a 23.5–24 cap sits in the last half of the 11 PM cell.
 */
export function segmentStyle(
  segment: OverlaySegment,
  visibleRows: number[],
  rowHeightPx: number,
  gapPx: number,
): { topPx: number; heightPx: number } | null {
  if (visibleRows.length === 0 || rowHeightPx <= 0) return null;

  let firstIndex = -1;
  let lastIndex = -1;
  for (let i = 0; i < visibleRows.length; i++) {
    const row = visibleRows[i];
    if (segment.endHour > row && segment.startHour < row + 1) {
      if (firstIndex === -1) firstIndex = i;
      lastIndex = i;
    }
  }
  if (firstIndex === -1) return null;

  const stride = rowHeightPx + gapPx;
  const firstRow = visibleRows[firstIndex];
  const lastRow = visibleRows[lastIndex];
  const topPx =
    firstIndex * stride +
    Math.max(0, segment.startHour - firstRow) * rowHeightPx;
  const bottomPx =
    lastIndex * stride +
    Math.min(rowHeightPx, (segment.endHour - lastRow) * rowHeightPx);
  const heightPx = bottomPx - topPx;
  if (heightPx <= 0) return null;
  return { topPx, heightPx };
}

export function mobileVisibleRows(day: GridDay): number[] {
  return [...new Set(day.hours.map((h) => Math.floor(h.position)))].sort(
    (a, b) => a - b,
  );
}

export function desktopVisibleRows(rows: number): number[] {
  return Array.from({ length: rows }, (_, i) => i);
}

const DRAW_LABELS = new Set<OptionLabel>(["recommended", "greenest", "soonest"]);

/** Draw Recommended, Greenest, and Soonest. Worst and alternatives stay off the grid. */
export function shouldDrawOption(option: { labels: OptionLabel[] }): boolean {
  return option.labels.some((label) => DRAW_LABELS.has(label));
}

export function formatOptionLabels(labels: OptionLabel[]): string {
  return LABEL_ORDER.filter((label) => labels.includes(label))
    .map((label) => LABEL_WORDS[label])
    .join(" · ");
}

export function optionDisplayLabel(labels: OptionLabel[]): string {
  return formatOptionLabels(labels);
}

export function optionTone(
  labels: OptionLabel[],
): "recommended" | "greenest" | "soonest" {
  if (labels.includes("recommended")) return "recommended";
  if (labels.includes("greenest")) return "greenest";
  return "soonest";
}

/** UI label: EV + laptop catalog entries show as Device charging. */
export function activityDisplayName(id: ActivityId): string {
  if (id === "ev" || id === "laptop") return "Device charging";
  return ACTIVITY_CATALOG.find((a) => a.id === id)?.name ?? id;
}

export function drawnOptionsFromResult(
  result: ScheduleResult | undefined,
): DrawnOption[] {
  if (!result) return [];
  const out: DrawnOption[] = [];
  for (const item of result.results) {
    if (!item.ok) continue;
    const name = activityDisplayName(item.activityId);
    for (const option of item.options) {
      if (shouldDrawOption(option))
        out.push({ activityId: item.activityId, name, option });
    }
  }
  return out;
}

export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Two activities only: if this option overlaps another on this day, return 0/1; else full width. */
export function laneForOption(
  drawn: DrawnOption,
  others: DrawnOption[],
  dayIndex: number,
  days: GridDay[],
): { lane: number; laneCount: number } {
  const segs = segmentsForRange(
    drawn.option.start,
    drawn.option.end,
    days,
  ).filter((s) => s.dayIndex === dayIndex);
  const overlappingIds = new Set<ActivityId>();
  for (const other of others) {
    if (other === drawn) continue;
    const otherSegs = segmentsForRange(
      other.option.start,
      other.option.end,
      days,
    ).filter((s) => s.dayIndex === dayIndex);
    const hits = segs.some((a) =>
      otherSegs.some((b) =>
        rangesOverlap(a.startHour, a.endHour, b.startHour, b.endHour),
      ),
    );
    if (hits) overlappingIds.add(other.activityId);
  }
  if (overlappingIds.size === 0) return { lane: 0, laneCount: 1 };
  overlappingIds.add(drawn.activityId);
  const ordered = [...overlappingIds].sort();
  return {
    lane: Math.max(0, ordered.indexOf(drawn.activityId)),
    laneCount: ordered.length,
  };
}

const clockFormatters = new Map<string, Intl.DateTimeFormat>();
function clockFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = clockFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    });
    clockFormatters.set(timeZone, f);
  }
  return f;
}

/** "11:30 PM", "7:30 AM", "1 PM", "9:15 AM" — America/New_York, never the machine zone. */
export function formatClock(iso: string, timeZone: string = TIMEZONE): string {
  const raw = normalizeSpaces(clockFormatter(timeZone).format(new Date(iso)));
  return raw.replace(/:00(?=\s|$)/, "");
}

export function busyAriaLabel(block: BusyBlock): string {
  const when = `${formatClock(block.start)} to ${formatClock(block.end)}`;
  if (block.asleep) {
    if (block.title && block.title !== "Sleep")
      return `${block.title} (sleep), ${when}`;
    return `Sleep, ${when}`;
  }
  return `${block.title ?? "Busy"}, ${when}`;
}

export function optionAriaLabel(drawn: DrawnOption): string {
  const labels = formatOptionLabels(drawn.option.labels);
  return `${drawn.name}, ${labels}, ${formatClock(drawn.option.start)} to ${formatClock(drawn.option.end)}`;
}

export function markerAriaLabel(
  drawn: DrawnOption,
  momentStart: string,
): string {
  const time = formatClock(momentStart);
  const kind = markerKind(drawn, momentStart);
  if (kind === "load")
    return `You needed at ${time} (load ${drawn.name.toLowerCase()})`;
  if (kind === "end")
    return `You needed at ${time} (end ${drawn.name.toLowerCase()})`;
  return `You needed at ${time} (start ${drawn.name.toLowerCase()})`;
}

export function markerKind(
  drawn: DrawnOption,
  momentStart: string,
): "load" | "start" | "end" {
  if (drawn.option.loadAt && drawn.option.loadAt === momentStart) return "load";
  if (drawn.option.end === momentStart) return "end";
  return "start";
}

export function busyCanvasLabel(block: BusyBlock): string {
  if (block.title) return block.title;
  return block.asleep ? "Sleep" : "Busy";
}
