export type FuelCode = "COL" | "NG" | "NUC" | "OIL" | "WAT" | "SUN" | "WND" | "OTH";

export type HourIntensity = {
  hourStart: string;        // ISO 8601 with offset, America/New_York
  gco2PerKwh: number;
  isForecast: boolean;
};

export type GridResponse = {
  region: "ISNE";
  generatedAt: string;      // ISO
  latestDataHour: string;   // ISO, last hour of actual EIA data
  source: "live" | "fallback";
  recent: HourIntensity[];  // last 48 hours of actual data
  forecast: HourIntensity[];// 168 hours from the current hour
};

export type BusyBlock = { start: string; end: string; title?: string };

export type Appliance = {
  id: "laundry" | "dryer" | "dishwasher" | "ev" | "custom";
  name: string;
  defaultRuntimeMin: number;
  powerKw: number;          // average draw while running
  needsPresenceAtStart: boolean;
  needsPresenceAtEnd: boolean;
  presenceMinutes: number;  // default 10
};

export type AvailableHours = { startHour: number; endHour: number }; // e.g. 7, 23

export type ScheduleRequest = {
  appliance: Appliance;
  runtimeMin: number;
  now: string;              // ISO
  deadline: string;         // ISO, ≤ 7 days from now
  busy: BusyBlock[];
  availableHours: AvailableHours;
  forecast: HourIntensity[];
  diversitySeed: number;
};

export type OptionKind = "greenest" | "balanced" | "soonest";

export type ScheduleOption = {
  kind: OptionKind;
  start: string;
  end: string;
  modeledGrams: number;
  diffVsSoonestGrams: number;   // negative = cleaner
  diffVsSoonestPct: number;
  presenceWindows: { start: string; end: string }[];
};

export type ScheduleResult =
  | { ok: true; options: ScheduleOption[] }
  | { ok: false; reason: string };

export type ImpactLogEntry = {
  id: string;
  applianceId: Appliance["id"];
  start: string;
  end: string;
  kwh: number;
  modeledGrams: number;
  baselineGrams: number;        // the Soonest option's grams
  status: "scheduled" | "completed";
  createdAt: string;
};
