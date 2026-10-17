import type { GridResponse, HourIntensity } from "../types";

// MOCK DATA: synthetic values shaped like an ISO-NE autumn week, NOT real EIA data.
// Use for building UI and scheduler tests in parallel with the real /api/grid.
// Fixed anchor so results are deterministic. DST ends Nov 1, 2026, so every
// timestamp in this file is EDT (-04:00).

export const MOCK_NOW = "2026-10-18T09:00:00-04:00"; // Sunday, demo day

const HOUR_MS = 60 * 60 * 1000;
const EDT_OFFSET_MS = -4 * HOUR_MS;
const NOW_MS = Date.parse(MOCK_NOW);
const DATA_LAG_HOURS = 4; // EIA reports a few hours behind real time

// gCO2/kWh by local hour: cleaner overnight and midday (solar), peaks morning and evening.
const HOURLY_PROFILE = [
  225, 218, 212, 210, 214, 228, 262, 300, 318, 305, 272, 248,
  236, 232, 240, 262, 298, 332, 348, 342, 322, 298, 270, 244,
];
const WEEKEND_OFFSET = -15;

function toEdtIso(ms: number): string {
  return new Date(ms + EDT_OFFSET_MS).toISOString().slice(0, 19) + "-04:00";
}

function baseIntensity(ms: number): number {
  const local = new Date(ms + EDT_OFFSET_MS);
  const day = local.getUTCDay();
  const weekend = day === 0 || day === 6;
  return HOURLY_PROFILE[local.getUTCHours()] + (weekend ? WEEKEND_OFFSET : 0);
}

// Deterministic jitter in [-8, 8] so actual data looks less smooth than the forecast.
function jitter(i: number): number {
  return ((i * 37) % 17) - 8;
}

const latestMs = NOW_MS - DATA_LAG_HOURS * HOUR_MS;

const recent: HourIntensity[] = Array.from({ length: 48 }, (_, i) => {
  const ms = latestMs - (47 - i) * HOUR_MS;
  return { hourStart: toEdtIso(ms), gco2PerKwh: baseIntensity(ms) + jitter(i), isForecast: false };
});

const forecast: HourIntensity[] = Array.from({ length: 168 }, (_, i) => {
  const ms = NOW_MS + i * HOUR_MS;
  return { hourStart: toEdtIso(ms), gco2PerKwh: baseIntensity(ms), isForecast: true };
});

export const mockGrid: GridResponse = {
  region: "ISNE",
  generatedAt: MOCK_NOW,
  latestDataHour: toEdtIso(latestMs),
  source: "live",
  recent,
  forecast,
};
