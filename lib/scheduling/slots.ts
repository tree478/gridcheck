import { MAX_HORIZON_DAYS, SLOT_MINUTES } from "../constants";
import type { HourIntensity, Tier } from "../types";
import { formatInstant, InvalidInstantError, parseInstant, slotBounds } from "./time";

export type Slot = {
  start: string;
  end: string;
  gco2PerKwh: number;
  tier: Tier;
};

export class MissingHourIntensityError extends Error {
  readonly hourStart: string;

  constructor(hourStart: string) {
    super(`No intensity for hour starting ${hourStart}`);
    this.name = "MissingHourIntensityError";
    this.hourStart = hourStart;
  }
}

/**
 * 15-minute slots from the next boundary after `now` through the earlier of
 * `deadline` and `now` plus MAX_HORIZON_DAYS. Each slot repeats the
 * gco2PerKwh and tier of the America/New_York hour that contains its start.
 * Hours are supplied by the caller. A slot whose hour is absent throws
 * MissingHourIntensityError.
 */
export function slotsInWindow(input: {
  now: string;
  deadline: string;
  hours: readonly HourIntensity[];
}): Slot[] {
  const bounds = slotBounds({
    now: input.now,
    deadline: input.deadline,
    slotMinutes: SLOT_MINUTES,
    maxHorizonDays: MAX_HORIZON_DAYS,
  });

  const byHour = new Map<number, HourIntensity>();
  for (const hour of input.hours) {
    byHour.set(parseInstant(hour.hourStart), hour);
  }

  return bounds.map((bound) => {
    const hourStart = hourContaining(bound.start);
    const hour = byHour.get(parseInstant(hourStart));
    if (!hour) {
      throw new MissingHourIntensityError(hourStart);
    }
    return {
      start: bound.start,
      end: bound.end,
      gco2PerKwh: hour.gco2PerKwh,
      tier: hour.tier,
    };
  });
}

/** Wall-clock hour in America/New_York that contains this instant. */
function hourContaining(iso: string): string {
  const formatted = formatInstant(parseInstant(iso));
  const match =
    /^(\d{4}-\d{2}-\d{2}T\d{2}):\d{2}:\d{2}(?:\.\d+)?([+-]\d{2}:\d{2})$/.exec(
      formatted,
    );
  if (!match) {
    throw new InvalidInstantError(iso);
  }
  return `${match[1]}:00:00${match[2]}`;
}
