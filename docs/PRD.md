# GridWait — Product Requirements Document

**Version:** 2.1 (aligned to `docs/TODO.md`; scope pre-cut Saturday 12:30 PM) · **Event:** HackHarvard 2026 · **Track:** ASUS "Save the Earth"
**Team:** Soumya (grid data, calendar files, integration · Claude Code), B (front end · Cursor), C (scheduling, scoring, pitch · Cursor)
**Related files:** `AGENTS.md` (rules for AI agents), `docs/TODO.md` (task list, source of truth for owners and order), `docs/METHODOLOGY.md`, `docs/STYLE.md`, `docs/PITCH.md`

> Task IDs in brackets (e.g. [T-S3]) point to `docs/TODO.md`. If this PRD and the task list disagree, raise it with the team. Don't let an agent pick one.

> **v2.1 changes (Saturday 12:30 PM, build started late):** the first three items on the cut list are cut now, not later: the demand-based forecast tier (T-S5), calendar import (T-S7, now a post-demo decision with Google free/busy preferred over `.ics`), and accounts (T-C8, T-B7, T-B8 → guest history only). The full demo check moves from 3 PM to **5 PM**. Open questions are resolved with the proposed defaults (§12). Agents must not build cut items.

---

## 1. Problem

Electricity isn't equally clean throughout the day. Depending on the hour, day, and season, different shares of New England's power come from natural gas, nuclear, hydro, solar, and wind. The same load run at different times has a different carbon footprint, even when it uses the same energy. People have no easy way to see this or act on it around their real schedules.

## 2. Solution

GridWait is a mobile-friendly web app that finds the cleanest **and** most convenient time to run everyday appliances (washer, dryer, dishwasher, EV charging). It:

1. Pulls New England's hourly generation mix and demand from the U.S. EIA API and converts the mix into estimated carbon intensity (gCO₂/kWh).
2. Forecasts the next 7 days from recent weekly patterns, tagging every hour with its source (**measured** for past data, **pattern** for forecast hours; a higher-confidence **forecast** tier is future work).
3. Takes the user's schedule: a demo schedule or busy blocks they enter, with sleep marked. Connecting a real calendar is a stretch goal.
4. Recommends run times that fit when the user is actually needed (at the start, at start and end, or throughout), the appliance's delay-start feature, and a deadline.
5. Shows labeled options (Recommended, Greenest, Best, Soonest, Worst, plus alternatives) on an interactive 7-day grid, with a confidence badge on each.
6. Lets the user choose a run, add it to their calendar, and track a sustainability score and modeled CO₂ saved on an on-device dashboard (guest history, no accounts).

**Our goal:** make sustainable energy use effortless by fitting electricity use around people's lives, rather than making people rearrange their lives around sustainability.

## 3. Target user and core user story

**User:** a New England student or young adult with a busy week who does laundry, runs a dishwasher, or charges an EV.

**Core story:** "As a student, I want to load my week, tell GridWait I need to do laundry and run the dishwasher by Thursday night, and get a few times that fit my schedule with a clear recommendation, so I can lower my footprint without thinking about it."

## 4. Demo flow (the 60-second judge path)

Every **Must** task exists to make this flow work flawlessly.

1. Open GridWait on a phone (mirrored on the ASUS monitor). Home shows the purpose and a "grid right now" card.
2. Tap **Plan a run** → **Use demo schedule**. Busy blocks appear, with sleep in a distinct shade.
3. Select **Washer** and **Dishwasher** (defaults pre-filled, editable), turn on delay-start for the dishwasher, and set a deadline (e.g. Thursday 9 PM).
4. See the 7-day grid: hours colored by intensity, forecast hours marked as forecast, a "Now" marker, busy/sleep overlays, and labeled option blocks.
5. Option cards show the time window, modeled CO₂, % saved vs. Soonest, a confidence badge, and when the user is needed.
6. Tap **Choose** on the washer's Recommended option → it's saved to this device, and the dishwasher's options refresh around it. Tap **Add to calendar** to download a `.ics` event with reminders.
7. Open **Impact**: overall score and band, total CO₂ saved vs. Soonest, and the runs list.
8. Open **About**: how the forecast works, the average-intensity honesty statement, and why Recommended may differ from Greenest.

