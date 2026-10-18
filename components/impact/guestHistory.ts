// Relative imports so Vitest resolves without an alias.
import {
  GUEST_RUNS_KEY,
  browserStore,
  createRunHistory,
  type KeyValueStore,
  type RunHistory,
} from "../../lib/impact/history";
import type { RunRecord } from "../../lib/types";

/** Same-tab signal when guest runs are saved/updated (storage events are cross-tab only). */
export const GUEST_RUNS_CHANGED_EVENT = "gridwait:guest-runs-changed";

export function notifyGuestRunsChanged(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(GUEST_RUNS_CHANGED_EVENT));
  } catch {
    // Ignore — scoring UI will refresh on the next visit.
  }
}

export function openGuestHistory(store?: KeyValueStore): RunHistory {
  return createRunHistory(store ?? browserStore());
}

export function listGuestRuns(history: RunHistory): RunRecord[] {
  return history.list();
}

export function markGuestRunDone(
  history: RunHistory,
  id: string,
): RunRecord[] {
  history.markDone(id);
  notifyGuestRunsChanged();
  return history.list();
}

export function deleteGuestRun(history: RunHistory, id: string): RunRecord[] {
  history.delete(id);
  notifyGuestRunsChanged();
  return history.list();
}

export { GUEST_RUNS_KEY };
