export type FuelCode = "COL" | "NG" | "NUC" | "OIL" | "WAT" | "SUN" | "WND" | "OTH";

export type Tier = "measured" | "forecast" | "pattern";

export type HourIntensity = {
  hourStart: string;          // ISO 8601 with offset, America/New_York
  gco2PerKwh: number;
  tier: Tier;
};

export type GridResponse = {
  region: "ISNE";
  generatedAt: string;        // ISO
  forecastMadeAt: string;     // ISO, when forecast/pattern values were computed
  latestDataHour: string;     // ISO, last hour of measured data
  source: "live" | "fallback";
  recent: HourIntensity[];    // last 48 h, tier "measured"
  forecast: HourIntensity[];  // 168 h from the current hour, tier "forecast" | "pattern"
};

export type BusyBlock = {
  start: string;
  end: string;
  asleep: boolean;
  title?: string;             // session only, never stored
};

export type AttentionType = "start" | "startEnd" | "throughout";

export type ActivityId = "washer" | "dryer" | "dishwasher" | "ev" | "laptop" | "custom";

export type Activity = {
  id: ActivityId;
  name: string;
  defaultDurationMin: number;
  defaultEnergyKwh: number;   // energy per cycle
  attention: AttentionType;
  supportsDelayStart: boolean;
};

export type PlannedActivity = {
  activity: Activity;
  durationMin: number;
  energyKwh: number;
  delayStart: boolean;
};

export type FixedRun = {      // an already-chosen run, for multi-appliance re-ranking
  activityId: ActivityId;
  start: string;
  end: string;
  attendedMoments: { start: string; end: string }[];
};

export type ScheduleRequest = {
  items: PlannedActivity[];   // length 1 for single-appliance
  now: string;                // ISO
  deadline: string;           // ISO, ≤ 7 days from now
  busy: BusyBlock[];
  fixedRuns: FixedRun[];
  forecast: HourIntensity[];
  diversitySeed: number;      // stored per device in local storage
};

export type OptionLabel = "recommended" | "best" | "greenest" | "soonest" | "worst" | "alternative";

export type ScheduleOption = {
  labels: OptionLabel[];      // merged when options coincide
  start: string;
  end: string;
  loadAt?: string;            // delay-start: when the user loads it
  modeledGrams: number;
  savedVsSoonestGrams: number;// Soonest − this; positive = cleaner
  savedVsSoonestPct: number;
  confidence: Tier;           // lowest-confidence tier among its slots
  attendedMoments: { start: string; end: string }[];
};

export type ActivityResult =
  | {
      ok: true;
      activityId: ActivityId;
      options: ScheduleOption[];
      reference: { bestGrams: number; worstGrams: number; soonestGrams: number; greenestGrams: number };
    }
  | { ok: false; activityId: ActivityId; reason: string; suggestion?: string };

export type ScheduleResult = { results: ActivityResult[] };

export type RunRecord = {
  id: string;
  owner: string;              // "guest" this weekend
  activityId: ActivityId;
  start: string;
  end: string;
  kwh: number;
  chosenGrams: number;
  bestGrams: number;
  worstGrams: number;
  soonestGrams: number;
  confidence: Tier;
  forecastMadeAt: string;
  status: "scheduled" | "done";
  createdAt: string;
};

// Future work (accounts cut this weekend). Keep for reference; nothing imports it yet.
export type Profile = {
  username: string;
  passwordHash: string;       // Web Crypto, never plain text
  salt: string;
  createdAt: string;
  diversitySeed: number;
  defaults: {
    activitiesOwned: ActivityId[];
    delayStart: Partial<Record<ActivityId, boolean>>;
    sleep: { startHour: number; endHour: number };
  };
};

export type ScoreBand = "Top choice" | "Great" | "OK" | "Could be cleaner";