**Fallback path for the demo:** if multi-appliance is cut, the flow is steps 1–5 with one appliance, then Choose → Impact.

**If calendar connection ships (stretch):** add a short beat after step 2 showing "Connect Google Calendar" on a team member's pre-connected test account. The demo schedule stays the primary path.

## 5. Scope and priorities

| Priority | Meaning |
|---|---|
| **Must** | The demo doesn't work without it. Build first. |
| **Then** | Build after all Must tasks are merged. |
| **Last** | Only if time allows. |
| **Stretch** | Goes on the "future" slide if not built. |
| **Cut** | Pre-cut at 12:30 PM. Not built this weekend; on the future slide. |

| ID | Feature | Tasks | Priority |
|---|---|---|---|
| F0 | Shared contract (types, config, mocks, docs) | T-K1 | Must (blocks everyone) |
| F1 | Real grid data: EIA fuel mix + demand | T-S1, T-S2 | Must |
| F2a | Pattern forecast (168 h) | T-S3 | Must |
| F2b | Demand-based forecast tier | T-S5 | **Cut** |
| F3 | `/api/grid` with cache + fallback | T-S4 | Must |
| F4a | Schedule input: demo schedule + manual busy blocks with "asleep" | T-C7 | Must |
| F4b | Calendar import (Google free/busy preferred over `.ics`; decide after the demo check) | T-S7 | Stretch (not started before 5 PM check) |
| F5 | Slots + activity catalog | T-C1 | Must |
| F6 | Validity rules | T-C2 | Must |
| F7 | Modeled emissions | T-C3 | Must |
| F8a | Ranking, single appliance | T-C4 | Must |
| F8b | Ranking, multi-appliance greedy | T-C4 | Then |
| F9 | App shell, Home, About | T-B1 | Must |
| F10 | Planner form | T-B2 | Must |
| F11 | 7-day schedule grid + overlays | T-B3, T-B4 | Must |
| F12 | Option cards + Choose flow | T-B5 | Must |
| F13 | Calendar export (`.ics` with alarms) | T-S6 | Then |
| F14 | Run history (guest key) | T-C5 | Then |
| F15 | Scoring | T-C9 | Then |
| F16 | Impact dashboard | T-B6 | Then |
| F17 | On-device profiles, sign up, log in | T-C8, T-B7, T-B8 | **Cut** |
| F18 | Visual style proposal | T-P5 | Then |
| F19 | Pitch, Devpost, demo video | T-C6, T-Z3, T-Z4 | Must (video: Then) |
| — | Integration | T-I1, T-I2, T-I4 (Must), T-I3 (Then) | — |

### Scope decisions

- **Grid data is Soumya's.** C's former T-C0 is now T-S1–T-S5 so the work isn't duplicated. *(Team to confirm.)*
- **Calendar import is Stretch, and nobody starts it before the 5 PM demo check.** The demo uses a built-in demo schedule plus manual busy blocks. If the check passes with time to spare, the team picks one method (see F4b); Google free/busy is preferred because it's one tap for users, never exposes event titles, and needs no recurring-event parsing. **Hard stop:** if it isn't working on a real phone by 7 PM, drop it. Calendar *export* [T-S6] is Then.
- **No accounts this weekend.** Profiles, sign-up, and log-in [T-C8, T-B7, T-B8] are cut. Run history uses a single "guest" key in local storage. There is no server, database, or Supabase.
- **Available hours are replaced by sleep blocks.** Instead of a global 7 AM–11 PM window, users mark busy blocks as "asleep" (the demo schedule includes sleep).
- **Pattern forecast only.** The demand-based tier [T-S5] is cut, so every future hour is `pattern`. Consequence: the confidence rule has nothing to compare, so **Best = Greenest** this weekend, and confidence shading is uniform across forecast days. The code still supports tiers so the demand tier can be added later. The pitch presents confidence-aware ranking as future work, not a shipped feature.
- **Load diversity stays client-side.** The Recommended option is a seeded pick among near-ties of Best, with the seed stored on the device. Coordinating across users via a server is future work.

### Out of scope (future slide)

Demand-based forecast tier and confidence-aware ranking, on-device or server accounts, shared load balancing across users, always-on calendar sync (and Google app verification), regions other than ISNE, marginal-emissions data or verified avoided emissions, push notifications, native apps, payments, an AI-generated footprint summary.

