# GridWait — Product Requirements Document

**Version:** 1.0 · **Event:** HackHarvard 2026 · **Track:** ASUS "Save the Earth"
**Team:** Soumya (data + integration), Teammate B (UI), Teammate C (scheduling logic + story)
**Related files:** `AGENTS.md` (rules for AI agents), `docs/TODO.md` (task list)

---

## 1. Problem

Electricity isn't equally clean throughout the day. Depending on the hour, day, and season, different shares of power come from natural gas, nuclear, solar, hydro, and wind. Running the same appliance at different times can have different environmental impacts, even when the energy used stays the same. People have no easy way to see this or to act on it around their real schedules.

## 2. Solution

GridWait is a mobile-friendly web app that finds the cleanest **and** most convenient time to run everyday appliances (laundry, dishwasher, EV charging). It:

1. Pulls New England's hourly generation mix from the U.S. EIA API and converts it into estimated carbon intensity (gCO₂/kWh).
2. Forecasts carbon intensity for the next 7 days.
3. Reads the user's calendar (.ics file, parsed **in the browser only**) to find when they're free.
4. Recommends appliance run times that fit the user's availability, the appliance's needs (e.g., someone must be present to start and finish laundry), and a deadline.
5. Shows several options on an interactive 7-day schedule so the user can compare and pick.
6. Exports the chosen time as a calendar event and tracks modeled emissions differences over time.

**Our goal:** make sustainable energy use effortless by fitting electricity use around people's lives, rather than making people rearrange their lives around sustainability.

## 3. Target user and core user story

**User:** a New England student or young adult with a busy calendar who runs laundry, a dishwasher, or charges an EV.

**Core story:** "As a student, I want to upload my calendar, tell GridWait I need to do laundry by Thursday night, and get a few times that fit my schedule, with the cleanest one highlighted, so I can lower my footprint without thinking about it."

## 4. Demo flow (the 60-second judge path)

Every P0 requirement exists to make this flow work flawlessly.

1. Open GridWait on a phone (and mirrored on the ASUS monitor).
2. Tap **"Use demo calendar"** (or upload a real `.ics` file).
3. Choose **Laundry**, keep the default 60 minutes, and set a deadline (e.g., Thursday 9 PM).
4. See the 7-day schedule: color-coded carbon intensity, grey busy blocks, and 3 recommended options (**Greenest**, **Balanced**, **Soonest**), each showing modeled CO₂ and % difference vs. Soonest.
5. Pick an option, tap **Add to calendar** (downloads a `.ics` event with reminders), and it is logged.
6. Open **Impact**: a headline number of modeled CO₂ difference, with "See details."
7. Open **About**: purpose, team, and downloadable methodology.

## 5. Scope and priorities

| Priority | Meaning |
|---|---|
| **P0** | Required for the demo. Build first. Nothing else starts until P0 works end to end on the deployed site. |
| **P1** | Build after P0 is merged and working. |
| **P2** | Stretch only. Goes on the "future" slide if not built. |
| **Out** | Not built this weekend. |

| ID | Feature | Priority |
|---|---|---|
| F1 | Real electricity data (EIA, ISNE) | P0 |
| F2 | 7-day carbon intensity forecast | P0 |
| F3 | Calendar import (.ics) | P0 |
| F4 | Calendar-aware scheduling optimization | P0 |
| F5 | Interactive 7-day schedule with option comparison | P0 |
| F6 | Reminders (.ics export) and impact tracking (local) | P0 |
| F8 | Load diversity (spread recommendations across near-optimal windows) | P0 (client-side version) |
| F9 | About page with downloadable methodology | P1 |
| F10 | Carbon footprint summary + general recommendations | P2 |
| F7 | Accounts, login, consent, personal dashboard synced to a server | P2 |
| F8b | Server-side storage of recommendations by area to coordinate diversity across users | P2 |

### Scope decisions (resolved contradictions in the original feature list)

- **Accounts vs. local storage.** The feature list asked for logins and stored profiles (F7), while the tech plan said "browser local storage, no accounts or database." **v1 uses local storage only.** The Impact page acts as the personal dashboard. Accounts (Supabase auth + database + consent screen) are P2 and only start once all P1 work is merged.
- **Load diversity without a server.** F8's goal is to avoid everyone shifting to the same "greenest hour" and creating a new peak. v1 achieves this client-side: when several windows are within a small tolerance of the greenest, GridWait picks among them instead of always choosing the single minimum (see F8). Storing recommendations server-side by area is P2.
- **"7-Hour Carbon Forecasting"** in the original list is treated as a typo for **7-day**, matching the rest of the document.

### Out of scope

Live sync with Google/Apple calendars (future direction), grid regions other than New England (ISNE), marginal-emissions data or verified avoided emissions, push notifications, native mobile apps, payments.

