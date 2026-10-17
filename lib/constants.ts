import type { Activity, FuelCode, ScoreBand } from "./types";

// All times are displayed in this zone.
export const TIMEZONE = "America/New_York";

// gCO2/kWh, IPCC lifecycle medians. OTH is an assumption based on biomass/refuse.
export const EMISSION_FACTORS: Record<FuelCode, number> = {
  COL: 820,
  OIL: 650,
  NG: 490,
  OTH: 230,
  SUN: 45,
  WAT: 24,
  NUC: 12,
  WND: 11,
};

// "custom" is intentionally absent: its values are user-set (PRD §8).
export const ACTIVITY_CATALOG: Activity[] = [
  {
    id: "washer",
    name: "Washer",
    defaultDurationMin: 60,
    defaultEnergyKwh: 0.5,
    attention: "startEnd",
    supportsDelayStart: true,
  },
  {
    id: "dryer",
    name: "Dryer",
    defaultDurationMin: 60,
    defaultEnergyKwh: 3.0,
    attention: "startEnd",
    supportsDelayStart: false,
  },
  {
    id: "dishwasher",
    name: "Dishwasher",
    defaultDurationMin: 120,
    defaultEnergyKwh: 1.2,
    attention: "start",
    supportsDelayStart: true,
  },
  {
    id: "ev",
    name: "EV charging (Level 2)",
    defaultDurationMin: 240,
    defaultEnergyKwh: 28.8,
    attention: "start",
    supportsDelayStart: true,
  },
  {
    id: "laptop",
    name: "Laptop charging",
    defaultDurationMin: 90,
    defaultEnergyKwh: 0.06,
    attention: "start",
    supportsDelayStart: false,
  },
];

// Shared config (PRD §8).
export const SLOT_MINUTES = 15;
export const ATTENTION_MINUTES = 10;
export const ATTENDED_GAP_MINUTES = 15;
export const CONFIDENCE_MARGIN = 0.1;
export const NEAR_TIE_MARGIN = 0.03;
export const MAX_DELAY_START_HOURS = 24;
export const MAX_ALTERNATIVES = 5;
export const ALTERNATIVE_SPACING_MIN = 60;
// Highest band first; a score belongs to the first band whose min it meets.
export const SCORE_BANDS: { band: ScoreBand; min: number }[] = [
  { band: "Top choice", min: 95 },
  { band: "Great", min: 75 },
  { band: "OK", min: 50 },
  { band: "Could be cleaner", min: 0 },
];
export const FETCH_HISTORY_DAYS = 28;
export const PATTERN_WEEKS = 4; // 3 if one is missing
export const DEMAND_MIN_HOURS = 100; // T-S5, cut
export const DEMAND_MIN_R2 = 0.2; // T-S5, cut
export const EIA_TIMEOUT_MS = 8000;
export const EIA_PAGE_SIZE = 5000;
export const GRID_CACHE_SECONDS = 3600;
export const ALARM_LEAD_MINUTES = 15;
export const MAX_HORIZON_DAYS = 7;
