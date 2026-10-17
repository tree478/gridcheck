import ICAL from "ical.js";
import type { BusyBlock } from "@/lib/types";

/**
 * Browser-only .ics → BusyBlock[]. Skips all-day and transparent (free) events.
 * Expands weekly recurrences across [rangeStartMs, rangeEndMs).
 * Never sends calendar data anywhere — caller keeps it in memory only.
 */
export function parseIcsToBusyBlocks(
  text: string,
  rangeStartMs: number,
  rangeEndMs: number,
): BusyBlock[] {
  const jcal = ICAL.parse(text);
  const comp = new ICAL.Component(jcal);
  const vevents = comp.getAllSubcomponents("vevent");
  const out: BusyBlock[] = [];

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent);
    if (event.startDate?.isDate) continue; // all-day

    if (event.isRecurring()) {
      const iterator = event.iterator();
      let next = iterator.next();
      let guard = 0;
      while (next && guard < 400) {
        guard += 1;
        if (next.isDate) {
          next = iterator.next();
          continue;
        }
        const occStart = next.toUnixTime() * 1000;
        if (occStart >= rangeEndMs) break;
        const durationSec = event.duration?.toSeconds() ?? 0;
        const occEnd = occStart + durationSec * 1000;
        if (occEnd > rangeStartMs) {
          pushTimed(out, event, occStart, occEnd);
        }
        next = iterator.next();
      }
    } else {
      const startMs = event.startDate.toUnixTime() * 1000;
      const endMs = event.endDate.toUnixTime() * 1000;
      if (endMs <= rangeStartMs || startMs >= rangeEndMs) continue;
      pushTimed(out, event, startMs, endMs);
    }
  }

  return out.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

function pushTimed(
  out: BusyBlock[],
  event: InstanceType<typeof ICAL.Event>,
  startMs: number,
  endMs: number,
) {
  const transp = event.component.getFirstPropertyValue("transp");
  if (transp === "TRANSPARENT") return;
  if (!(endMs > startMs)) return;
  const summary = event.summary?.trim();
  out.push({
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    asleep: false,
    ...(summary ? { title: summary } : {}),
  });
}

export function icsHorizonMs(nowIso: string): {
  startMs: number;
  endMs: number;
} {
  const startMs = Date.parse(nowIso);
  const endMs = startMs + 8 * 24 * 60 * 60 * 1000;
  return { startMs, endMs };
}
