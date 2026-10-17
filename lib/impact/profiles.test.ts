import { describe, expect, it } from "vitest";
import type { RunDraft } from "./history";
import { DIVERSITY_SEED_KEY, GUEST_RUNS_KEY, type KeyValueStore } from "./history";
import {
  PBKDF2_ITERATIONS,
  PROFILES_KEY,
  SESSION_KEY,
  createProfiles,
  runsKeyFor,
  type ProfileResult,
  type PublicProfile,
} from "./profiles";

const CREATED_AT = "2026-10-17T20:00:00.000Z";
const PASSWORD = "s3cret-phrase";

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

function openProfiles(store: KeyValueStore, iterations = 1) {
  return createProfiles(store, {
    iterations,
    now: () => CREATED_AT,
  });
}

function draft(): RunDraft {
  return {
    activityId: "washer",
    start: "2026-10-18T14:00:00.000Z",
    end: "2026-10-18T15:00:00.000Z",
    kwh: 0.5,
    chosenGrams: 10,
    bestGrams: 8,
    worstGrams: 40,
    soonestGrams: 20,
    confidence: "pattern",
    forecastMadeAt: "2026-10-17T12:00:00.000Z",
  };
}

function unwrap(result: ProfileResult<PublicProfile>): PublicProfile {
  if (!result.ok) throw new Error(result.code);
  return result.value;
}

function storedProfiles(store: KeyValueStore): {
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  diversitySeed: number;
}[] {
  const raw = store.getItem(PROFILES_KEY);
  if (raw === null) throw new Error("missing profiles");
  return JSON.parse(raw) as {
    username: string;
    passwordHash: string;
    salt: string;
    createdAt: string;
    diversitySeed: number;
  }[];
}

