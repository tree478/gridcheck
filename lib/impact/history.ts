import type { ActivityId, RunRecord, Tier } from "../types";

export const GUEST_RUNS_KEY = "gridwait.v1.runs.guest";
export const DIVERSITY_SEED_KEY = "gridwait.v1.seed";

export type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type RunDraft = {
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
};

export type RunHistory = {
  save(draft: RunDraft): RunRecord;
  list(): RunRecord[];
  markDone(id: string): boolean;
  delete(id: string): boolean;
  readSeed(): number | null;
  writeSeed(seed: number): boolean;
};

type RunHistoryOptions = {
  runsKey?: string;
  owner?: string;
  now?: () => string;
  createId?: () => string;
};

type MemoryEntry = {
  fallenBack: boolean;
  value: string | null;
};

/**
 * After getItem or setItem throws for a key, that key stays in this map
 * for the rest of this history instance. A later createRunHistory does
 * not see it.
 */
function createFallbackStore(store: KeyValueStore): {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
} {
  const entries = new Map<string, MemoryEntry>();

  function entryFor(key: string): MemoryEntry {
    const existing = entries.get(key);
    if (existing) return existing;
    const created: MemoryEntry = { fallenBack: false, value: null };
    entries.set(key, created);
    return created;
  }

  return {
    getItem(key: string): string | null {
      const entry = entryFor(key);
      if (entry.fallenBack) return entry.value;
      try {
        const value = store.getItem(key);
        entry.value = value;
        return value;
      } catch {
        entry.fallenBack = true;
        return entry.value;
      }
    },
    setItem(key: string, value: string): void {
      const entry = entryFor(key);
      if (entry.fallenBack) {
        entry.value = value;
        return;
      }
      try {
        store.setItem(key, value);
        entry.value = value;
      } catch {
        entry.fallenBack = true;
        entry.value = value;
      }
    },
  };
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isActivityId(value: unknown): value is ActivityId {
  return (
    value === "washer" ||
    value === "dryer" ||
    value === "dishwasher" ||
    value === "ev" ||
    value === "laptop" ||
    value === "custom"
  );
}

function isTier(value: unknown): value is Tier {
  return value === "measured" || value === "forecast" || value === "pattern";
}

function isStatus(value: unknown): value is RunRecord["status"] {
  return value === "scheduled" || value === "done";
}

function isRunRecord(value: unknown): value is RunRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    isString(record.id) &&
    isString(record.owner) &&
    isActivityId(record.activityId) &&
    isString(record.start) &&
    isString(record.end) &&
    isFiniteNumber(record.kwh) &&
    isFiniteNumber(record.chosenGrams) &&
    isFiniteNumber(record.bestGrams) &&
    isFiniteNumber(record.worstGrams) &&
    isFiniteNumber(record.soonestGrams) &&
    isTier(record.confidence) &&
    isString(record.forecastMadeAt) &&
    isStatus(record.status) &&
    isString(record.createdAt)
  );
}

function copyRecord(record: RunRecord): RunRecord {
  return {
    id: record.id,
    owner: record.owner,
    activityId: record.activityId,
    start: record.start,
    end: record.end,
    kwh: record.kwh,
    chosenGrams: record.chosenGrams,
    bestGrams: record.bestGrams,
    worstGrams: record.worstGrams,
    soonestGrams: record.soonestGrams,
    confidence: record.confidence,
    forecastMadeAt: record.forecastMadeAt,
    status: record.status,
    createdAt: record.createdAt,
  };
}

function compareInstantDesc(left: string, right: string): number {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  const leftOk = !Number.isNaN(leftTime);
  const rightOk = !Number.isNaN(rightTime);
  if (leftOk && rightOk) {
    if (leftTime === rightTime) return 0;
    return leftTime > rightTime ? -1 : 1;
  }
  if (leftOk) return -1;
  if (rightOk) return 1;
  return 0;
}

function compareRecords(left: RunRecord, right: RunRecord): number {
  const byStart = compareInstantDesc(left.start, right.start);
  if (byStart !== 0) return byStart;
  const byCreated = compareInstantDesc(left.createdAt, right.createdAt);
  if (byCreated !== 0) return byCreated;
  return right.id.localeCompare(left.id);
}

function readFiniteSeed(raw: string | null): number | null {
  if (raw === null || raw === "") return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "number" && Number.isFinite(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function createRunHistory(
  store: KeyValueStore,
  options?: RunHistoryOptions,
): RunHistory {
  const runsKey = options?.runsKey ?? GUEST_RUNS_KEY;
  const owner = options?.owner ?? "guest";
  const now = options?.now ?? (() => new Date().toISOString());
  const createId = options?.createId ?? (() => crypto.randomUUID());
  const backing = createFallbackStore(store);

  function readRuns(): RunRecord[] {
    const raw = backing.getItem(runsKey);
    if (raw === null || raw === "") return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    const records: RunRecord[] = [];
    for (const item of parsed) {
      if (isRunRecord(item)) records.push(copyRecord(item));
    }
    return records;
  }

  function writeRuns(records: RunRecord[]): void {
    backing.setItem(runsKey, JSON.stringify(records));
  }

  function save(draft: RunDraft): RunRecord {
    const record: RunRecord = {
      id: createId(),
      owner,
      activityId: draft.activityId,
      start: draft.start,
      end: draft.end,
      kwh: draft.kwh,
      chosenGrams: draft.chosenGrams,
      bestGrams: draft.bestGrams,
      worstGrams: draft.worstGrams,
      soonestGrams: draft.soonestGrams,
      confidence: draft.confidence,
      forecastMadeAt: draft.forecastMadeAt,
      status: "scheduled",
      createdAt: now(),
    };
    writeRuns([...readRuns(), record]);
    return copyRecord(record);
  }

  function list(): RunRecord[] {
    return readRuns().sort(compareRecords);
  }

  function markDone(id: string): boolean {
    const records = readRuns();
    let found = false;
    for (const record of records) {
      if (record.id !== id) continue;
      record.status = "done";
      found = true;
    }
    if (!found) return false;
    writeRuns(records);
    return true;
  }

  function remove(id: string): boolean {
    const records = readRuns();
    const remaining = records.filter((record) => record.id !== id);
    if (remaining.length === records.length) return false;
    writeRuns(remaining);
    return true;
  }

  function readSeed(): number | null {
    return readFiniteSeed(backing.getItem(DIVERSITY_SEED_KEY));
  }

  function writeSeed(seed: number): boolean {
    if (!Number.isFinite(seed)) return false;
    backing.setItem(DIVERSITY_SEED_KEY, JSON.stringify(seed));
    return true;
  }

  return {
    save,
    list,
    markDone,
    delete: remove,
    readSeed,
    writeSeed,
  };
}

export function browserStore(): KeyValueStore {
  if (globalThis.localStorage) return globalThis.localStorage;
  const unavailable = (): never => {
    throw new Error("localStorage is unavailable");
  };
  return {
    getItem: unavailable,
    setItem: unavailable,
    removeItem: unavailable,
  };
}
