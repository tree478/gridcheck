# GridWait — Task List

Read `AGENTS.md` and `docs/PRD.md` (v2.1) before starting any task. If this file and the PRD disagree, stop and ask the human. Don't pick one yourself.

**How to use this file (agents):** work on **one task ID at a time**, and only the one the human names. When it's done and verified, change its `[ ]` to `[x]`. Don't check off, edit, or reorder anyone else's tasks. **Never build a task marked CUT.**

**Owners:** **S** = Soumya (grid data, calendar files, integration · Claude Code) · **B** = front end (Cursor) · **C** = scheduling, scoring, pitch (Cursor) · **All** = whole team

**Priority:** **Must** = demo doesn't work without it · **Then** = after all Must tasks are merged · **Stretch** = only if the 5 PM check passes with time to spare · **CUT** = not built this weekend (future slide)

> **v2.1 (Saturday 12:30 PM, build started late):** demand-based forecast (T-S5), accounts (T-C8, T-B7, T-B8), and calendar import before 5 PM (T-S7) are cut. Run history uses a single "guest" key. Full demo check moves to **5 PM**. All open design questions are decided in PRD §12.

**Milestones**

| Time | Milestone |
|---|---|
| ~1:05 PM | T-K1 shared contract merged; everyone pulls and starts (S → T-S1, B → T-B1, C → T-C1) |
| ~3:30 PM | T-S4, T-B3, T-C4 (single appliance) merged; deployed on Vercel |
| **5:00 PM** | **T-I4 full demo check on phones. Hard checkpoint.** |
| 5–7 PM | Then work; calendar stretch decision; 7 PM hard stop for calendar |
| 10:00 PM | Feature freeze: only bug fixes merge to main |
| Saturday night | Devpost submitted (hard deadline 8:00 AM Sunday) |

**Every task, every person**
1. `git switch main` → `git pull` → `git switch -c <branch>`
2. New agent chat: "Read AGENTS.md, then do T-XX from docs/TODO.md. Plan first and wait for my approval."
3. Reject edits outside your folders. `npm run lint`, `npm test`, `npm run build` must pass.
4. Commit → `git push -u origin <branch>` → PR into main → merge → tell the group to pull.

---

## Phase 0 — Setup and shared contract

- [x] **T-00 – T-03 Scaffold, rules/docs, original types/constants, mocks, demo .ics** · S
- [x] **T-04 Folder skeleton** · skipped; B creates the pages in T-B1.
- [ ] **T-K1 Update shared contract** · All (S drives) · **Must, blocks everyone** · branch `soumya/contract`
  - Replace `lib/types.ts` and `lib/constants.ts` with PRD §7–§8 exactly (tiers, `forecastMadeAt`, activity catalog with attention type and delay-start, `BusyBlock.asleep`, option labels, `RunRecord`, shared config including `NEAR_TIE_MARGIN = 0.03` and `MAX_DELAY_START_HOURS = 24`).
  - Update `lib/mocks/*` to the new types: a `GridResponse` with `measured` recent hours and 168 `pattern` hours; a student-week `BusyBlock[]` including sleep; a mock `ScheduleResult` with merged labels.
  - Put PRD v2.1 at `docs/PRD.md` and this file at `docs/TODO.md`.
  - **Done when:** everything compiles, `npm run build` passes, merged to main, and the team has pulled.
- [ ] **T-05 Deploy** · S · Must · (browser)
  - Import the repo into Vercel, add `EIA_API_KEY`, deploy main.
  - **Done when:** the deployed URL loads on all three teammates' phones and the link is shared.

---

## S — Grid data, calendar files, integration (Claude Code)

**Folders:** `app/api/**`, `lib/grid/**`, `lib/calendar/**`, `docs/STYLE.md`. Integration tasks may edit `app/plan/**` and `app/impact/**` after telling B. **Never** edit `lib/scheduling/**`, `lib/impact/**`, `lib/schedule-input/**`, or `components/**`. Never send calendar data to the server.

**Order:** T-K1 → T-S1 → T-S2 → T-S3 → T-S4 → T-05 → T-I1, T-I2 → T-I4 → T-S6, T-I3 → T-P5 → (stretch) T-S7

