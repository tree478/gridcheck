import type { Appliance, AvailableHours, FuelCode } from "./types";

// All times are displayed in this zone.
export const TIMEZONE = "America/New_York";

// gCO2/kWh, IPCC lifecycle medians. OTH is an assumption based on biomass/refuse.
export const EMISSION_FACTORS: Record<FuelCode, number> = {
  COL: 820,
  NG: 490,
  OIL: 650,
  SUN: 45,
  WAT: 24,
  NUC: 12,
  WND: 11,
  OTH: 230,
};

export const SLOT_MINUTES = 15;
export const PRESENCE_MINUTES = 10;
export const BALANCED_TOLERANCE = 0.1;
export const DIVERSITY_TOLERANCE = 0.03;
export const FORECAST_HISTORY_DAYS = 14;
export const FETCH_HISTORY_DAYS = 21;
export const DEFAULT_AVAILABLE_HOURS: AvailableHours = { startHour: 7, endHour: 23 };

// "custom" is intentionally absent: its values are user-set (PRD §8).
export const APPLIANCE_PRESETS: Appliance[] = [
  {
    id: "laundry",
    name: "Washer",
    defaultRuntimeMin: 60,
    powerKw: 0.5,
    needsPresenceAtStart: true,
    needsPresenceAtEnd: true,
    presenceMinutes: PRESENCE_MINUTES,
  },
  {
    id: "dryer",
    name: "Dryer",
    defaultRuntimeMin: 60,
    powerKw: 3.0,
    needsPresenceAtStart: true,
    needsPresenceAtEnd: true,
    presenceMinutes: PRESENCE_MINUTES,
  },
  {
    id: "dishwasher",
    name: "Dishwasher",
    defaultRuntimeMin: 120,
    powerKw: 0.6,
    needsPresenceAtStart: true,
    needsPresenceAtEnd: false,
    presenceMinutes: PRESENCE_MINUTES,
  },
  {
    id: "ev",
    name: "EV charging (Level 2)",
    defaultRuntimeMin: 240,
    powerKw: 7.2,
    needsPresenceAtStart: true,
    needsPresenceAtEnd: false,
    presenceMinutes: PRESENCE_MINUTES,
  },
];
