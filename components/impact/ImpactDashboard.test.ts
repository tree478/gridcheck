import { describe, expect, it, vi } from "vitest";
import {
  createRunHistory,
  type KeyValueStore,
  type RunDraft,
} from "../../lib/impact/history";
import {
  GUEST_RUNS_CHANGED_EVENT,
  deleteGuestRun,
  listGuestRuns,
  markGuestRunDone,
  notifyGuestRunsChanged,
  openGuestHistory,
} from "./guestHistory";
import { impactTotals } from "./impactModel";

function draft(overrides: Partial<RunDraft> = {}): RunDraft {
  return {
    activityId: "washer",
    start: "2026-10-18T14:00:00.000Z",
    end: "2026-10-18T15:00:00.000Z",
    kwh: 1.5,
    chosenGrams: 100,
    bestGrams: 80,
    worstGrams: 200,
    soonestGrams: 150,
    confidence: "pattern",
    forecastMadeAt: "2026-10-17T12:00:00.000Z",
    ...overrides,
  };
}

function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
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
  };
}

describe("Impact guest history helpers", () => {
  it("list reflects mark done and delete through a mocked KeyValueStore", () => {
    const store = memoryStore();
    const history = openGuestHistory(store);
    // Stabilize ids so markDone/delete targets stay predictable.
    const seeded = createRunHistory(store, {
      createId: () => "run-impact-1",
      now: () => "2026-10-18T10:00:00.000Z",
    });
    seeded.save(draft());

    expect(listGuestRuns(history)).toHaveLength(1);
    expect(listGuestRuns(history)[0]?.status).toBe("scheduled");

    const afterDone = markGuestRunDone(history, "run-impact-1");
    expect(afterDone).toHaveLength(1);
    expect(afterDone[0]?.status).toBe("done");
    expect(listGuestRuns(openGuestHistory(store))[0]?.status).toBe("done");

    const afterDelete = deleteGuestRun(history, "run-impact-1");
    expect(afterDelete).toHaveLength(0);
    expect(listGuestRuns(openGuestHistory(store))).toHaveLength(0);
  });

  it("changes the overall score when a dirtier run is added then removed", () => {
    const store = memoryStore();
    let nextId = 0;
    const history = createRunHistory(store, {
      createId: () => `run-${(nextId += 1)}`,
      now: () => "2026-10-18T10:00:00.000Z",
    });

    history.save(
      draft({
        activityId: "washer",
        kwh: 1,
        chosenGrams: 80,
        bestGrams: 80,
        worstGrams: 200,
      }),
    );
    const afterClean = impactTotals(listGuestRuns(openGuestHistory(store)));
    expect(afterClean.overallScore).toBe(100);
    expect(afterClean.runCount).toBe(1);

    history.save(
      draft({
        activityId: "ev",
        start: "2026-10-19T14:00:00.000Z",
        end: "2026-10-19T18:00:00.000Z",
        kwh: 10,
        chosenGrams: 200,
        bestGrams: 80,
        worstGrams: 200,
      }),
    );
    const withDirty = listGuestRuns(openGuestHistory(store));
    const afterDirty = impactTotals(withDirty);
    expect(afterDirty.runCount).toBe(2);
    expect(afterDirty.overallScore).toBeCloseTo((100 * 1 + 0 * 10) / 11);
    expect(afterDirty.overallScore).toBeLessThan(afterClean.overallScore);

    const dirtyId = withDirty.find((run) => run.activityId === "ev")?.id;
    expect(dirtyId).toBeDefined();
    const afterRemove = deleteGuestRun(openGuestHistory(store), dirtyId!);
    const totals = impactTotals(afterRemove);
    expect(totals.runCount).toBe(1);
    expect(totals.overallScore).toBe(100);
  });

  it("notifies listeners when guest runs change", () => {
    const listeners = new Map<string, Set<EventListener>>();
    vi.stubGlobal("window", {
      addEventListener(type: string, listener: EventListener) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(listener);
      },
      removeEventListener(type: string, listener: EventListener) {
        listeners.get(type)?.delete(listener);
      },
      dispatchEvent(event: Event) {
        for (const listener of listeners.get(event.type) ?? []) {
          listener(event);
        }
        return true;
      },
    });

    const listener = vi.fn();
    window.addEventListener(GUEST_RUNS_CHANGED_EVENT, listener);
    notifyGuestRunsChanged();
    expect(listener).toHaveBeenCalledTimes(1);

    const store = memoryStore();
    const history = createRunHistory(store, {
      createId: () => "run-notify-1",
      now: () => "2026-10-18T10:00:00.000Z",
    });
    history.save(draft());
    listener.mockClear();
    deleteGuestRun(openGuestHistory(store), "run-notify-1");
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(GUEST_RUNS_CHANGED_EVENT, listener);
    vi.unstubAllGlobals();
  });
});
