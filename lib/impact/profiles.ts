import { ACTIVITY_CATALOG } from "../constants";
import type { ActivityId, Profile } from "../types";
import {
  browserStore,
  createRunHistory,
  type KeyValueStore,
  type RunHistory,
} from "./history";

export const PROFILES_KEY = "gridwait.v1.profiles";
export const SESSION_KEY = "gridwait.v1.session";
export const PBKDF2_ITERATIONS = 100_000;

const USERNAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const SALT_BYTES = 16;
const HASH_BITS = 256;
const ACTIVITY_IDS: readonly ActivityId[] = [
  "washer",
  "dryer",
  "dishwasher",
  "ev",
  "laptop",
  "custom",
];
const DELAY_START_IDS = new Set<ActivityId>(
  ACTIVITY_CATALOG.filter((activity) => activity.supportsDelayStart).map(
    (activity) => activity.id,
  ),
);

const DEFAULT_DEFAULTS: Profile["defaults"] = {
  activitiesOwned: [],
  delayStart: {},
  sleep: { startHour: 23, endHour: 7 },
};

export type PublicProfile = Omit<Profile, "passwordHash" | "salt">;

export type ProfileErrorCode =
  | "invalid-username"
  | "reserved-username"
  | "username-taken"
  | "weak-password"
  | "invalid-defaults"
  | "invalid-seed"
  | "invalid-credentials"
  | "not-signed-in"
  | "not-found";

export type ProfileResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: ProfileErrorCode };

export type ProfileCreateInput = {
  username: string;
  password: string;
  defaults?: Profile["defaults"];
  diversitySeed?: number;
};

export type Profiles = {
  create(input: ProfileCreateInput): Promise<ProfileResult<PublicProfile>>;
  login(username: string, password: string): Promise<ProfileResult<PublicProfile>>;
  logout(): ProfileResult<null>;
  current(): PublicProfile | null;
  updateDefaults(defaults: Profile["defaults"]): ProfileResult<PublicProfile>;
  reset(username: string): ProfileResult<null>;
  runsKeyFor(username: string): string;
  historyFor(username: string): RunHistory | null;
};

type ProfilesOptions = {
  now?: () => string;
  iterations?: number;
  subtle?: SubtleCrypto;
  getRandomValues?: (bytes: Uint8Array) => Uint8Array;
};

type MemoryEntry = {
  fallenBack: boolean;
  value: string | null;
};

/**
 * After getItem, setItem, or removeItem throws for a key, that key stays in
 * this map for the rest of this profiles instance.
 */
function createFallbackStore(store: KeyValueStore): KeyValueStore {
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
    removeItem(key: string): void {
      const entry = entryFor(key);
      if (entry.fallenBack) {
        entry.value = null;
        return;
      }
      try {
        store.removeItem(key);
        entry.value = null;
      } catch {
        entry.fallenBack = true;
        entry.value = null;
      }
    },
  };
}

export function runsKeyFor(username: string): string {
  return `gridwait.v1.runs.${encodeURIComponent(username)}`;
}

function failure(code: ProfileErrorCode): ProfileResult<never> {
  return { ok: false, code };
}

function isActivityId(value: unknown): value is ActivityId {
  return (
    typeof value === "string" &&
    (ACTIVITY_IDS as readonly string[]).includes(value)
  );
}

function isHour(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23;
}

function copyDefaults(defaults: Profile["defaults"]): Profile["defaults"] {
  return {
    activitiesOwned: [...defaults.activitiesOwned],
    delayStart: { ...defaults.delayStart },
    sleep: {
      startHour: defaults.sleep.startHour,
      endHour: defaults.sleep.endHour,
    },
  };
}

function validateDefaults(value: unknown): Profile["defaults"] | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.activitiesOwned)) return null;

  const activitiesOwned: ActivityId[] = [];
  const seen = new Set<ActivityId>();
  for (const item of record.activitiesOwned) {
    if (!isActivityId(item) || seen.has(item)) return null;
    seen.add(item);
    activitiesOwned.push(item);
  }

  if (
    typeof record.delayStart !== "object" ||
    record.delayStart === null ||
    Array.isArray(record.delayStart)
  ) {
    return null;
  }

  const delayStart: Partial<Record<ActivityId, boolean>> = {};
  for (const [key, toggle] of Object.entries(record.delayStart)) {
    if (!isActivityId(key) || !DELAY_START_IDS.has(key) || typeof toggle !== "boolean") {
      return null;
    }
    delayStart[key] = toggle;
  }

  if (typeof record.sleep !== "object" || record.sleep === null || Array.isArray(record.sleep)) {
    return null;
  }
  const sleep = record.sleep as Record<string, unknown>;
  if (!isHour(sleep.startHour) || !isHour(sleep.endHour)) return null;

  return {
    activitiesOwned,
    delayStart,
    sleep: { startHour: sleep.startHour, endHour: sleep.endHour },
  };
}

