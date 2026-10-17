import { EMISSION_FACTORS } from "../constants";
import type { FuelCode, HourIntensity } from "../types";
import type { EiaFuelRow } from "./eia";

// Hourly carbon intensity (gCO2/kWh) from EIA generation by fuel.

// Storage discharges energy generated in other hours, so it is left out.
const EXCLUDED = new Set(["BAT", "PS"]);
const ALIASES: Record<string, FuelCode> = { SNB: "SUN" };

function isFuelCode(code: string): code is FuelCode {
  return Object.hasOwn(EMISSION_FACTORS, code);
}

export function computeIntensity(rows: EiaFuelRow[]): HourIntensity[] {
  const hours = new Map<string, { grams: number; mwh: number }>();
  const warned = new Set<string>();

  for (const row of rows) {
    if (EXCLUDED.has(row.fuelCode)) continue;
    let fuel = ALIASES[row.fuelCode] ?? row.fuelCode;
    if (!isFuelCode(fuel)) {
      if (!warned.has(row.fuelCode)) {
        warned.add(row.fuelCode);
        console.warn(`Unknown EIA fuel code, treated as OTH: ${row.fuelCode}`);
      }
      fuel = "OTH";
    }
    const mwh = Math.max(0, row.mwh);
    const hour = hours.get(row.hourStart) ?? { grams: 0, mwh: 0 };
    hour.grams += mwh * EMISSION_FACTORS[fuel];
    hour.mwh += mwh;
    hours.set(row.hourStart, hour);
  }

  // Hours with no generation are dropped, never reported as 0.
  const out: HourIntensity[] = [];
  for (const [hourStart, { grams, mwh }] of hours) {
    if (mwh > 0) out.push({ hourStart, gco2PerKwh: grams / mwh, tier: "measured" });
  }
  return out.sort((a, b) => Date.parse(a.hourStart) - Date.parse(b.hourStart));
}
