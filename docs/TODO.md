# GridWait — Task List

Read `AGENTS.md` and `docs/PRD.md` before starting any task.

**How to use this file (agents):** work on **one task ID at a time**, and only the one the human names. When it's done and verified, change its `[ ]` to `[x]`. Don't check off, edit, or reorder anyone else's tasks.

**Owners:** **S** = Soumya (data, calendar, integration · Claude Code) · **B** = Teammate B (UI · Cursor) · **C** = Teammate C (scheduling logic, impact log, story · Cursor)

**Milestones**
- **Friday night:** Phase 0 merged; T-S1–T-S4 working; mocks let B and C build in parallel.
- **Saturday ~noon:** all of Phase 1 merged; Phase 2 integration working on the deployed URL from a phone. **This is the hard checkpoint.**
- **Saturday evening:** Phase 3 (P1) merged.
- **Saturday ~10 PM:** feature freeze on main. Only bug fixes after this.
- **Saturday night:** Devpost submitted (hard deadline 8:00 AM Sunday).

---

## Phase 0 — Setup (S, with the team present, ~1 hour)

Everything in Phase 0 goes to `main` before anyone branches.

- [x] **T-00 Scaffold the app** · S
  - `create-next-app` with TypeScript, Tailwind, App Router, ESLint. Install `ical.js`, and `vitest` as a dev dependency. Add `"test": "vitest run"` to scripts.
  - **Done when:** `npm run dev`, `npm run build`, and `npm test` (with one placeholder test) all succeed.
- [ ] **T-01 Add rules and docs** · S
  - Add `AGENTS.md`, `CLAUDE.md` (contains `@AGENTS.md`), `.cursor/rules/project.mdc`, `docs/PRD.md`, `docs/TODO.md`. Confirm `.env.local` is in `.gitignore`.
  - **Done when:** files are on main, and `git status` shows no env files tracked.
- [ ] **T-02 Shared contract** · S (agreed by all)
  - Create `lib/types.ts` and `lib/constants.ts` exactly as in PRD §7–§8.
  - **Done when:** both files compile and are on main.
- [ ] **T-03 Mocks and demo data** · S
  - `lib/mocks/grid.ts`: a realistic `GridResponse` (48 recent hours + 168 forecast hours with a believable daily pattern, cleaner overnight and midday).
  - `lib/mocks/busy.ts`: a `BusyBlock[]` for a student week.
  - `public/demo-calendar.ics`: the same student week as a real .ics file (classes, a job shift, a recurring club meeting via RRULE, one all-day event, one transparent event).
  - **Done when:** B and C can import the mocks, and the .ics file opens in Apple/Google Calendar.
- [ ] **T-04 Folder skeleton** · S
  - Create empty route pages (`/`, `/plan`, `/impact`, `/about`) and the folders in PRD §10 with placeholder files.
  - **Done when:** all four routes load.
- [ ] **T-05 Deploy** · S
  - Connect Vercel, add `EIA_API_KEY` to Vercel env vars, deploy main.
  - **Done when:** the deployed URL loads on all three teammates' phones.

---

## Phase 1 — P0 build (in parallel, each person on their own branch)

### S — Grid data and calendar (`app/api/`, `lib/grid/`, `lib/calendar/`)

- [ ] **T-S1 EIA client** · branch `s/eia-client`
  - `lib/grid/eia.ts`: fetch 21 days of ISNE hourly fuel-type data. **First hit the API once and inspect the real response**; base parsing on actual field names and fuel codes. Handle pagination if the response is truncated. 8-second timeout.
  - **Done when:** a script or test prints the parsed rows for the last 24 hours, with UTC periods converted to America/New_York.
- [ ] **T-S2 Carbon intensity** · branch `s/intensity`
  - `lib/grid/intensity.ts`: rows → `HourIntensity[]` using factors from `constants.ts`. Negative values → 0. Unknown codes → OTH (and logged).
  - **Done when:** unit tests pass for a hand-calculated hour, an hour with negative values, and an hour with an unknown code.
- [ ] **T-S3 Forecast** · branch `s/forecast`
  - `lib/grid/forecast.ts`: 168 hourly values from the current hour, each the mean of the same local hour-of-day over the last 14 days.
  - **Done when:** unit tests pass (correct length, correct hour alignment across a DST change, flat input → flat output).