### If behind schedule, cut in this order

Already cut at 12:30 PM:
1. ~~T-S5 demand tier~~ → pattern forecast only
2. ~~T-S7 calendar import~~ → Stretch, decided after the 5 PM check
3. ~~T-B7, T-B8, T-C8 accounts~~ → single "guest" history

Next cuts if still behind:

4. Multi-appliance in T-C4 → single appliance
5. T-C9 scoring → show CO₂ saved only

---

## 6. Functional requirements

### F0 — Shared contract [T-K1] · All (Soumya drives) · Must

Update `lib/types.ts`, `lib/constants.ts`, `lib/mocks/*`, `docs/PRD.md`, and `docs/TODO.md` to the design in §7–§8. Merge to main first; everyone pulls before starting their branch.

### F1 — Grid data [T-S1, T-S2] · Soumya · Must

**EIA client** (`lib/grid/eia.ts`):
- EIA API v2, respondent `ISNE`, hourly:
  - `electricity/rto/fuel-type-data`: generation by fuel, **last 28 days**.
  - `electricity/rto/region-data`: actual demand (`D`) and day-ahead demand forecast (`DF`).
- **Fetch once and print real field names, type codes, and units before writing parsing code.**
- Handle pagination (max 5,000 rows per request). 8-second timeout.
- API key read from `process.env.EIA_API_KEY`, server only.
- EIA `period` values are UTC; convert to `America/New_York`.
- Done when: a test prints the last 24 h of fuel rows, demand, and DF hours, converted to New York time.

**Carbon intensity** (`lib/grid/intensity.ts`):
- Per hour: Σ(MWh × factor) ÷ Σ(MWh) using `EMISSION_FACTORS` (§8).
- Negative MWh → 0. Unknown fuel codes → `OTH`, logged.
- Hours with no fuel data are **dropped, never filled with 0**.
- Done when: tests pass for a hand-calculated hour, negatives, an unknown code, and a missing hour.

### F2 — Forecast [T-S3, T-S5] · Soumya

Every hour carries a **tier** describing where its value came from:

| Tier | Meaning | Confidence |
|---|---|---|
| `measured` | Actual EIA data (past hours only) | Highest |
| `forecast` | Predicted from EIA's day-ahead demand forecast (F2b, **cut this weekend**; kept in the type for later) | Medium |
| `pattern` | Average of the same weekday and hour in recent weeks | Lowest |

**F2a — Pattern forecast (Must)** (`lib/grid/forecast.ts`):
- Each of the next 168 hours = mean intensity at the **same weekday and same local hour** over the last 4 weeks (3 if a week is missing), tagged `pattern`.
- Fill the gap between the latest measured hour and now with pattern values.
- Past real hours are tagged `measured`.
- Alignment uses local weekday + hour so it's DST-safe.
- Done when: tests pass for length 168, DST-safe alignment, flat in → flat out, and gap fill.

**F2b — Demand-based tier (Cut; spec kept for future work)** (`lib/grid/demandModel.ts`). T-S1 should still fetch `region-data` only if it costs nothing extra; otherwise skip it.
- Fit a least-squares line `intensity = a + b × demand` over measured hours in the last 28 days.
- Hours covered by EIA `DF` get predicted intensity, tagged `forecast`. Later hours stay `pattern`.
- If there are fewer than 100 measured hours or R² < 0.2, skip the tier (everything stays `pattern`).
- Store predictions with `forecastMadeAt` so they can be backtested.
- Done when: tests pass for perfect-line data, poor-fit fallback, and tier tagging.

The method is documented in `docs/METHODOLOGY.md` and explainable in one sentence per tier. Every non-measured value is labeled as a forecast in the UI.

### F3 — `GET /api/grid` [T-S4] · Soumya · Must

- `app/api/grid/route.ts` returns `GridResponse` (§7): every hour has `hourStart`, `gco2PerKwh`, `tier`; plus `forecastMadeAt` and `source` (`live` / `fallback`).
- Cached server-side for 1 hour.
- **Fallback:** on any EIA error or timeout, serve `lib/grid/fallback.json` (a real saved snapshot, re-aligned so its 168 hours start at the current hour) with `source: "fallback"`. The UI shows "Using cached grid data."
- Done when: valid data on the Vercel preview, and the fallback is returned when the key is deliberately broken locally.
- **Most important task: the demo must survive bad Wi-Fi.**

