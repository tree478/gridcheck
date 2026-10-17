import { beforeEach, describe, expect, it, vi } from "vitest";
import { GRID_CACHE_SECONDS } from "../constants";
import type { HourIntensity } from "../types";
import { EiaError, toNewYorkIso, type EiaFuelRow } from "./eia";
import fallbackJson from "./fallback.json";
import { getGrid, resetGridCache } from "./grid";

const HOUR_MS = 60 * 60 * 1000;
const FALLBACK = fallbackJson as HourIntensity[];

// 16:32 EDT; the EIA data ends 15 h earlier, as it does in practice.
const NOW = new Date("2026-10-17T20:32:00Z");
const LAG_HOURS = 15;

// Four weeks of all-gas generation ending LAG_HOURS before now → 490 g everywhere.
function liveRows(now: Date): EiaFuelRow[] {
  const endMs = Math.floor(now.getTime() / HOUR_MS) * HOUR_MS - LAG_HOURS * HOUR_MS;
  const rows: EiaFuelRow[] = [];
  for (let ms = endMs - 28 * 24 * HOUR_MS; ms <= endMs; ms += HOUR_MS) {
    rows.push({ hourStart: toNewYorkIso(ms), fuelCode: "NG", mwh: 1000 });
  }
  return rows;
}

const live = () => vi.fn(async ({ now }: { now?: Date } = {}) => liveRows(now ?? NOW));
const failing = (err: Error) =>
  vi.fn(async (): Promise<EiaFuelRow[]> => {
    throw err;
  });

beforeEach(() => {
  resetGridCache();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("getGrid", () => {
  it("serves live data when EIA succeeds", async () => {
    const fetcher = live();
    const grid = await getGrid(NOW, fetcher);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(grid.source).toBe("live");
    expect(grid.recent.every((h) => h.gco2PerKwh === 490)).toBe(true);
    expect(grid.forecast.every((h) => h.gco2PerKwh === 490)).toBe(true);
    expect(grid.latestDataHour).toBe(toNewYorkIso(Date.parse("2026-10-17T20:00:00Z") - LAG_HOURS * HOUR_MS));
  });

  it.each([
    new EiaError("timeout", "EIA request timed out"),
    new EiaError("auth", "EIA rejected the API key", 403),
    new EiaError("http", "EIA returned HTTP 504", 504),
  ])("falls back to the snapshot on EiaError ($kind)", async (err) => {
    const grid = await getGrid(NOW, failing(err));
    expect(grid.source).toBe("fallback");
    expect(grid.recent).toEqual(FALLBACK.slice(-48));
    expect(grid.latestDataHour).toBe(FALLBACK.at(-1)?.hourStart);
  });

  it("falls back when EIA returns no usable hours", async () => {
    const grid = await getGrid(NOW, vi.fn(async () => []));
    expect(grid.source).toBe("fallback");
  });

  it("rethrows errors that are not EiaError", async () => {
    await expect(getGrid(NOW, failing(new TypeError("bug")))).rejects.toThrow("bug");
  });

  it("matches the GridResponse shape with no gap hours", async () => {
    const grid = await getGrid(NOW, live());
    expect(Object.keys(grid).sort()).toEqual(
      ["forecast", "forecastMadeAt", "generatedAt", "latestDataHour", "recent", "region", "source"],
    );
    expect(grid.region).toBe("ISNE");
    expect(grid.generatedAt).toBe(NOW.toISOString());
    expect(grid.forecastMadeAt).toBe(NOW.toISOString());
    expect(grid.recent).toHaveLength(48);
    expect(grid.recent.every((h) => h.tier === "measured")).toBe(true);
    expect(grid.recent.at(-1)?.hourStart).toBe(grid.latestDataHour);
    expect(grid.forecast).toHaveLength(168);
    expect(grid.forecast.every((h) => h.tier === "pattern")).toBe(true);
    expect(grid.forecast[0].hourStart).toBe("2026-10-17T16:00:00-04:00");
    // Nothing between the latest measured hour and the current hour.
    const latest = Date.parse(grid.latestDataHour);
    const current = Date.parse(grid.forecast[0].hourStart);
    const all = [...grid.recent, ...grid.forecast].map((h) => Date.parse(h.hourStart));
    expect(all.filter((ms) => ms > latest && ms < current)).toEqual([]);
  });

  it("starts the fallback forecast at the current hour weeks after the snapshot", async () => {
    const later = new Date("2026-11-20T15:10:00Z"); // after DST ends: 10:10 EST
    const grid = await getGrid(later, failing(new EiaError("timeout", "EIA request timed out")));
    expect(grid.source).toBe("fallback");
    expect(grid.forecast).toHaveLength(168);
    expect(grid.forecast[0].hourStart).toBe("2026-11-20T10:00:00-05:00");
    expect(grid.forecast.every((h) => Number.isFinite(h.gco2PerKwh))).toBe(true);
  });

  it("caches measured data for GRID_CACHE_SECONDS but recomputes the forecast", async () => {
    const fetcher = live();
    await getGrid(NOW, fetcher);
    const nextHour = new Date(NOW.getTime() + HOUR_MS - 60_000);
    const cached = await getGrid(nextHour, fetcher);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(cached.forecast[0].hourStart).toBe("2026-10-17T17:00:00-04:00");

    await getGrid(new Date(NOW.getTime() + GRID_CACHE_SECONDS * 1000), fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("shares one EIA call between concurrent requests", async () => {
    const fetcher = live();
    const [a, b] = await Promise.all([getGrid(NOW, fetcher), getGrid(NOW, fetcher)]);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(a).toEqual(b);
  });
});
