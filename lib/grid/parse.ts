import type { GridResponse, HourIntensity, Tier } from "../types";

// Checks a GET /api/grid body in the browser before the planner uses it, so a
// bad or partial response shows an error state instead of crashing the page.

const TIERS: readonly Tier[] = ["measured", "forecast", "pattern"];

function isIsoString(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isHour(value: unknown): value is HourIntensity {
  if (value === null || typeof value !== "object") return false;
  const hour = value as Record<string, unknown>;
  return (
    isIsoString(hour.hourStart) &&
    typeof hour.gco2PerKwh === "number" &&
    Number.isFinite(hour.gco2PerKwh) &&
    TIERS.includes(hour.tier as Tier)
  );
}

function isHourList(value: unknown): value is HourIntensity[] {
  return Array.isArray(value) && value.every(isHour);
}

/** Returns the response if it is a usable GridResponse (non-empty forecast), else null. */
export function parseGridResponse(json: unknown): GridResponse | null {
  if (json === null || typeof json !== "object") return null;
  const body = json as Record<string, unknown>;
  if (body.region !== "ISNE") return null;
  if (body.source !== "live" && body.source !== "fallback") return null;
  if (!isIsoString(body.generatedAt) || !isIsoString(body.forecastMadeAt)) return null;
  if (!isIsoString(body.latestDataHour)) return null;
  if (!isHourList(body.recent) || !isHourList(body.forecast)) return null;
  if (body.forecast.length === 0) return null;
  return {
    region: "ISNE",
    generatedAt: body.generatedAt,
    forecastMadeAt: body.forecastMadeAt,
    latestDataHour: body.latestDataHour,
    source: body.source,
    recent: body.recent,
    forecast: body.forecast,
  };
}