---

## 6. Functional requirements

### F1 — Real electricity data (P0) · Owner: Soumya

- Fetch hourly net generation by fuel type for **respondent `ISNE`** from EIA API v2, dataset `electricity/rto/fuel-type-data`, frequency `hourly`.
- Fetch the **last 21 days** of data (enough for a 14-day forecast baseline with margin).
- **Verify field names and fuel-type codes from a real API response before writing parsing code.** Expected codes include `COL`, `NG`, `NUC`, `OIL`, `WAT`, `SUN`, `WND`, `OTH`; map any unexpected code to `OTH` and log it.
- EIA `period` values are in UTC. Convert all times to `America/New_York` for display and scheduling.
- Treat negative generation values as 0 for intensity math.
- Carbon intensity for an hour = Σ(MWh_fuel × factor_fuel) ÷ Σ(MWh_fuel), using the factors in §8.
- EIA data lags real time by several hours. That's expected: the latest actual hour is reported as `latestDataHour`.
- The API key is used **only on the server**, read from `process.env.EIA_API_KEY`.

### F2 — 7-day forecast (P0) · Owner: Soumya

- Produce one intensity value for **each hour from the current hour through the next 168 hours**.
- **Method (v1):** for each forecast hour, the mean intensity at the same local hour-of-day across the most recent 14 days of actual data.
- **P1 improvement:** use weekday-only or weekend-only history to match the forecast day, if at least 4 samples exist.
- The method must be explainable in one sentence and documented in `docs/METHODOLOGY.md`.
- Every forecast value is labeled as a forecast in the UI.

### API: `GET /api/grid` (P0) · Owner: Soumya

- Returns `GridResponse` (see §7).
- Cached server-side for 1 hour (Next.js `revalidate: 3600` or equivalent).
- **Fallback:** if EIA fails or times out (8 seconds), return data built from a bundled snapshot (`lib/grid/fallback.json`) with `source: "fallback"`. The UI shows a small "Using cached grid data" note. The demo must never break because of EIA or Wi-Fi.

### F3 — Calendar import (P0) · Owner: Soumya

- File input accepting `.ics` / `text/calendar`. Parse with **ical.js entirely in the browser.** The calendar file and event titles **never** leave the browser and are **never** written to storage.
- Expand recurring events (RRULE) within the 7-day horizon.
- Ignore events marked `TRANSP:TRANSPARENT` (shown as free).
- All-day events: ignored by default, with a toggle to count them as busy.
- Convert all event times to `America/New_York`.
- Output: `BusyBlock[]`, sorted and merged where overlapping.
- **"Use demo calendar"** button loads `public/demo-calendar.ics`: a realistic student week with classes, a job shift, a recurring club meeting, and gaps.
- Show a clear error if the file can't be parsed. Never crash.
- P1: allow uploading more than one calendar file and merge them.

### F4 — Scheduling optimization (P0) · Owner: Teammate C

All scheduling code is **pure functions** in `lib/scheduling/`, with unit tests and no UI or network dependencies.

**Inputs:** `ScheduleRequest` (§7): appliance, runtime, deadline, busy blocks, available hours, forecast.

**Time grid:** 15-minute slots. Each slot uses the intensity of the hour it falls in. Horizon starts at the next 15-minute boundary after "now" and ends at the deadline (max 7 days out).

