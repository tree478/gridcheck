# GridWait — pitch

**HackHarvard 2026 · ASUS "Save the Earth"**
**Draft for a team read-through.** T-C6 is done when the team has read this once together. Numbers and scope come from `docs/PRD.md` v2.1. This draft does not add emission factors or savings claims.

Say this in under a minute, then run the demo. If a judge asks how a number was made, use `docs/METHODOLOGY.md`.

## Problem

New England's power is not equally clean every hour. The mix of gas, nuclear, hydro, solar, and wind changes with the hour, the day, and the season. The same appliance, using the same energy, has a different carbon footprint at different times. A student with a full week has no simple way to see that and still make class, a shift, and sleep.

## What we show

GridWait is a phone-friendly web app for a New England student who does laundry, runs a dishwasher, or charges an EV. They load a week, pick the appliances, and set a deadline. The app returns a few times that fit the moments they actually have to be there, with one clear recommendation.

This weekend the forecast is a weekly pattern, not a demand model. Every future hour is tagged `pattern`, so **Best and Greenest are the same window**. Recommended can still be a different near-tie. There are no accounts. History stays on the phone.

## Honest impact

Say this sentence. It is also the About and Devpost line:

> These are modeled comparisons based on the average generation mix, not verified avoided emissions, which would require marginal-emissions data.

Every grams figure on screen is a **modeled estimate**. We compare hours using the average fuel mix. We do not claim verified avoided emissions.

Per-load savings are small. Default energy per cycle:

| Appliance | Energy |
|---|---|
| Laptop charging | 0.06 kWh |
| Washer | 0.5 kWh |
| Dishwasher | 1.2 kWh |
| Dryer | 3.0 kWh |
| EV charging (Level 2) | 28.8 kWh |

An EV session in the catalog is 28.8 ÷ 0.5 = **57.6 times the washer's energy**. A laptop charge is 0.06 kWh. At the same intensity, shifting the EV moves far more carbon than shifting one washer. The washer saving is real and small. We say that before anyone asks.

The laptop preset is in the catalog because the ASUS conversation asked for it. It is not the impact story.

## Demo script

Phone in hand, mirrored on the ASUS monitor. One person taps. One person talks. Target: steps 1–7 in about 60 seconds. Step 8 is the honesty close.

1. **Home.** "Electricity is cleaner some hours than others. GridWait finds a time that fits the week." Point at the grid-right-now card. Tap **Plan a run**.
2. **Demo schedule.** Tap **Use demo schedule**. "This is a student week: class, a job shift, a club meeting, and sleep. Sleep is the distinct shade."
3. **Appliances.** Select **Washer** and **Dishwasher**. Leave the defaults, or edit them if asked. Turn on delay-start for the dishwasher. Set the deadline to Thursday 9 PM. "The washer needs me at the start and at the end. The dishwasher can start itself after I load it."
4. **Grid.** "Color is only a hint: green is cleaner, red is dirtier, and every cell still has a value and a tier. Forecast hours are marked. Busy time and sleep sit on top. The labeled blocks are the options."
5. **Cards.** "Each card is a modeled estimate: the window, grams of CO₂, percent saved versus the soonest legal time, a confidence badge, and when I have to be there."
6. **Choose.** Tap **Choose** on the washer's Recommended option. "Saved on this phone. The dishwasher's options refresh around that choice." If calendar export is on this build, tap **Add to calendar**. "That downloads a calendar file with reminders." If it is not on this build, skip the tap.
7. **Impact.** "CO₂ saved versus soonest, and the runs we chose. The numbers use the forecast from planning time, not a later measurement." If scoring is on this build, add the score and band. If it is not, stop at CO₂ saved.
8. **About.** "The next week is the same weekday and hour over the last four weeks. These are modeled comparisons based on the average generation mix, not verified avoided emissions, which would require marginal-emissions data. Recommended can differ from Greenest so we don't put every user on the same hour."

**One appliance.** If multi-appliance ranking is not in the build, do steps 1–5 with the washer only, then Choose, then Impact.

**EIA down.** Run the same taps. When the note is on screen, say "Using cached grid data." The fallback is part of the demo, not a failure.

**If they ask why Best and Greenest match.** "Every future hour this weekend is a pattern, so the confidence rule has nothing higher to compare. Best and Greenest are the same. Recommended may still move inside a 3% band so one user does not always take the single cleanest slot. A demand-based forecast, and ranking that prefers higher-confidence hours, is future work."

## Future work

- **Demand-based forecast and confidence-aware ranking.** Fit intensity to demand, tag hours covered by the day-ahead demand forecast as `forecast`, and let Best require a later, lower-confidence hour to win by at least 10%.
- **Accounts.** On-device profiles were cut. If they return, say plainly that on-device profiles are not real security.
- **Shared load balancing.** Today the near-tie pick uses a seed stored on the device. Coordinating users so they do not create a new peak would need a server. We do not have one.
- **Calendar sync.** The demo uses a built-in week plus blocks the user types. Live calendar connect is a stretch decided after the demo check. Google free/busy is the preferred design because it never sends event titles to us.

## What we will not say

- We will not call a modeled difference "verified avoided emissions."
- We will not quote a grams-saved total that is not on the screen in front of the judge.
- We will not describe the demand-based tier, accounts, or shared balancing as shipped.
- We will not promise regions beyond ISO New England (EIA respondent `ISNE`).

## What the ASUS track asks of this pitch

The repo does not include a separate ASUS rubric. `docs/PRD.md` records how that track and conversation shape the pitch:

- The track is ASUS "Save the Earth." The demo is the 60-second path above, on a phone mirrored to the ASUS monitor. The 60–90 second video, if we make it, follows this script and is a later task.
- Judge the impact claim by the honesty rules in PRD §9: average generation mix, small per-load savings, EV charging matters most.
- The laptop preset (90 minutes, 0.06 kWh, attention at the start, no delay-start) exists because of the ASUS conversation. Show it only as a catalog option. The EV is the impact example.