### F4 — Schedule input

**F4a — Demo schedule and manual blocks [T-C7] · C · Must** (`lib/schedule-input/`):
- A built-in demo schedule: a realistic student week with classes, a job shift, a recurring club meeting, sleep, and gaps.
- Manual busy blocks the user adds or removes, each with an **"asleep"** flag.
- Output: `BusyBlock[]`, sorted, with overlaps merged (a merged block is asleep only if all its parts are).

**F4b — Calendar import [T-S7] · Soumya · Stretch.** Not started until the 5 PM demo check passes. Then the team picks **one** option. Both take roughly 2–3 hours. Hard stop: drop it if it isn't working on a real phone by 7 PM.

*Option A (preferred): Google Calendar free/busy* (`lib/calendar/google.ts`):
- "Connect Google Calendar" button; Google Identity Services token flow in the browser; one call to the Calendar API free/busy endpoint for the primary calendar, now → deadline.
- Scope: `https://www.googleapis.com/auth/calendar.freebusy` only (availability, no event titles).
- Map returned busy intervals to `BusyBlock[]` with `asleep: false`; merge with demo/manual blocks.
- The browser calls Google directly; nothing passes through our server. No refresh tokens: the user reconnects each visit.
- **Do the Google Cloud setup first** (project, Calendar API, consent screen in Testing mode, team accounts as test users, web client ID, allowed origins for localhost and the Vercel URL), since that's where surprise delays come from.
- Handle: popup blocked, access denied, token expired, account not a test user. The app never breaks; the demo schedule still works.
- Done when: a team test account connects on the deployed URL from a real phone and its busy times appear on the grid.

*Option B: `.ics` import* (`lib/calendar/parse.ts`):
- Parse `.ics` **entirely in the browser**; the file and event titles never leave the browser and are never stored.
- Expand recurring events; skip all-day events and events marked free (`TRANSP:TRANSPARENT`).
- Accept several files, merge overlapping blocks, and skip any unreadable file with a message naming it.
- Done when: two overlapping `.ics` files → one merged, sorted list; an invalid file errors without breaking the others.

Not considered: pasting Google's secret iCal address. Browsers can't fetch it directly, so it would go through our server, breaking the privacy claim, and the link exposes the whole calendar.

### F5 — Slots and activity catalog [T-C1] · C · Must

- Split now → deadline (max 7 days) into **15-minute slots**, each carrying its hour's intensity and tier (hourly values repeated). The horizon starts at the next 15-minute boundary after now.
- **Activity catalog** (§8): energy per cycle (kWh), duration, **attention type**, and delay-start support.
- Attention types:
  - `start`: the user is needed when the run starts (load and start).
  - `startEnd`: needed at start and at end (e.g. move wet laundry).
  - `throughout`: needed for the whole run.
- Optional: a "Laptop charging" preset (from the ASUS conversation).

### F6 — Validity rules [T-C2] · C · Must

A candidate run is valid if:
1. It finishes by the deadline.
2. The user is free at every **attended moment** for its attention type (each attended moment lasts `ATTENTION_MINUTES`; `throughout` means the whole run).
3. Busy blocks, including sleep, block **only attended moments**. An unattended middle of a run may overlap class, work, or sleep.
4. With **delay-start** on, the start attention can happen before the run begins: the user loads the appliance at a free moment and the appliance's timer starts it later (see §12 for the exact rule).
5. For multi-appliance plans: attended moments of different activities are at least 15 minutes apart. Unattended run time may overlap.

### F7 — Modeled emissions [T-C3] · C · Must

- Grams CO₂ for a run = Σ over its slots of (slot intensity × kWh used in that slot). kWh per slot = energy per cycle ÷ number of slots in the run.
- Done when: tests match a hand calculation, including a run that spans two hours.

### F8 — Ranking [T-C4] · C · Core of the app

All pure functions in `lib/scheduling/`, unit-tested against `lib/mocks/*`, no UI or network.

**A run's confidence** is the lowest-confidence tier among its slots.

**Options returned** for each activity:

| Label | Definition |
|---|---|
| **Soonest** | Earliest valid start. Baseline for "saved." |
| **Greenest** | Absolute lowest modeled emissions among valid runs. |
| **Best** | Lowest emissions after the **confidence rule**: a later `pattern`-tier run must beat a nearer, higher-confidence run by at least `CONFIDENCE_MARGIN` (10%) to win. |
| **Recommended** | A seeded pick among runs within `NEAR_TIE_MARGIN` of Best (spreads users across near-equal windows so we don't create a new peak). The seed is stored on the device so results are stable for one user. |
| **Worst** | Highest emissions among valid runs. Used for scoring, not shown as a choice by default. |
| Alternatives | Up to 5 more valid runs, each ≥ 60 minutes from every other returned option. |

- When options coincide, they **merge into one option with multiple labels** (e.g. "Recommended · Best · Greenest").
- **No valid window:** return a typed result with a human-readable reason (e.g. "No free 10-minute moment before your deadline") and a fallback suggestion (e.g. the nearest valid run after the deadline, or which constraint to relax).
- The UI explains diversity in one line: "Several times are nearly as clean. We spread users across them so we don't create a new peak."

**F8a — Single appliance (Must).** Build and test this first.

**F8b — Multi-appliance (Then).** Greedy: schedule the largest-energy activity first; accept already-chosen runs as fixed blocks; re-rank the remaining activities. After the user taps Choose, remaining activities' options refresh.

Tests must cover: determinism with a fixed seed, Recommended always within the near-tie margin, the confidence rule, label merging, alternative spacing, and the no-valid-window result.

### F9 — App shell, Home, About [T-B1] · B · Must

- Header with logo; nav: Home · About · Plan · Impact. No log-in or sign-up (accounts cut).
- Creates pages: `/`, `/about`, `/plan`, `/impact`.
- **Home:** purpose statement, "Plan a run" button, "grid right now" card (latest measured intensity).
- **About:** how the forecast works (weekly pattern from the last 4 weeks), the average-intensity honesty statement (§9), and why Recommended may differ from Greenest (spreading users across near-equal times).

### F10 — Planner form [T-B2] · B · Must

- Pre-fills from catalog defaults.
- "Use demo schedule" button; busy-block list with "asleep" toggle; calendar connect/upload only if T-S7 ships.
- Multi-select activities with editable duration and energy, and a delay-start toggle where supported.
- Deadline up to 7 days out.
- No "Save as my defaults" (accounts cut).

### F11 — 7-day schedule grid and overlays [T-B3, T-B4] · B · Must

- **Grid:** hour cells colored by intensity (green → yellow → red); forecast hours visibly marked as forecast (and, if a `forecast` tier is ever added, lower-confidence hours rendered lighter); legend; a "Now" marker.
- **Mobile (≤ 640px):** day tabs. **Desktop / ASUS monitor:** full 7-day grid.
- Tap a cell to see its time, value, and tier. Color is never the only signal.
- **Overlays:** busy blocks (sleep in a distinct shade); option blocks labeled Recommended / Greenest / Soonest (one block with combined labels when they coincide); markers for when the user is needed.
- Hardest screen; start early.

### F12 — Option cards and Choose [T-B5] · B · Must

- Each card: time window, modeled CO₂ (g), % saved vs. Soonest, confidence badge, attention needed, "Add to calendar," "Choose."
- "Choose" saves to guest history on this device. After Choose, remaining activities' options refresh.
- Loading, error, and "no valid window" states.
- Every number is labeled "modeled estimate."

### F13 — Calendar export [T-S6] · Soumya · Then

- `lib/calendar/export.ts`: chosen option + activity → `.ics` with one VEVENT, a VALARM 15 minutes before start, and a second alarm at the end if the attention type needs it (`startEnd`). With delay-start, the first alarm is for the load time.
- Title example: "Run washer (GridWait — cleaner time)."
- Plus a browser download helper used by B's "Add to calendar."
- Done when: the file imports into Apple Calendar with working alarms.

### F14 — Run history [T-C5] · C · Then

- Local storage under a single "guest" key: save, list (by run start time, newest first), mark done, delete. Keep the key a parameter so accounts can be added later.
- Each run stores chosen, Best, Worst, and Soonest emissions (from the planning-time forecast), kWh, window, confidence, and a timestamp.
- All storage access in try/catch with an in-memory fallback.

### F15 — Scoring [T-C9] · C · Then

- **Per-run score** = (Worst − chosen) ÷ (Worst − Best) × 100, capped at 100.
  - Within `NEAR_TIE_MARGIN` of Best → 100.
  - Worst ≤ Best (no spread) → 100.
  - Floor at 0.
- **Bands:** ≥ 95 Top choice · 75–94 Great · 50–74 OK · < 50 Could be cleaner.
- **Overall score** = energy-weighted average of run scores.
- **Saved** = Soonest − chosen (positive = cleaner; negatives are shown and counted).
- Rank runs by score, ties broken by recency.
- Totals: CO₂ saved, modeled emissions, counts, band breakdown.
- All values use planning-time forecasts, not later actuals.

### F16 — Impact dashboard [T-B6] · B · Then

- Reads guest history: overall score + band; total CO₂ saved vs. Soonest (negatives shown as negative; kg when ≥ 1000 g); total modeled emissions; counts; band breakdown; runs list (date, appliance, window, CO₂, saved, score + band, rank, status); sort by most recent / most sustainable; mark done, delete; empty state; note that scores use planning-time forecasts and history lives only on this device.

### F17 — Profiles, sign up, log in [T-C8, T-B7, T-B8] · **Cut** (spec kept for future work; do not build)

- **Logic [T-C8]:** local storage profiles: create, log in, log out, reset profile (deletes its history). Passwords hashed with Web Crypto, never stored in plain text. Saved defaults per profile: appliances owned, delay-start toggles, usual sleep hours.
- **Sign up [T-B7]:** username, password (show/hide, minimum 8 characters), required Terms checkbox, "Create profile," link to log in. Errors: username taken, weak password, terms unchecked. Note that the profile stays on this device.
- **Log in [T-B8]:** username, password, "Log in," link to sign up. Wrong-credentials error. "Forgot password" explains on-device limits and offers "Reset profile on this device" with confirmation.
- We say plainly in the pitch and UI that on-device profiles are not real security.

### F18 — Visual style [T-P5] · Soumya · Then

Run the frontend-design skill and write colors (green → red scale, lighter shade for lower confidence), fonts, spacing, and card style into `docs/STYLE.md` only. Don't edit B's components. Do it early evening so B has time.

### F19 — Pitch and submission · C, B, All

- **Pitch draft [T-C6, Must]:** `docs/PITCH.md`: problem, demo script, honest impact framing (average intensity, small per-load savings, EVs matter most), future work (demand-based forecast and confidence-aware ranking, accounts, shared load balancing, calendar sync). Use what ASUS said about judging.
- **Methodology [add to T-C6]:** `docs/METHODOLOGY.md`: data source, emission factors, forecast method, scheduling rules, scoring, limitations. No other task covers it, and About and Devpost rely on it.
- **Devpost page [T-Z3, Must]:** description, screenshots, tech stack, honesty statement, team.
- **Demo video [T-Z4, Then]:** 60–90 s following the demo script; posted for the ASUS content challenge.
- **Rehearse [T-Z5, Must]:** at least twice, timed.

### Integration [T-I1–T-I4] · Soumya leads

Starts when T-B3, T-B5, and T-C4 are merged. Integration tasks may edit `app/plan/**` and `app/impact/**` after telling B.

| Task | What | Priority |
|---|---|---|
| T-I1 | Planner fetches `/api/grid` instead of mocks; fallback note when `source === "fallback"` | Must |
| T-I2 | Schedule input (C7) → `schedule()` (C4) → grid overlays (B4) and option cards (B5) | Must |
| T-I3 | Choose saves to history (C5); Add to calendar downloads `.ics` (S6); dashboard reads real history + scores (C9) | Then |
| T-I4 | Full demo check: two phones + demo laptop; normal and EIA blocked; no console errors. **Target 5 PM** (moved from 3 PM). | Must |

---

## 7. Shared types (`lib/types.ts`)

The contract between all three workstreams. Updated in T-K1. **Do not change without team agreement.**

```ts
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
```

## 8. Constants and shared config (`lib/constants.ts`)

**Emission factors** (gCO₂/kWh, IPCC lifecycle medians; `OTH` is an assumption based on biomass/refuse, documented as such):

| Fuel | Code | Factor |
|---|---|---|
| Coal | COL | 820 |
| Oil | OIL | 650 |
| Natural gas | NG | 490 |
| Other | OTH | 230 |
| Solar | SUN | 45 |
| Hydro | WAT | 24 |
| Nuclear | NUC | 12 |
| Wind | WND | 11 |

**Activity catalog** (proposed defaults, confirm in T-K1):

| ID | Name | Duration | Energy / cycle | Attention | Delay-start |
|---|---|---|---|---|---|
| washer | Washer | 60 min | 0.5 kWh | startEnd | yes |
| dryer | Dryer | 60 min | 3.0 kWh | startEnd | no |
| dishwasher | Dishwasher | 120 min | 1.2 kWh | start | yes |
| ev | EV charging (Level 2) | 240 min | 28.8 kWh | start | yes |
| laptop | Laptop charging (optional) | 90 min | 0.06 kWh | start | no |
| custom | Custom | user-set | user-set | user-set | user-set |

**Shared config:**

| Name | Value | Used by |
|---|---|---|
| `SLOT_MINUTES` | 15 | C1 |
| `ATTENTION_MINUTES` | 10 | C2 |
| `ATTENDED_GAP_MINUTES` | 15 | C2 (multi-appliance) |
| `CONFIDENCE_MARGIN` | 0.10 | C4 (Best) |
| `NEAR_TIE_MARGIN` | 0.03 | C4 (Recommended), C9 (score = 100) |
| `MAX_DELAY_START_HOURS` | 24 | C2 |
| `MAX_ALTERNATIVES` | 5 | C4 |
| `ALTERNATIVE_SPACING_MIN` | 60 | C4 |
| `SCORE_BANDS` | Top choice ≥ 95 · Great 75–94 · OK 50–74 · Could be cleaner < 50 | C9, B6 |
| `FETCH_HISTORY_DAYS` | 28 | S1 |
| `PATTERN_WEEKS` | 4 (3 if one is missing) | S3 |
| `DEMAND_MIN_HOURS` | 100 | S5 (cut) |
| `DEMAND_MIN_R2` | 0.2 | S5 (cut) |
| `EIA_TIMEOUT_MS` | 8000 | S1, S4 |
| `EIA_PAGE_SIZE` | 5000 | S1 |
| `GRID_CACHE_SECONDS` | 3600 | S4 |
| `ALARM_LEAD_MINUTES` | 15 | S6 |
| `MAX_HORIZON_DAYS` | 7 | C1, B2 |

## 9. Non-functional requirements

- **Mobile-first:** every screen works at 375px width with no horizontal scroll; the schedule also looks good full-screen on the ASUS monitor.
- **Privacy:** calendar data is never sent to our server. Run history lives only in this browser's local storage. Event titles are never stored. If Google free/busy ships, we request only availability, never event details.
- **Honesty:** all numbers are labeled as modeled estimates. About and Devpost state: "These are modeled comparisons based on the average generation mix, not verified avoided emissions, which would require marginal-emissions data." We also state that per-load savings are small and EV charging matters most. If Google connection ships, we note it runs in Google's testing mode (team accounts only) pending app verification.
- **Reliability:** the demo works with EIA down (fallback snapshot) and with no user data (demo schedule).
- **Performance:** the planner shows results within 2 seconds of submitting on a phone (scheduling runs client-side).
- **Accessibility:** color is never the only signal (values, labels, and tier are always available); inputs and buttons have labels; tap targets ≥ 44px.

## 10. Architecture, folders, and ownership

**Stack:** Next.js (App Router) + React + TypeScript + Tailwind CSS on Vercel. Vitest for unit tests. Local storage for guest history. No database. Stretch only: Google Identity Services + Calendar API free/busy, or ical.js.

```
app/
  page.tsx               # Home (B)
  about/page.tsx         # About (B)
  plan/page.tsx          # Planner + grid + options (B; integration edits by S after telling B)
  impact/page.tsx        # Dashboard (B; integration edits by S after telling B)
  api/grid/route.ts      # GET /api/grid (S)
components/              # UI (B)
lib/
  types.ts               # Shared contract (team-owned)
  constants.ts           # Factors, catalog, shared config (team-owned)
  grid/                  # eia.ts, intensity.ts, forecast.ts, fallback.json (S)
  calendar/              # export.ts; google.ts or parse.ts only if stretch ships (S)
  schedule-input/        # Demo schedule, manual busy blocks (C)
  scheduling/            # Slots, validity, emissions, ranking (C)
  impact/                # Run history, scoring (C)
  mocks/                 # Mock GridResponse, BusyBlocks, ScheduleResult (team)
public/
  demo-calendar.ics      # Existing; reused by T-S7 if built
docs/
  PRD.md  TODO.md  METHODOLOGY.md  STYLE.md  PITCH.md
```

**Folder rules:**
- **Soumya:** `app/api/**`, `lib/grid/**`, `lib/calendar/**`, `docs/STYLE.md`; integration may edit `app/plan/**` and `app/impact/**` after telling B. Never edits `lib/scheduling/**`, `lib/impact/**`, or `components/**`.
- **B:** `app/page.tsx`, `app/plan/**`, `app/impact/**`, `app/about/**`, `components/**`. Builds against `lib/mocks/*` until integration.
- **C:** `lib/scheduling/**`, `lib/impact/**`, `lib/schedule-input/**`, `docs/PITCH.md`, `docs/METHODOLOGY.md`. Pure functions with unit tests, no UI.

**Workflow for every task:**
1. `git switch main` → `git pull` → `git switch -c <branch>`
2. New agent chat: "Read AGENTS.md, then do T-XX from docs/TODO.md. Plan first and wait for my approval."
3. Reject edits outside your folders. `npm run lint`, `npm test`, `npm run build` must pass.
4. Commit → `git push -u origin <branch>` → PR into main → merge → tell the group to pull.

## 11. Milestones and definition of done

**Right now (12:35 → ~1:05 PM):**
1. Merge this PRD into `docs/PRD.md`.
2. T-K1: copy §7 types and §8 constants into `lib/types.ts` and `lib/constants.ts`, update mocks, merge to main. Don't debate details; §12 decisions are final.
3. Everyone pulls and starts their first Must task: Soumya T-S1, B T-B1, C T-C1.

**Soumya's order:** T-K1 → T-S1 → T-S2 → T-S3 → T-S4 (fallback snapshot before any polish) → T-05 deploy → T-I1, T-I2 → T-I4 → T-S6, T-I3 → T-P5 → calendar stretch only if the check passed.

**Milestones:**

| Time | Milestone |
|---|---|
| ~1:05 PM | Shared contract merged; everyone building |
| ~3:30 PM | T-S4, T-B3, T-C4 (single appliance) merged; deployed on Vercel |
| **5:00 PM** | T-I4 full demo check on phones (moved from 3 PM) |
| 5–7 PM | Then work; calendar stretch decision; **7 PM hard stop** for calendar if not working on a phone |
| 10:00 PM | **Feature freeze** (bug fixes only after) |
| Saturday night | Devpost submitted (hard deadline **8:00 AM Sunday**) |

**Demo-ready when:**
- The §4 flow works on the **deployed Vercel URL** from a real phone with no console errors [T-Z2].
- It still works with EIA unreachable (fallback note shown) and with no user data (demo schedule).
- Intensity, forecast, validity, emissions, ranking, and scoring have passing unit tests.
- `npm run build` succeeds on main.
- Devpost page, demo video (if made), and timed pitch rehearsals are done.

## 12. Decisions (resolved at 12:30 PM with proposed defaults; agents must not change them)

1. **Near-tie margin:** 3%.
2. **Confidence rule without T-S5:** accepted. Best = Greenest this weekend; confidence-aware ranking is future work in the pitch.
3. **"Asleep" in scheduling:** sleep and regular busy blocks both block only attended moments. The one difference: delay-start loading can't happen during sleep. Sleep is also shown in a distinct shade.
4. **Delay-start rule:** the user loads at any free, non-asleep moment before the run start, at most `MAX_DELAY_START_HOURS` (24 h) earlier.
5. **No-valid-window fallback:** suggest the nearest valid run after the deadline, if one exists within 7 days; otherwise say which constraint blocked it (deadline, busy time, or sleep).
6. **Color scale:** min/max of the 7-day forecast, so the scale always shows contrast.
7. **Profile dependencies:** resolved by cutting accounts. B2 and B5 use guest behavior only.
8. **Worst:** used only for scoring, not shown as a card.

**Still open (decide after the 5 PM check):** whether to attempt calendar import, and if so Google free/busy (preferred) or `.ics`.