- [ ] **T-S4 `/api/grid` route** · branch `s/api-grid`
  - Combine T-S1–T-S3 into `GET /api/grid` returning `GridResponse`. Cache 1 hour. On any failure, build the response from `lib/grid/fallback.json` (save a real snapshot from a successful fetch) with `source: "fallback"`.
  - **Done when:** the route returns valid data on the Vercel preview, and returns fallback data when the key is deliberately broken locally.
- [ ] **T-S5 Calendar import** · branch `s/ics-import`
  - `lib/calendar/parse.ts`: .ics text → merged, sorted `BusyBlock[]` within a given horizon. Expand RRULEs, skip TRANSPARENT events, skip all-day events unless `includeAllDay` is true, convert to America/New_York. Throws a typed error on invalid input.
  - **Done when:** unit tests pass using `public/demo-calendar.ics` (recurrence expanded, transparent skipped, all-day toggle works, overlaps merged) and an invalid file.
- [ ] **T-S6 Calendar export** · branch `s/ics-export`
  - `lib/calendar/export.ts`: `ScheduleOption` + `Appliance` → .ics string with one VEVENT, VALARM 15 min before start, and a second VALARM at the end if `needsPresenceAtEnd`. Plus a browser download helper.
  - **Done when:** the downloaded file imports correctly into Apple Calendar and Google Calendar with working alarms.

### C — Scheduling, diversity, impact log (`lib/scheduling/`, `lib/impact/`, `docs/`)

- [ ] **T-C1 Slot grid** · branch `c/slots`
  - Build 15-minute slots from the next boundary after `now` to `deadline`, each carrying its hour's intensity.
  - **Done when:** tests pass for slot count, boundary rounding, and a deadline less than one slot away.
- [ ] **T-C2 Validity rules** · branch `c/validity`
  - Implement the 4 validity rules from PRD F4, including available hours for presence windows only.
  - **Done when:** tests cover: presence at start blocked by a busy block, presence at end blocked, a busy block in the middle of the run (allowed), presence window outside available hours (rejected), and the run ending after the deadline (rejected).
- [ ] **T-C3 Emissions math** · branch `c/emissions`
  - Modeled grams for a run = Σ intensity × powerKw × 0.25.
  - **Done when:** tests match a hand calculation, including a run that spans two hours.
- [ ] **T-C4 Options + diversity** · branch `c/options`
  - `lib/scheduling/schedule.ts`: `schedule(req: ScheduleRequest): ScheduleResult`. Soonest, Greenest (seeded pick among near-optimal), Balanced; dedupe; diffs vs Soonest; typed "no valid window" result with a readable reason.
  - **Done when:** tests cover: same seed → same result, Greenest always within 3% of the true minimum, dedupe when options coincide, no-window case, and a full run on the mocks (`lib/mocks/*`) producing 3 sensible options.
- [ ] **T-C5 Impact log** · branch `c/impact-log`
  - `lib/impact/log.ts`: add, list, mark completed, delete, and totals, using local storage key `gridwait.v1.log`, with try/catch and an in-memory fallback. Also the stored diversity seed (`gridwait.v1.seed`).
  - **Done when:** tests pass using a mocked storage, including storage that throws.
- [ ] **T-C6 Pitch draft** · branch `c/pitch` (human-led; AI can help draft)
  - `docs/PITCH.md`: problem, demo script matching PRD §4, impact framing (modeled, honest), and the future slide (calendar sync, accounts, area coordination, more regions).
  - **Done when:** the team has read it once together.

### B — UI (`app/` pages except `app/api/`, `components/`)

Build everything against `lib/mocks/*` first. Real data is wired in Phase 2.

- [ ] **T-B1 App shell** · branch `b/shell`
  - Layout, header, navigation (Plan · Impact · About), base styles, and the home page with a one-line pitch and a "Plan a run" button.
  - **Done when:** all routes are navigable on a 375px-wide screen.
- [ ] **T-B2 Planner form** · branch `b/planner-form`
  - On `/plan`: calendar upload + "Use demo calendar" button + "count all-day events" toggle; appliance picker with presets (custom shows power and presence fields); runtime; deadline picker limited to the next 7 days; available hours (default 7 AM–11 PM).
  - **Done when:** the form produces a valid `ScheduleRequest` (logged to console) using mock data and mock busy blocks.