- [ ] **T-S1 EIA client** · Must · branch `soumya/eia-client`
  - `lib/grid/eia.ts`: EIA API v2, respondent `ISNE`, hourly `electricity/rto/fuel-type-data`, **last 28 days**. **Fetch once and print the real field names, fuel codes, and units before writing parsing code.** Handle pagination (max 5,000 rows/request). 8-second timeout. Key from `process.env.EIA_API_KEY`, server only.
  - Skip `region-data` (demand) unless it costs nothing extra; the demand tier is cut.
  - **Done when:** a test prints the last 24 h of fuel rows with UTC periods converted to America/New_York.
- [ ] **T-S2 Carbon intensity** · Must · branch `soumya/intensity`
  - `lib/grid/intensity.ts`: per hour Σ(MWh × factor) ÷ Σ(MWh) using `EMISSION_FACTORS`. Negative MWh → 0. Unknown codes → `OTH`, logged. Hours with no fuel data are dropped, never filled with 0. Output tagged `measured`.
  - **Done when:** tests pass for a hand-calculated hour, negatives, an unknown code, and a missing hour.
- [ ] **T-S3 Pattern forecast** · Must · branch `soumya/forecast`
  - `lib/grid/forecast.ts`: each of the next 168 hours = mean intensity at the same local weekday + hour over the last 4 weeks (3 if a week is missing), tagged `pattern`. Fill the gap between the latest measured hour and now with pattern values.
  - **Done when:** tests pass for length 168, DST-safe alignment, flat in → flat out, and gap fill.
- [ ] **T-S4 `/api/grid` route** · Must · branch `soumya/api-grid`
  - `app/api/grid/route.ts` returns `GridResponse` (each hour: `hourStart`, `gco2PerKwh`, `tier`; plus `forecastMadeAt`, `source`). Cache 1 h. On any EIA error or timeout, serve `lib/grid/fallback.json` (a real saved snapshot, re-aligned to start at the current hour) with `source: "fallback"`.
  - **Done when:** valid data on the Vercel preview, and fallback data when the key is deliberately broken locally. **Most important task: the demo must survive bad Wi-Fi.**
- [ ] **T-S6 Calendar export** · Then · branch `soumya/ics-export`
  - `lib/calendar/export.ts`: chosen `ScheduleOption` + `Activity` → `.ics` with one VEVENT, a VALARM 15 min before start (before `loadAt` with delay-start), and a second alarm at the end for `startEnd` attention. Plus a browser download helper.
  - **Done when:** the file imports into Apple Calendar with working alarms.
- [ ] **T-P5 Visual style proposal** · Then · branch `soumya/style`
  - Run the frontend-design skill; write colors (green → red scale, sleep shade, forecast marking), fonts, spacing, and card style into `docs/STYLE.md` only. Don't edit B's components. Do it early evening so B has time.
- [ ] **T-S7 Calendar import** · **Stretch: don't start before T-I4 passes** · branch `soumya/calendar-import`
  - Team picks **one** after the 5 PM check (see PRD F4b). Hard stop: drop it if it isn't working on a real phone by **7 PM**.
  - **Option A (preferred): Google free/busy** in `lib/calendar/google.ts`. Do the Google Cloud setup first (project, Calendar API, consent screen in Testing mode, team accounts as test users, web client ID, origins for localhost + Vercel). Browser-only token flow, scope `calendar.freebusy`, one free/busy call for the primary calendar → `BusyBlock[]` with `asleep: false`. Handle popup blocked, denied, expired, and non-test-user accounts without breaking the demo schedule.
    - **Done when:** a team test account connects on the deployed URL from a real phone and its busy times appear on the grid.
  - **Option B: `.ics` import** in `lib/calendar/parse.ts`. Browser only; expand recurring events; skip all-day and free events; accept several files, merge overlaps, skip unreadable files with a message naming them.
    - **Done when:** two overlapping `.ics` files → one merged sorted list; an invalid file errors without breaking the others.
- [ ] ~~**T-S5 Demand-based forecast tier**~~ · **CUT** (future slide). Spec kept in PRD F2b.

---

## B — Front end (Cursor)

**Folders:** `app/page.tsx`, `app/plan/**`, `app/impact/**`, `app/about/**`, `components/**`. Build everything against `lib/mocks/*` until integration.

- [x] **T-B1 App shell** · Must · branch `b/shell`
  - Header with logo; nav: Home · About · Plan · Impact. **No log-in or sign-up.** Create pages `/`, `/about`, `/plan`, `/impact`.
  - Home: purpose statement, "Plan a run" button, "grid right now" card (latest measured intensity).
  - About: how the forecast works (weekly pattern, last 4 weeks), the honesty statement (PRD §9), and why Recommended may differ from Greenest.
  - **Done when:** all routes are navigable at 375px with no horizontal scroll.
