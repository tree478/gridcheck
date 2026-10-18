// Relative imports so Vitest resolves without an alias.
import {
  browserStore,
  createRunHistory,
  type KeyValueStore,
  type RunHistory,
} from "../../lib/impact/history";
import type { RunRecord } from "../../lib/types";

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
  return history.list();
}

export function deleteGuestRun(history: RunHistory, id: string): RunRecord[] {
  history.delete(id);
  return history.list();
}