describe("createProfiles", () => {
  it("stores a hash and salt and leaves the password out of storage", async () => {
    const store = memoryStore();
    const profiles = openProfiles(store);
    const created = unwrap(await profiles.create({ username: "Ada", password: PASSWORD }));

    expect(created).toEqual({
      username: "Ada",
      createdAt: CREATED_AT,
      diversitySeed: expect.any(Number),
      defaults: {
        activitiesOwned: [],
        delayStart: {},
        sleep: { startHour: 23, endHour: 7 },
      },
    });
    expect(created).not.toHaveProperty("passwordHash");
    expect(created).not.toHaveProperty("salt");
    expect(JSON.stringify(store.snapshot())).not.toContain(PASSWORD);

    const stored = storedProfiles(store)[0];
    expect(stored.passwordHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.salt).toMatch(/^[0-9a-f]{32}$/);
    expect(stored.passwordHash).not.toBe(PASSWORD);
    expect(store.getItem(SESSION_KEY)).toBeNull();
    expect(store.getItem(GUEST_RUNS_KEY)).toBeNull();
    expect(store.getItem(DIVERSITY_SEED_KEY)).toBeNull();
    expect(profiles.current()).toBeNull();
  });

  it("gives the same password a different salt on each profile and both can log in", async () => {
    const store = memoryStore();
    const profiles = openProfiles(store);
    unwrap(await profiles.create({ username: "Ada", password: PASSWORD }));
    unwrap(await profiles.create({ username: "Bea", password: PASSWORD }));

    const [ada, bea] = storedProfiles(store);
    expect(ada.salt).not.toBe(bea.salt);
    expect(ada.passwordHash).not.toBe(bea.passwordHash);

    expect(unwrap(await profiles.login("ada", PASSWORD)).username).toBe("Ada");
    profiles.logout();
    expect(unwrap(await profiles.login("Bea", PASSWORD)).username).toBe("Bea");
  });

  it("rejects duplicate, reserved, empty, spaced, and overlong usernames", async () => {
    const store = memoryStore();
    const profiles = openProfiles(store);
    unwrap(await profiles.create({ username: "Ada", password: PASSWORD }));

    expect(await profiles.create({ username: "ada", password: PASSWORD })).toEqual({
      ok: false,
      code: "username-taken",
    });
    expect(await profiles.create({ username: "guest", password: PASSWORD })).toEqual({
      ok: false,
      code: "reserved-username",
    });
    expect(await profiles.create({ username: " Guest ", password: PASSWORD })).toEqual({
      ok: false,
      code: "reserved-username",
    });
    expect(await profiles.create({ username: "", password: PASSWORD })).toEqual({
      ok: false,
      code: "invalid-username",
    });
    expect(await profiles.create({ username: "   ", password: PASSWORD })).toEqual({
      ok: false,
      code: "invalid-username",
    });
    expect(await profiles.create({ username: "a b", password: PASSWORD })).toEqual({
      ok: false,
      code: "invalid-username",
    });
    expect(await profiles.create({ username: "a".repeat(33), password: PASSWORD })).toEqual({
      ok: false,
      code: "invalid-username",
    });
    expect(unwrap(await profiles.create({ username: "a", password: PASSWORD })).username).toBe("a");
  });

  it("rejects passwords shorter than 8 or longer than 128 and accepts length 8", async () => {
    const store = memoryStore();
    const profiles = openProfiles(store);

    expect(await profiles.create({ username: "Ada", password: "1234567" })).toEqual({
      ok: false,
      code: "weak-password",
    });
    expect(await profiles.create({ username: "Ada", password: "a".repeat(129) })).toEqual({
      ok: false,
      code: "weak-password",
    });
    expect(unwrap(await profiles.create({ username: "Ada", password: "12345678" })).username).toBe(
      "Ada",
    );
  });

  it("uses one invalid-credentials code for a wrong password and an unknown user", async () => {
    const store = memoryStore();
    const profiles = openProfiles(store);
    unwrap(await profiles.create({ username: "Ada", password: PASSWORD }));

    const wrong = await profiles.login("Ada", "not-the-phrase");
    const unknown = await profiles.login("Nobody", PASSWORD);
    expect(wrong).toEqual({ ok: false, code: "invalid-credentials" });
    expect(unknown).toEqual(wrong);
    expect(profiles.current()).toBeNull();
    expect(store.getItem(SESSION_KEY)).toBeNull();
  });

  it("starts a session on login, hides the hash, and clears it on logout", async () => {
    const store = memoryStore();
    const profiles = openProfiles(store);
    unwrap(await profiles.create({ username: "  Ada  ", password: PASSWORD }));
    expect(profiles.current()).toBeNull();

    const loggedIn = unwrap(await profiles.login("ada", PASSWORD));
    expect(loggedIn).not.toHaveProperty("passwordHash");
    expect(loggedIn).not.toHaveProperty("salt");
    expect(store.getItem(SESSION_KEY)).toBe("Ada");
    expect(profiles.current()).toEqual(loggedIn);

    expect(profiles.logout()).toEqual({ ok: true, value: null });
    expect(profiles.logout()).toEqual({ ok: true, value: null });
    expect(profiles.current()).toBeNull();
    expect(store.getItem(SESSION_KEY)).toBeNull();
  });

  it("updates defaults only while logged in and leaves the hash alone", async () => {
    const store = memoryStore();
    const profiles = openProfiles(store);
    const created = unwrap(
      await profiles.create({
        username: "Ada",
        password: PASSWORD,
        diversitySeed: 42,
      }),
    );
    expect(created.diversitySeed).toBe(42);

    expect(
      profiles.updateDefaults({
        activitiesOwned: ["washer"],
        delayStart: {},
        sleep: { startHour: 23, endHour: 7 },
      }),
    ).toEqual({ ok: false, code: "not-signed-in" });

    unwrap(await profiles.login("Ada", PASSWORD));
    const before = storedProfiles(store)[0];
    const updated = unwrap(
      profiles.updateDefaults({
        activitiesOwned: ["washer", "custom"],
        delayStart: { washer: true, ev: false },
        sleep: { startHour: 0, endHour: 0 },
      }),
    );
    const after = storedProfiles(store)[0];

    expect(updated.defaults).toEqual({
      activitiesOwned: ["washer", "custom"],
      delayStart: { washer: true, ev: false },
      sleep: { startHour: 0, endHour: 0 },
    });
    expect(updated.diversitySeed).toBe(42);
    expect(updated.createdAt).toBe(CREATED_AT);
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.salt).toBe(before.salt);
    expect(after.username).toBe("Ada");
  });

  it("rejects a dryer delay-start toggle, hour 24, a duplicate appliance, and a non-finite seed", async () => {
    const store = memoryStore();
    const profiles = openProfiles(store);
    const base = {
      activitiesOwned: [] as [],
      delayStart: {},
      sleep: { startHour: 23, endHour: 7 },
    };

    expect(
      await profiles.create({
        username: "Ada",
        password: PASSWORD,
        defaults: { ...base, delayStart: { dryer: true } },
      }),
    ).toEqual({ ok: false, code: "invalid-defaults" });
    expect(
      await profiles.create({
        username: "Ada",
        password: PASSWORD,
        defaults: { ...base, sleep: { startHour: 24, endHour: 7 } },
      }),
    ).toEqual({ ok: false, code: "invalid-defaults" });
    expect(
      await profiles.create({
        username: "Ada",
        password: PASSWORD,
        defaults: { ...base, activitiesOwned: ["washer", "washer"] },
      }),
    ).toEqual({ ok: false, code: "invalid-defaults" });
    expect(
      await profiles.create({
        username: "Ada",
        password: PASSWORD,
        diversitySeed: Number.POSITIVE_INFINITY,
      }),
    ).toEqual({ ok: false, code: "invalid-seed" });
    expect(
      await profiles.create({
        username: "Ada",
        password: PASSWORD,
        diversitySeed: Number.NaN,
      }),
    ).toEqual({ ok: false, code: "invalid-seed" });
  });

  it("deletes that profile and its runs, logs them out, and leaves guest history", async () => {
    const store = memoryStore({
      [GUEST_RUNS_KEY]: "[]",
      [DIVERSITY_SEED_KEY]: "7",
    });
    const profiles = openProfiles(store);
    unwrap(await profiles.create({ username: "Ada", password: PASSWORD }));
    unwrap(await profiles.create({ username: "Bea", password: PASSWORD }));
    const adaHistory = profiles.historyFor("ada");
    const beaHistory = profiles.historyFor("Bea");
    if (!adaHistory || !beaHistory) throw new Error("missing history");
    adaHistory.save(draft());
    beaHistory.save(draft());
    unwrap(await profiles.login("Ada", PASSWORD));

    expect(store.getItem(runsKeyFor("Ada"))).not.toBeNull();
    expect(profiles.reset("ada")).toEqual({ ok: true, value: null });

    expect(profiles.current()).toBeNull();
    expect(store.getItem(runsKeyFor("Ada"))).toBeNull();
    expect(store.getItem(runsKeyFor("Bea"))).not.toBeNull();
    expect(storedProfiles(store).map((profile) => profile.username)).toEqual(["Bea"]);
    expect(store.getItem(GUEST_RUNS_KEY)).toBe("[]");
    expect(store.getItem(DIVERSITY_SEED_KEY)).toBe("7");
    expect(profiles.historyFor("Ada")).toBeNull();
    expect(profiles.reset("missing")).toEqual({ ok: false, code: "not-found" });

    unwrap(await profiles.login("Bea", PASSWORD));
    expect(profiles.reset("nobody")).toEqual({ ok: false, code: "not-found" });
    expect(profiles.current()?.username).toBe("Bea");
  });

  it("keeps create and login working when storage throws", async () => {
    const profiles = openProfiles(throwingStore());
    const created = unwrap(await profiles.create({ username: "Ada", password: PASSWORD }));
    expect(created.username).toBe("Ada");
    expect(profiles.current()).toBeNull();

    const loggedIn = unwrap(await profiles.login("Ada", PASSWORD));
    expect(loggedIn.username).toBe("Ada");
    expect(profiles.current()?.username).toBe("Ada");
    expect(JSON.stringify(loggedIn)).not.toContain(PASSWORD);
  });

  it("ignores corrupt profile JSON", async () => {
    const store = memoryStore({ [PROFILES_KEY]: "{not json" });
    const profiles = openProfiles(store);

    expect(profiles.current()).toBeNull();
    unwrap(await profiles.create({ username: "Ada", password: PASSWORD }));

    const valid = storedProfiles(store);
    store.setItem(PROFILES_KEY, JSON.stringify([{ bad: true }, null, ...valid]));
    store.setItem(SESSION_KEY, "Missing");

    expect(profiles.current()).toBeNull();
    expect(store.getItem(SESSION_KEY)).toBeNull();
    expect(unwrap(await profiles.login("Ada", PASSWORD)).username).toBe("Ada");

    store.setItem(PROFILES_KEY, JSON.stringify({ username: "Ada" }));
    store.setItem(SESSION_KEY, "Ada");
    expect(profiles.current()).toBeNull();
    expect(store.getItem(SESSION_KEY)).toBeNull();
  });

  it("hashes with the default iteration count", async () => {
    expect(PBKDF2_ITERATIONS).toBe(100_000);
    const store = memoryStore();
    const profiles = createProfiles(store, { now: () => CREATED_AT });
    unwrap(await profiles.create({ username: "Ada", password: PASSWORD }));
    expect(unwrap(await profiles.login("Ada", PASSWORD)).username).toBe("Ada");
  });
});