- [ ] **T-B3 7-day schedule grid** · Must · branch `b/schedule-grid` · **hardest screen; start early**
  - Hour cells colored by intensity (scale = min/max of the 7-day forecast); forecast hours visibly marked as forecast; legend; "Now" marker. Day tabs on mobile, full grid on desktop. Tap a cell to see time, value, and tier.
  - **Done when:** it renders the mock forecast correctly at 375px and 1440px.
- [ ] **T-B2 Planner form** · Must · branch `b/planner-form`
  - Pre-fills from catalog defaults. "Use demo schedule" button; busy-block list with "asleep" toggle (add/remove). Multi-select activities with editable duration and energy, and a delay-start toggle where supported. Deadline up to 7 days out. No "Save as my defaults."
  - **Done when:** the form produces a valid `ScheduleRequest` (logged to console) from mock data.
- [ ] **T-B4 Grid overlays** · Must · branch `b/overlays`
  - Busy blocks (sleep in a distinct shade); option blocks labeled Recommended / Greenest / Soonest, one block with combined labels when they coincide; markers for when the user is needed.
  - **Done when:** mock busy blocks and mock options display correctly, including blocks that cross midnight.
- [ ] **T-B5 Option cards** · Must · branch `b/option-cards` · depends on T-C4 types/mocks
  - Each card: time window, modeled CO₂, % saved vs. Soonest, confidence badge, attention needed, "Add to calendar," "Choose" (saves to guest history). After Choose, remaining activities' options refresh. One-line diversity explanation; "modeled estimate" label; loading, error, and "no valid window" (with suggestion) states. Worst is not shown as a card.
  - **Done when:** all states render with mock data.
- [ ] **T-B6 Impact dashboard** · Then · branch `b/dashboard` · depends on T-C5, T-C9
  - Reads guest history: overall score + band; total CO₂ saved vs. Soonest (negatives shown; kg when ≥ 1000 g); total modeled emissions; counts; band breakdown; runs list newest first (date, appliance, window, CO₂, saved, score + band, rank, status); sort by most recent / most sustainable; mark done, delete; empty state; note that scores use planning-time forecasts and history stays on this device.
  - **Done when:** it renders with mock runs and with an empty history.
- [ ] ~~**T-B7 Sign up**~~ · **CUT** (accounts)
- [ ] ~~**T-B8 Log in**~~ · **CUT** (accounts)

---

## C — Scheduling, scoring, pitch (Cursor)

**Folders:** `lib/scheduling/**`, `lib/impact/**`, `lib/schedule-input/**`, `docs/PITCH.md`, `docs/METHODOLOGY.md`. All pure functions with unit tests, no UI. Test against `lib/mocks/*`.

- [ ] **T-C1 Slots + activity catalog** · Must · branch `c/slots`
  - Split now → deadline (max 7 days) into 15-min slots from the next boundary, each with its hour's intensity and tier. Activity catalog per PRD §8 (energy per cycle, duration, attention `start` / `startEnd` / `throughout`, delay-start). Laptop preset optional.
  - **Done when:** tests pass for slot count, boundary rounding, and a deadline less than one slot away.
- [ ] **T-C7 Schedule input** · Must · branch `c/schedule`
  - `lib/schedule-input/`: demo schedule (student week: classes, job shift, recurring club meeting, sleep, gaps) and helpers to add/remove manual busy blocks with an "asleep" flag. Output sorted, merged `BusyBlock[]` (merged block is asleep only if all parts are).
  - **Done when:** tests pass for merge, sort, and asleep handling.
- [ ] **T-C2 Validity rules** · Must · branch `c/validity`
  - Run finishes by the deadline; user free at every attended moment for the attention type; busy and sleep blocks block only attended moments; delay-start loading at any free, non-asleep moment up to 24 h before start; multi-appliance attended moments ≥ 15 min apart.
  - **Done when:** tests cover start blocked, end blocked, busy middle allowed, sleep middle allowed, delay-start load during sleep rejected, past-deadline rejected.
- [ ] **T-C3 Emissions** · Must · branch `c/emissions`
  - Grams = Σ over slots of (slot intensity × kWh per slot), kWh per slot = energy per cycle ÷ slots in run.
  - **Done when:** tests match a hand calculation, including a run spanning two hours.