- [ ] **T-B3 7-day schedule grid** · branch `b/schedule-grid`
  - Intensity-colored hour cells + legend; mobile one-day view with day tabs and a compact 7-day strip; full grid on desktop; tap a cell to see time and value.
  - **Done when:** it renders the mock forecast correctly at 375px and at 1440px.
- [ ] **T-B4 Overlays** · branch `b/overlays`
  - Busy blocks (grey) and option blocks (labeled Greenest / Balanced / Soonest) on the grid.
  - **Done when:** mock busy blocks and three hardcoded mock options display correctly, including blocks that cross midnight.
- [ ] **T-B5 Option cards** · branch `b/option-cards`
  - Comparison cards (time, modeled CO₂, diff vs Soonest in g and %, "Choose" button), the "modeled estimate" label, the one-line diversity explanation, the "no valid window" message, and loading and error states.
  - **Done when:** all states render with mock data.
- [ ] **T-B6 Impact page** · branch `b/impact-page`
  - Headline modeled CO₂ number (g or kg), scheduled/completed counts, "See details" list with mark-completed and delete buttons, and an empty state.
  - **Done when:** it renders with mock log entries and with an empty log.

---

## Phase 2 — Integration (S leads; B and C fix issues in their own areas)

- [ ] **T-I1 Real grid data in the UI** · S · branch `s/wire-grid`
  - Planner fetches `/api/grid`, shows a "Using cached grid data" note when `source === "fallback"`.
- [ ] **T-I2 Real calendar + scheduler** · S · branch `s/wire-schedule`
  - Upload/demo calendar → `parse.ts` → `schedule()` → grid overlays and option cards.
- [ ] **T-I3 Choose → export → log** · S · branch `s/wire-choose`
  - "Choose" downloads the .ics (T-S6) and adds an impact log entry (T-C5); Impact page reads the real log.
- [ ] **T-I4 End-to-end check on the deployed URL** · S + team
  - Run the full PRD §4 demo flow on two real phones and the demo laptop. Then repeat with EIA blocked (fallback) and with no calendar upload (demo calendar).
  - **Done when:** all three runs work with no console errors. **Checkpoint: Saturday ~noon.**

---

## Phase 3 — P1 (only after T-I4 passes)

- [ ] **T-P1 Methodology doc** · C · `docs/METHODOLOGY.md` + `public/methodology.pdf`: data source, factors, forecast, scheduling rules, limitations, honesty statement.
- [ ] **T-P2 About page** · B · purpose, team, honesty statement, methodology download button.
- [ ] **T-P3 Weekday/weekend forecast** · S · per PRD F2 P1 note, with tests.
- [ ] **T-P4 Multiple calendar files** · S · upload and merge more than one .ics.
- [ ] **T-P5 Visual polish pass** · B (S may use the frontend-design skill to propose a style first) · consistent spacing, typography, color, and tap targets; desktop layout tuned for the ASUS monitor.
- [ ] **T-P6 Edge-case pass** · C · deadline very soon, calendar with no free time, custom appliance with 0 or huge values: all show friendly messages.

---

## Phase 4 — P2 stretch (only after all of Phase 3 is merged)

- [ ] **T-X1 Footprint summary + recommendations** · C (logic) + B (UI) · rule-based, from the impact log.
- [ ] **T-X2 Accounts and consent** · S · Supabase auth, consent screen, server-stored recommendations only (never calendars).
- [ ] **T-X3 Area-level diversity** · S · aggregate stored recommendations by area and steer new users toward less-crowded near-optimal windows.

---

## Phase 5 — Ship (humans; AI may assist with drafts)

- [ ] **T-Z1 Feature freeze** · all · Saturday ~10 PM: only bug fixes merge to main after this.
- [ ] **T-Z2 Final deploy check** · S · main deployed; demo flow passes once more on a phone.
- [ ] **T-Z3 Devpost page** · C · description, screenshots, tech stack, honesty statement, team.
- [ ] **T-Z4 Demo video + ASUS content post** · B · 60–90 seconds, following the demo script.
- [ ] **T-Z5 Rehearse the pitch** · all · at least twice, timed.
- [ ] **T-Z6 Submit on Devpost** · all · Saturday night (hard deadline 8:00 AM Sunday).