function parseProfile(value: unknown): Profile | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.username !== "string" || !USERNAME_PATTERN.test(record.username)) return null;
  if (record.username.toLowerCase() === "guest") return null;
  if (typeof record.passwordHash !== "string" || !/^[0-9a-f]{64}$/.test(record.passwordHash)) {
    return null;
  }
  if (typeof record.salt !== "string" || !/^[0-9a-f]{32}$/.test(record.salt)) return null;
  if (typeof record.createdAt !== "string" || record.createdAt === "") return null;
  if (typeof record.diversitySeed !== "number" || !Number.isFinite(record.diversitySeed)) {
    return null;
  }
  const defaults = validateDefaults(record.defaults);
  if (!defaults) return null;
  return {
    username: record.username,
    passwordHash: record.passwordHash,
    salt: record.salt,
    createdAt: record.createdAt,
    diversitySeed: record.diversitySeed,
    defaults,
  };
}

function toPublic(profile: Profile): PublicProfile {
  return {
    username: profile.username,
    createdAt: profile.createdAt,
    diversitySeed: profile.diversitySeed,
    defaults: copyDefaults(profile.defaults),
  };
}

function usernameFailure(username: string): ProfileErrorCode | null {
  const trimmed = username.trim();
  if (!USERNAME_PATTERN.test(trimmed)) return "invalid-username";
  if (trimmed.toLowerCase() === "guest") return "reserved-username";
  return null;
}

function passwordIsWeak(password: string): boolean {
  return password.length < 8 || password.length > 128;
}

function copyBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  copy.set(bytes);
  return copy;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]+$/.test(hex) || hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function timingSafeEqualHex(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

async function deriveHash(
  password: string,
  salt: Uint8Array,
  iterations: number,
  subtle: SubtleCrypto,
): Promise<string> {
  const material = await subtle.importKey(
    "raw",
    copyBytes(new TextEncoder().encode(password)),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: copyBytes(salt), iterations },
    material,
    HASH_BITS,
  );
  return bytesToHex(new Uint8Array(bits));
}

function resolveIterations(iterations: number | undefined): number {
  if (iterations === undefined) return PBKDF2_ITERATIONS;
  if (!Number.isInteger(iterations) || iterations < 1) return PBKDF2_ITERATIONS;
  return iterations;
}

