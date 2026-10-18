import { describe, expect, it } from "vitest";
import {
  createRunHistory,
  type KeyValueStore,
  type RunDraft,
} from "../../lib/impact/history";
import {
  deleteGuestRun,
  listGuestRuns,
  markGuestRunDone,
  openGuestHistory,
} from "./guestHistory";

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
});