**A start time `s` is valid if all of these hold:**
1. `s + runtime ≤ deadline`.
2. If the appliance needs presence at start: the window `[s, s + presenceMinutes]` doesn't overlap any busy block and falls within the user's available hours.
3. If the appliance needs presence at end: the window `[s + runtime, s + runtime + presenceMinutes]` meets the same conditions, and also ends by the deadline.
4. The middle of the run may overlap busy time (the user doesn't need to be there).

**Available hours:** a user setting, default **7:00 AM–11:00 PM**, which applies only to presence windows. Calendars don't contain sleep, so without this the app would recommend 3 AM laundry.

**Modeled emissions for a run:** Σ over the run's slots of (slot intensity in gCO₂/kWh × appliance power in kW × 0.25 h) = grams CO₂.

**Options returned (deduplicated; may be fewer than 3):**
- **Soonest:** the earliest valid start. This is the **baseline** for all comparisons.
- **Greenest:** the lowest modeled emissions (subject to F8 below).
- **Balanced:** the earliest valid start whose emissions are within 10% of the Greenest emissions (`BALANCED_TOLERANCE = 0.10`).

**Each option reports:** start, end, modeled grams CO₂, grams and % difference vs. Soonest, and the presence windows.

**No valid window:** return a typed error with a human-readable reason (e.g., "No free 10-minute slot before your deadline within your available hours").

### F8 — Load diversity (P0, client-side) · Owner: Teammate C

- Candidates whose emissions are within 3% of the true minimum (`DIVERSITY_TOLERANCE = 0.03`) count as "near-optimal."
- The Greenest option is chosen from the near-optimal set using a **seeded** pseudo-random pick. The seed is stored in local storage, so the same user gets stable results while different users get spread across windows.
- The UI explains this in one line, e.g. "Several times are nearly as clean. We spread users across them so we don't create a new peak."
- Tests must cover: determinism with a fixed seed, and the choice always staying within tolerance.

### F5 — Interactive 7-day schedule (P0) · Owner: Teammate B

- **Grid:** 7 days × 24 hours. Each hour cell is colored by forecast intensity on a green → yellow → red scale, with a legend in gCO₂/kWh.
- **Overlays:** busy blocks (grey, no titles stored; titles may show while the session is open), and recommended options as labeled blocks (Greenest / Balanced / Soonest).
- **Mobile (≤ 640px):** show one day at a time with day tabs or swipe, plus a compact 7-day strip on top. **Desktop / ASUS monitor:** full 7-day grid.
- Tapping a cell or block shows its time and intensity value. **Never rely on color alone:** labels and values are always available.
- **Option comparison cards** below the grid: label, day and time, modeled CO₂ (g), difference vs. Soonest (g and %), and a "Choose" button.
- Every estimate is labeled "modeled estimate."

### F6 — Reminders and impact tracking (P0) · Owners: Soumya (export), Teammate C (log), Teammate B (UI)

- **Export:** "Add to calendar" downloads a `.ics` file with one VEVENT for the chosen run, a VALARM 15 minutes before the start, and a second alarm at the end if the appliance needs presence at end. Title example: "Run laundry (GridWait — cleaner time)".
- **Log:** choosing an option saves an `ImpactLogEntry` (§7) to local storage with status `scheduled`. The user can mark it `completed` or delete it.
- **Impact page:** a headline number (total modeled grams CO₂ difference for completed runs, shown in kg when ≥ 1000 g), plus counts of scheduled and completed runs. A "See details" section lists the entries and a brief explanation of the method.
- All local storage access is wrapped in try/catch, and the app works even if storage is unavailable.

### F9 — About page (P1) · Owners: Teammate C (content), Teammate B (page)

- Purpose, team members, and the honesty statement (§9).
- A "Download methodology" button serving `public/methodology.pdf` (or `.md`), generated from `docs/METHODOLOGY.md`, which covers data source, emission factors, forecast method, scheduling rules, and limitations.

### F10 — Footprint summary (P2) · Owner: Teammate C

- From the impact log, a short summary (e.g., "You've shifted 6 runs; most savings came from EV charging") plus 2–3 general, rule-based recommendations. No AI API needed.

### F7 / F8b — Accounts and server storage (P2) · Owner: Soumya

- Only start after all P1 work is merged. Supabase auth, explicit consent screen, server-stored recommendations (**never** calendars), and area-level aggregates to coordinate diversity across users.

---

## 7. Shared types (`lib/types.ts`)

These are the contract between all three workstreams. **Do not change them without team agreement.**

```ts
export type FuelCode = "COL" | "NG" | "NUC" | "OIL" | "WAT" | "SUN" | "WND" | "OTH";

export type HourIntensity = {
  hourStart: string;        // ISO 8601 with offset, America/New_York
  gco2PerKwh: number;
  isForecast: boolean;
};

export type GridResponse = {
  region: "ISNE";
  generatedAt: string;      // ISO
  latestDataHour: string;   // ISO, last hour of actual EIA data
  source: "live" | "fallback";
  recent: HourIntensity[];  // last 48 hours of actual data
  forecast: HourIntensity[];// 168 hours from the current hour
};

export type BusyBlock = { start: string; end: string; title?: string };

export type Appliance = {
  id: "laundry" | "dryer" | "dishwasher" | "ev" | "custom";
  name: string;
  defaultRuntimeMin: number;
  powerKw: number;          // average draw while running
  needsPresenceAtStart: boolean;
  needsPresenceAtEnd: boolean;
  presenceMinutes: number;  // default 10
};

export type AvailableHours = { startHour: number; endHour: number }; // e.g. 7, 23

export type ScheduleRequest = {
  appliance: Appliance;
  runtimeMin: number;
  now: string;              // ISO
  deadline: string;         // ISO, ≤ 7 days from now
  busy: BusyBlock[];
  availableHours: AvailableHours;
  forecast: HourIntensity[];
  diversitySeed: number;
};

export type OptionKind = "greenest" | "balanced" | "soonest";

export type ScheduleOption = {
  kind: OptionKind;
  start: string;
  end: string;
  modeledGrams: number;
  diffVsSoonestGrams: number;   // negative = cleaner
  diffVsSoonestPct: number;
  presenceWindows: { start: string; end: string }[];
};

export type ScheduleResult =
  | { ok: true; options: ScheduleOption[] }
  | { ok: false; reason: string };

export type ImpactLogEntry = {
  id: string;
  applianceId: Appliance["id"];
  start: string;
  end: string;
  kwh: number;
  modeledGrams: number;
  baselineGrams: number;        // the Soonest option's grams
  status: "scheduled" | "completed";
  createdAt: string;
};
```

## 8. Constants (`lib/constants.ts`)

**Emission factors** (gCO₂/kWh, IPCC lifecycle medians; `OTH` is an assumption based on biomass/refuse, documented as such):

| Fuel | Code | Factor |
|---|---|---|
| Coal | COL | 820 |
| Natural gas | NG | 490 |
| Oil | OIL | 650 |
| Solar | SUN | 45 |
| Hydro | WAT | 24 |
| Nuclear | NUC | 12 |
| Wind | WND | 11 |
| Other | OTH | 230 |

**Appliance presets:**

| ID | Name | Default runtime | Power (kW) | Presence at start | Presence at end |
|---|---|---|---|---|---|
| laundry | Washer | 60 min | 0.5 | yes | yes |
| dryer | Dryer | 60 min | 3.0 | yes | yes |
| dishwasher | Dishwasher | 120 min | 0.6 | yes | no |
| ev | EV charging (Level 2) | 240 min | 7.2 | yes | no |
| custom | Custom | user-set | user-set | user-set | user-set |

**Tunables:** `SLOT_MINUTES = 15`, `PRESENCE_MINUTES = 10`, `BALANCED_TOLERANCE = 0.10`, `DIVERSITY_TOLERANCE = 0.03`, `FORECAST_HISTORY_DAYS = 14`, `FETCH_HISTORY_DAYS = 21`, `DEFAULT_AVAILABLE_HOURS = { startHour: 7, endHour: 23 }`.

## 9. Non-functional requirements

- **Mobile-first:** every screen works at 375px width with no horizontal scroll. The schedule also looks good full-screen on a desktop monitor.
- **Privacy:** calendar files are parsed in the browser and never uploaded, logged, or stored. Only the impact log goes in local storage.
- **Honesty:** all numbers are labeled as modeled estimates. The About page states: "These are modeled comparisons based on the average generation mix, not verified avoided emissions, which would require marginal-emissions data."
- **Reliability:** the demo works with EIA down (fallback snapshot) and with a demo calendar (no user file needed).
- **Performance:** the planner shows results within 2 seconds of submitting on a phone (the scheduler runs client-side).
- **Accessibility:** color is never the only signal; buttons and inputs have labels; tap targets are at least 44px.

## 10. Architecture and folder structure

**Stack:** Next.js (App Router) + React + TypeScript + Tailwind CSS, deployed on Vercel. ical.js for calendar parsing. Vitest for unit tests. Local storage for the impact log. No database in v1.

```
app/
  page.tsx              # Home: short pitch + "Plan a run" button (B)
  plan/page.tsx         # Planner form + schedule + options (B)
  impact/page.tsx       # Impact dashboard (B)
  about/page.tsx        # About + methodology download (B, P1)
  api/grid/route.ts     # GET /api/grid (Soumya)
components/             # UI components (B)
lib/
  types.ts              # Shared contract (team-owned, change only by agreement)
  constants.ts          # Factors, presets, tunables (team-owned)
  grid/                 # EIA fetch, intensity, forecast, fallback.json (Soumya)
  calendar/             # .ics import and export (Soumya)
  scheduling/           # Scheduler + diversity (C)
  impact/               # Local storage impact log (C)
  mocks/                # Mock GridResponse + mock BusyBlocks for parallel work (team)
public/
  demo-calendar.ics
  methodology.pdf       # P1
docs/
  PRD.md  TODO.md  METHODOLOGY.md
```

## 11. Definition of done (v1 / demo-ready)

- The demo flow in §4 works on the **deployed Vercel URL** from a real phone, end to end, with no console errors.
- It still works when EIA is unreachable (fallback) and when no user calendar is uploaded (demo calendar).
- Scheduler, intensity, forecast, and calendar parsing have passing unit tests.
- `npm run build` succeeds on main.
- Devpost submission complete before the deadline (8:00 AM Sunday), ideally Saturday night.

## 12. Open questions (team decides; agents must not)

- Final color scale thresholds for gCO₂/kWh (proposed: use the min/max of the 7-day forecast so the scale always shows contrast).
- Whether the Balanced tolerance (10%) feels right after seeing real data.
- Whether to attempt any P2 item, and which one.