export function createProfiles(store: KeyValueStore, options?: ProfilesOptions): Profiles {
  const backing = createFallbackStore(store);
  const now = options?.now ?? (() => new Date().toISOString());
  const iterations = resolveIterations(options?.iterations);
  const subtle = options?.subtle ?? globalThis.crypto.subtle;
  const getRandomValues =
    options?.getRandomValues ??
    ((bytes: Uint8Array) => globalThis.crypto.getRandomValues(bytes));

  function readProfiles(): Profile[] {
    const raw = backing.getItem(PROFILES_KEY);
    if (raw === null || raw === "") return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    const profiles: Profile[] = [];
    for (const item of parsed) {
      const profile = parseProfile(item);
      if (profile) profiles.push(profile);
    }
    return profiles;
  }

  function writeProfiles(profiles: Profile[]): void {
    backing.setItem(PROFILES_KEY, JSON.stringify(profiles));
  }

  function readSession(): string | null {
    const raw = backing.getItem(SESSION_KEY);
    if (raw === null || raw === "") return null;
    return raw;
  }

  function findStored(username: string): Profile | undefined {
    const key = username.trim().toLowerCase();
    return readProfiles().find((profile) => profile.username.toLowerCase() === key);
  }

  function randomUint32(): number {
    const bytes = new Uint8Array(4);
    getRandomValues(bytes);
    return new DataView(bytes.buffer).getUint32(0);
  }

  async function create(input: ProfileCreateInput): Promise<ProfileResult<PublicProfile>> {
    if (typeof input.username !== "string") return failure("invalid-username");
    const usernameError = usernameFailure(input.username);
    if (usernameError) return failure(usernameError);
    const username = input.username.trim();

    if (typeof input.password !== "string" || passwordIsWeak(input.password)) {
      return failure("weak-password");
    }

    const defaults =
      input.defaults === undefined ? copyDefaults(DEFAULT_DEFAULTS) : validateDefaults(input.defaults);
    if (!defaults) return failure("invalid-defaults");

    let diversitySeed: number;
    if (input.diversitySeed === undefined) {
      diversitySeed = randomUint32();
    } else if (typeof input.diversitySeed !== "number" || !Number.isFinite(input.diversitySeed)) {
      return failure("invalid-seed");
    } else {
      diversitySeed = input.diversitySeed;
    }

    const profiles = readProfiles();
    if (profiles.some((profile) => profile.username.toLowerCase() === username.toLowerCase())) {
      return failure("username-taken");
    }

    const salt = new Uint8Array(SALT_BYTES);
    getRandomValues(salt);
    const passwordHash = await deriveHash(input.password, salt, iterations, subtle);
    const latest = readProfiles();
    if (latest.some((profile) => profile.username.toLowerCase() === username.toLowerCase())) {
      return failure("username-taken");
    }
    const profile: Profile = {
      username,
      passwordHash,
      salt: bytesToHex(salt),
      createdAt: now(),
      diversitySeed,
      defaults,
    };
    writeProfiles([...latest, profile]);
    return { ok: true, value: toPublic(profile) };
  }

  async function login(
    username: string,
    password: string,
  ): Promise<ProfileResult<PublicProfile>> {
    const profile =
      typeof username === "string" ? findStored(username) : undefined;
    const salt = profile ? hexToBytes(profile.salt) : new Uint8Array(SALT_BYTES);
    const passwordText = typeof password === "string" ? password : "";
    const derived = await deriveHash(
      passwordText,
      salt ?? new Uint8Array(SALT_BYTES),
      iterations,
      subtle,
    );
    if (
      !profile ||
      !salt ||
      typeof password !== "string" ||
      !timingSafeEqualHex(derived, profile.passwordHash)
    ) {
      return failure("invalid-credentials");
    }
    backing.setItem(SESSION_KEY, profile.username);
    return { ok: true, value: toPublic(profile) };
  }

  function logout(): ProfileResult<null> {
    backing.removeItem(SESSION_KEY);
    return { ok: true, value: null };
  }

  function current(): PublicProfile | null {
    const session = readSession();
    if (session === null) return null;
    const profile = readProfiles().find((item) => item.username === session);
    if (!profile) {
      backing.removeItem(SESSION_KEY);
      return null;
    }
    return toPublic(profile);
  }

  function updateDefaults(defaults: Profile["defaults"]): ProfileResult<PublicProfile> {
    const session = readSession();
    if (session === null) return failure("not-signed-in");
    const profiles = readProfiles();
    const index = profiles.findIndex((profile) => profile.username === session);
    if (index < 0) {
      backing.removeItem(SESSION_KEY);
      return failure("not-signed-in");
    }
    const validated = validateDefaults(defaults);
    if (!validated) return failure("invalid-defaults");
    const next: Profile = { ...profiles[index], defaults: validated };
    profiles[index] = next;
    writeProfiles(profiles);
    return { ok: true, value: toPublic(next) };
  }

  function reset(username: string): ProfileResult<null> {
    if (typeof username !== "string") return failure("not-found");
    const profiles = readProfiles();
    const key = username.trim().toLowerCase();
    const index = profiles.findIndex((profile) => profile.username.toLowerCase() === key);
    if (index < 0) return failure("not-found");
    const removed = profiles[index];
    profiles.splice(index, 1);
    writeProfiles(profiles);
    backing.removeItem(runsKeyFor(removed.username));
    const session = readSession();
    if (session !== null && session.toLowerCase() === removed.username.toLowerCase()) {
      backing.removeItem(SESSION_KEY);
    }
    return { ok: true, value: null };
  }

  function historyFor(username: string): RunHistory | null {
    if (typeof username !== "string") return null;
    const profile = findStored(username);
    if (!profile) return null;
    return createRunHistory(backing, {
      runsKey: runsKeyFor(profile.username),
      owner: profile.username,
    });
  }

  return {
    create,
    login,
    logout,
    current,
    updateDefaults,
    reset,
    runsKeyFor,
    historyFor,
  };
}

export function browserProfiles(options?: ProfilesOptions): Profiles {
  return createProfiles(browserStore(), options);
}