- [ ] **T-C4 Ranking** · **Must (single appliance) / Then (multi)** · branch `c/options`
  - `schedule(req): ScheduleResult` returning Soonest, Greenest, Best (confidence rule; equals Greenest while all hours are `pattern`), Recommended (seeded pick within `NEAR_TIE_MARGIN` of Best), Worst (scoring only), up to 5 alternatives ≥ 60 min apart. Coinciding options merge labels. "No valid window" result with a reason and suggestion (nearest valid run after the deadline, or which constraint blocked it).
  - Build single-appliance first. Then multi-appliance greedy: largest energy first, already-chosen runs as fixed blocks, re-rank the rest.
  - **Done when:** tests cover fixed-seed determinism, Recommended within margin, label merging, alternative spacing, no-window case, and a full run on the mocks.
- [ ] **T-C6 Pitch + methodology** · Must · branch `c/pitch` (no code; work on it while waiting)
  - `docs/PITCH.md`: problem, demo script (PRD §4), honest impact framing (average intensity, small per-load savings, EVs matter most), future work (demand-based forecast and confidence-aware ranking, accounts, shared load balancing, calendar sync). Use what ASUS said about judging.
  - `docs/METHODOLOGY.md`: data source, emission factors, forecast method, scheduling rules, scoring, limitations.
  - **Done when:** the team has read the pitch once together.
- [ ] **T-C5 Run history** · Then · branch `c/impact-log`
  - `lib/impact/`: local storage under a single "guest" key (keep the key a parameter): save, list (by run start, newest first), mark done, delete. Each run stores chosen, Best, Worst, Soonest grams (planning-time), kWh, window, confidence, `forecastMadeAt`, timestamp. Also stores the diversity seed. try/catch + in-memory fallback.
  - **Done when:** tests pass with mocked storage, including storage that throws.
- [ ] **T-C9 Scoring** · Then · branch `c/scoring`
  - Per run: (Worst − chosen) ÷ (Worst − Best) × 100, capped at 100, floor 0; within near-tie margin of Best → 100; Worst ≤ Best → 100. Bands: ≥ 95 Top choice · 75–94 Great · 50–74 OK · < 50 Could be cleaner. Overall = energy-weighted average. Saved = Soonest − chosen (negatives count). Rank by score, ties by recency. Totals: CO₂ saved, modeled emissions, counts, band breakdown.
  - **Done when:** tests cover each scoring edge case and band boundary.
- [ ] ~~**T-C8 Profiles**~~ · **CUT** (accounts)

---

## Integration — S leads (start when T-B3, T-B5, and T-C4 are merged)

- [ ] **T-I1 Real grid data** · S · Must · branch `soumya/wire-grid`
  - Planner fetches `/api/grid` instead of mocks; "Using cached grid data" note when `source === "fallback"`.
- [ ] **T-I2 Schedule wiring** · S · Must · branch `soumya/wire-schedule`
  - Schedule input (T-C7) → `schedule()` (T-C4) → grid overlays (T-B4) and option cards (T-B5).
- [ ] **T-I4 Full demo check** · S + All · Must · (testing)
  - PRD §4 flow on two phones + the demo laptop, then again with EIA blocked (fallback).
  - **Done when:** both runs work with no console errors. **Target 5 PM.**
- [ ] **T-I3 Choose flow** · S · Then · branch `soumya/wire-choose`
  - "Choose" saves to guest history (T-C5); "Add to calendar" downloads `.ics` (T-S6); dashboard reads real history + scores (T-C9).

---

## Ship — Saturday night

- [ ] **T-Z1 Feature freeze** · All · Must · 10 PM: only bug fixes merge to main after this.
- [ ] **T-Z2 Final deploy check** · S · Must · deployed URL from a real phone: full demo, fallback note when EIA unreachable, no console errors. Fix only what breaks.
- [ ] **T-Z3 Devpost page** · C · Must · description, screenshots, tech stack, honesty statement, team.
- [ ] **T-Z4 Demo video + ASUS content post** · B · Then · 60–90 s following the demo script.
- [ ] **T-Z5 Rehearse pitch** · All · Must · at least twice, timed.
- [ ] **T-Z6 Submit on Devpost** · All · Must · Saturday night (hard deadline 8:00 AM Sunday).

---

## If still behind schedule, cut next in this order

Already cut: ~~T-S5 demand tier~~ · ~~T-S7 before 5 PM~~ · ~~T-C8, T-B7, T-B8 accounts~~

1. Multi-appliance in T-C4 → single appliance
2. T-C9 scoring → show CO₂ saved only (T-B6 shows totals and runs list without scores)
3. T-S6 calendar export → hide "Add to calendar"
