import { describe, expect, it } from "vitest";
import type { RunRecord } from "../types";
import {
  DIVERSITY_SEED_KEY,
  GUEST_RUNS_KEY,
  createRunHistory,
  type KeyValueStore,
  type RunDraft,
} from "./history";

const CREATED_AT = "2026-10-17T20:00:00.000Z";

function draft(overrides: Partial<RunDraft> = {}): RunDraft {
  return {
    activityId: "washer",
    start: "2026-10-18T14:00:00.000Z",
    end: "2026-10-18T15:00:00.000Z",
    kwh: 1.23456789,
    chosenGrams: 10.5,
    bestGrams: -2,
    worstGrams: 40.25,
    soonestGrams: 0,
    confidence: "measured",
    forecastMadeAt: "2026-10-17T12:00:00.000Z",
    ...overrides,
  };
}

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & {
  snapshot(): Record<string, string>;
} {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return data.has(key) ? (data.get(key) ?? null) : null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
    snapshot() {
      return Object.fromEntries(data);
    },
  };
}

function throwingStore(): KeyValueStore {
  return {
    getItem() {
      throw new Error("getItem failed");
    },
    setItem() {
      throw new Error("setItem failed");
    },
    removeItem() {
      throw new Error("removeItem failed");
    },
  };
}

function storedRuns(store: KeyValueStore, key = GUEST_RUNS_KEY): unknown {
  const raw = store.getItem(key);
  if (raw === null) throw new Error(`missing ${key}`);
  return JSON.parse(raw) as unknown;
}

