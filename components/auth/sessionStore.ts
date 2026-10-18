/**
 * In-memory mock session only. Cleared on full page refresh.
 * Not persisted — accounts remain CUT / on-device mock.
 */

let username: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function getSessionUsername(): string | null {
  return username;
}

export function setSessionUsername(next: string | null): void {
  username = next;
  emit();
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
