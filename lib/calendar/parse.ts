// Browser-only calendar text → busy blocks. No fetch, no storage, no React.
import ICAL from "ical.js";
import { TIMEZONE } from "../constants";
import { mergeBusy } from "../schedule-input/schedule";
import { formatInstant, parseInstant } from "../scheduling/time";
import type { BusyBlock } from "../types";

export type IcsParseResult =
  | { ok: true; blocks: BusyBlock[] }
  | { ok: false; reason: string };

const UNREADABLE = "This file could not be read as a calendar.";

/** Weekly rules stay bounded; this only stops a pathological fine-grained rule. */
const MAX_OCCURRENCES = 20000;

type IcalTime = {
  isDate: boolean;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  zone?: { tzid?: string | null };
  toJSDate(): Date;
};

const wallClock = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function parseIcs(
  text: string,
  window: { now: string; deadline: string },
): IcsParseResult {
  let nowMs: number;
  let deadlineMs: number;
  try {
    nowMs = parseInstant(window.now);
    deadlineMs = parseInstant(window.deadline);
  } catch {
    return { ok: false, reason: UNREADABLE };
  }

  let root: ICAL.Component;
  try {
    root = new ICAL.Component(ICAL.parse(text.trim()));
  } catch {
    return { ok: false, reason: UNREADABLE };
  }

  if (root.name.toLowerCase() !== "vcalendar") {
    return { ok: false, reason: UNREADABLE };
  }

  const emitted: BusyBlock[] = [];
  for (const component of root.getAllSubcomponents("vevent")) {
    try {
      emitted.push(...blocksFromEvent(component, nowMs, deadlineMs));
    } catch {
      // One bad component does not fail the rest of the calendar.
    }
  }

  return { ok: true, blocks: mergeBusy(emitted) };
}

function blocksFromEvent(
  component: ICAL.Component,
  nowMs: number,
  deadlineMs: number,
): BusyBlock[] {
  const transp = component.getFirstPropertyValue("transp");
  if (typeof transp === "string" && transp.toUpperCase() === "TRANSPARENT") {
    return [];
  }

  const event = new ICAL.Event(component);
  if (event.isRecurrenceException()) return [];

  const seriesStart = event.startDate;
  if (!seriesStart || seriesStart.isDate) return [];

  const title = eventTitle(component);
  const expansion = event.iterator();
  const blocks: BusyBlock[] = [];
  let previousStart = Number.NEGATIVE_INFINITY;

  for (let guard = 0; guard < MAX_OCCURRENCES; guard += 1) {
    const occurrence = expansion.next() as IcalTime | null | undefined;
    if (!occurrence) break;

    const details = event.getOccurrenceDetails(occurrence as ICAL.Time);
    if (details.startDate.isDate) continue;

    const startMs = instantMs(details.startDate as IcalTime);
    if (!Number.isFinite(startMs)) continue;
    if (startMs >= deadlineMs) break;
    if (startMs <= previousStart) break;
    previousStart = startMs;

    const endMs = instantMs(details.endDate as IcalTime);
    if (!Number.isFinite(endMs) || endMs <= nowMs || endMs <= startMs) continue;

    const clippedStart = Math.max(startMs, nowMs);
    const clippedEnd = Math.min(endMs, deadlineMs);
    if (clippedStart >= clippedEnd || clippedStart >= deadlineMs) continue;

    const block: BusyBlock = {
      start: formatInstant(clippedStart),
      end: formatInstant(clippedEnd),
      asleep: false,
    };
    if (title) block.title = title;
    blocks.push(block);
  }

  return blocks;
}

function eventTitle(component: ICAL.Component): string | undefined {
  if (!component.hasProperty("summary")) return undefined;
  const value = component.getFirstPropertyValue("summary");
  if (typeof value !== "string") return undefined;
  const title = value.trim();
  return title === "" ? undefined : title;
}

function instantMs(time: IcalTime): number {
  const tzid = time.zone?.tzid ?? "";
  if (tzid === "" || tzid === "floating" || tzid === "local") {
    return wallMs(time);
  }
  const ms = time.toJSDate().getTime();
  return Number.isFinite(ms) ? ms : wallMs(time);
}

/** Floating wall-clock values are read as America/New_York, matching the rest of the app. */
function wallMs(time: IcalTime): number {
  const guess = Date.UTC(
    time.year,
    time.month - 1,
    time.day,
    time.hour,
    time.minute,
    time.second,
  );
  const first = guess - zoneOffsetMs(guess);
  return guess - zoneOffsetMs(first);
}

function zoneOffsetMs(ms: number): number {
  const whole = Math.floor(ms / 1000) * 1000;
  const parts = wallClock.formatToParts(new Date(whole));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour") % 24,
    value("minute"),
    value("second"),
  );
  return asUtc - whole;
}