describe("createRunHistory", () => {
  it("round-trips an injected id and createdAt without mutating the draft", () => {
    const store = memoryStore();
    const history = createRunHistory(store, {
      now: () => CREATED_AT,
      createId: () => "run-1",
    });
    const input = Object.freeze(draft());
    const saved = history.save(input);

    expect(saved).toEqual({
      ...input,
      id: "run-1",
      owner: "guest",
      status: "scheduled",
      createdAt: CREATED_AT,
    });
    expect(input).toEqual(draft());
    expect(saved).not.toBe(history.list()[0]);

    saved.kwh = 99;
    expect(history.list()[0]).toEqual({
      ...draft(),
      id: "run-1",
      owner: "guest",
      status: "scheduled",
      createdAt: CREATED_AT,
    });
    expect(storedRuns(store)).toEqual([
      {
        ...draft(),
        id: "run-1",
        owner: "guest",
        status: "scheduled",
        createdAt: CREATED_AT,
      },
    ]);
  });

  it("lists newest start first, then newer createdAt, then id descending", () => {
    const store = memoryStore();
    const steps = [
      {
        id: "oldest-start",
        createdAt: "2026-10-17T01:00:00.000Z",
        start: "2026-10-17T08:00:00.000Z",
      },
      {
        id: "newest-start",
        createdAt: "2026-10-17T02:00:00.000Z",
        start: "2026-10-19T08:00:00.000Z",
      },
      {
        id: "same-start-older",
        createdAt: "2026-10-17T03:00:00.000Z",
        start: "2026-10-18T08:00:00.000Z",
      },
      {
        id: "same-start-newer",
        createdAt: "2026-10-17T04:00:00.000Z",
        start: "2026-10-18T08:00:00.000Z",
      },
      {
        id: "tie-b",
        createdAt: "2026-10-17T05:00:00.000Z",
        start: "2026-10-18T08:00:00.000Z",
      },
      {
        id: "tie-a",
        createdAt: "2026-10-17T05:00:00.000Z",
        start: "2026-10-18T08:00:00.000Z",
      },
      {
        id: "unparseable",
        createdAt: "2026-10-17T06:00:00.000Z",
        start: "not-a-time",
      },
    ];
    let index = 0;
    const history = createRunHistory(store, {
      createId: () => steps[index]?.id ?? "missing",
      now: () => steps[index]?.createdAt ?? CREATED_AT,
    });
    for (const step of steps) {
      history.save(draft({ start: step.start }));
      index += 1;
    }

    expect(history.list().map((record) => record.id)).toEqual([
      "newest-start",
      "tie-b",
      "tie-a",
      "same-start-newer",
      "same-start-older",
      "oldest-start",
      "unparseable",
    ]);
  });

  it("marks a run done without changing grams, and ignores an unknown id", () => {
    const store = memoryStore();
    const history = createRunHistory(store, {
      now: () => CREATED_AT,
      createId: () => "run-1",
    });
    const saved = history.save(draft());
    const beforeUnknown = store.getItem(GUEST_RUNS_KEY);

    expect(history.markDone("missing")).toBe(false);
    expect(store.getItem(GUEST_RUNS_KEY)).toBe(beforeUnknown);

    expect(history.markDone("run-1")).toBe(true);
    expect(history.list()[0]).toEqual({ ...saved, status: "done" });

    expect(history.markDone("run-1")).toBe(true);
    expect(history.list()[0]?.status).toBe("done");
    expect(history.list()[0]?.chosenGrams).toBe(saved.chosenGrams);
  });

  it("deletes one id, rejects an unknown id, and stores [] after the last run", () => {
    const store = memoryStore();
    const steps = [
      { id: "keep", createdAt: "2026-10-17T01:00:00.000Z" },
      { id: "drop", createdAt: "2026-10-17T02:00:00.000Z" },
    ];
    let index = 0;
    const history = createRunHistory(store, {
      createId: () => steps[index]?.id ?? "missing",
      now: () => steps[index]?.createdAt ?? CREATED_AT,
    });
    history.save(draft({ start: "2026-10-18T01:00:00.000Z" }));
    index = 1;
    history.save(draft({ start: "2026-10-18T02:00:00.000Z" }));

    const beforeUnknown = store.getItem(GUEST_RUNS_KEY);
    expect(history.delete("missing")).toBe(false);
    expect(store.getItem(GUEST_RUNS_KEY)).toBe(beforeUnknown);

    expect(history.delete("drop")).toBe(true);
    expect(history.list().map((record) => record.id)).toEqual(["keep"]);

    expect(history.delete("keep")).toBe(true);
    expect(store.getItem(GUEST_RUNS_KEY)).not.toBeNull();
    expect(storedRuns(store)).toEqual([]);
  });

  it("keeps a custom runs key separate and defaults to the guest key and owner", () => {
    const store = memoryStore();
    const guest = createRunHistory(store, {
      now: () => CREATED_AT,
      createId: () => "guest-run",
    });
    guest.save(draft());

    const other = createRunHistory(store, {
      runsKey: "gridwait.v1.runs.other",
      now: () => CREATED_AT,
      createId: () => "other-run",
    });
    expect(other.list()).toEqual([]);
    const otherSaved = other.save(draft({ activityId: "dryer" }));
    expect(otherSaved.owner).toBe("guest");
    expect(other.list().map((record) => record.id)).toEqual(["other-run"]);
    expect(guest.list().map((record) => record.id)).toEqual(["guest-run"]);

    const withDefaults = memoryStore();
    const plain = createRunHistory(withDefaults);
    const saved = plain.save(draft());
    expect(saved.owner).toBe("guest");
    expect(saved.status).toBe("scheduled");
    expect(Object.keys(withDefaults.snapshot())).toEqual([GUEST_RUNS_KEY]);
    expect(storedRuns(withDefaults)).toEqual([saved]);
  });

  it("stores a finite diversity seed and rejects a non-finite one", () => {
    const store = memoryStore();
    const history = createRunHistory(store);

    expect(history.readSeed()).toBeNull();
    expect(history.writeSeed(42)).toBe(true);
    expect(store.getItem(DIVERSITY_SEED_KEY)).toBe("42");
    expect(history.readSeed()).toBe(42);

    expect(history.writeSeed(Number.NaN)).toBe(false);
    expect(store.getItem(DIVERSITY_SEED_KEY)).toBe("42");
    expect(history.readSeed()).toBe(42);

    store.setItem(DIVERSITY_SEED_KEY, "nope");
    expect(history.readSeed()).toBeNull();
  });

  it("serves an empty list when getItem throws, then keeps a save in memory", () => {
    const history = createRunHistory(throwingStore(), {
      now: () => CREATED_AT,
      createId: () => "mem-1",
    });

    expect(history.list()).toEqual([]);
    const saved = history.save(draft());
    expect(history.list()).toEqual([saved]);
  });

  it("does not reread the store after setItem throws", () => {
    let reads = 0;
    const store: KeyValueStore = {
      getItem() {
        reads += 1;
        return "[]";
      },
      setItem() {
        throw new Error("setItem failed");
      },
      removeItem() {
        throw new Error("removeItem failed");
      },
    };
    const history = createRunHistory(store, {
      now: () => CREATED_AT,
      createId: () => "mem-2",
    });
    const saved = history.save(draft());
    const readsAfterSave = reads;

    expect(history.list()).toEqual([saved]);
    expect(history.markDone(saved.id)).toBe(true);
    expect(history.list()[0]?.status).toBe("done");
    expect(reads).toBe(readsAfterSave);
  });

  it("treats invalid JSON as no runs, then saves a one-element array", () => {
    const store = memoryStore({ [GUEST_RUNS_KEY]: "not json" });
    const history = createRunHistory(store, {
      now: () => CREATED_AT,
      createId: () => "recovered",
    });

    expect(history.list()).toEqual([]);
    const saved = history.save(draft());
    expect(storedRuns(store)).toEqual([saved]);
  });

  it("skips a stored object that is missing chosenGrams", () => {
    const valid: RunRecord = {
      ...draft(),
      id: "valid",
      owner: "guest",
      status: "scheduled",
      createdAt: CREATED_AT,
    };
    const broken: Record<string, unknown> = { ...valid, id: "broken" };
    delete broken.chosenGrams;
    const store = memoryStore({
      [GUEST_RUNS_KEY]: JSON.stringify([valid, broken]),
    });
    const history = createRunHistory(store);

    expect(history.list()).toEqual([valid]);
  });

  it("does not share fallback memory across history instances", () => {
    const store = throwingStore();
    const first = createRunHistory(store, {
      now: () => CREATED_AT,
      createId: () => "first",
    });
    const second = createRunHistory(store, {
      now: () => CREATED_AT,
      createId: () => "second",
    });

    first.save(draft());
    expect(first.list().map((record) => record.id)).toEqual(["first"]);
    expect(second.list()).toEqual([]);

    second.save(draft({ activityId: "ev" }));
    expect(second.list().map((record) => record.id)).toEqual(["second"]);
    expect(first.list().map((record) => record.id)).toEqual(["first"]);
  });
});
