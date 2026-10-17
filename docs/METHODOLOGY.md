# GridWait — methodology

About and Devpost should follow this note. Every factor, threshold, and catalog energy below is from `docs/PRD.md` v2.1 §8 and §12 and `lib/constants.ts`. Nothing in this file is a new measured result.

All user-facing emissions are **modeled estimates** from the average generation mix.

## Data source

GridWait uses the U.S. Energy Information Administration API v2 for ISO New England, respondent `ISNE`, hourly.

| Series | Route | What we keep |
|---|---|---|
| Generation by fuel | `electricity/rto/fuel-type-data` | Last 28 days |
| Demand | `electricity/rto/region-data` | Actual demand (`D`). Day-ahead demand forecast (`DF`) is specified for the cut demand tier |

EIA `period` values are UTC. We convert them to `America/New_York` before aligning weekdays and hours. The API key is read only on the server (`process.env.EIA_API_KEY`). Requests paginate at 5,000 rows and time out after 8 seconds.

`GET /api/grid` caches the response for one hour. If EIA errors or times out, the route serves a saved snapshot (`lib/grid/fallback.json`), shifted so its 168 forecast hours start at the current hour, with `source: "fallback"`. The UI says "Using cached grid data."

## Emission factors

Intensity for one hour is the generation-weighted average:

**gCO₂/kWh = Σ (MWh × factor) ÷ Σ (MWh)**

Factors are IPCC lifecycle medians, in gCO₂/kWh. `OTH` is an assumption based on biomass and refuse, not an IPCC median.

| Fuel | Code | gCO₂/kWh |
|---|---|---|
| Coal | COL | 820 |
| Oil | OIL | 650 |
| Natural gas | NG | 490 |
| Other | OTH | 230 |
| Solar | SUN | 45 |
| Hydro | WAT | 24 |
| Nuclear | NUC | 12 |
| Wind | WND | 11 |

Negative generation is treated as 0. An unknown fuel code is counted as `OTH` and logged. An hour with no fuel data is dropped. It is never filled with 0.

This is the **average** mix. It is not a marginal emissions rate, and a lower modeled total is not a verified avoided-emissions claim.

## Forecast method

Each hour has a tier.

| Tier | One sentence | Shipped this weekend |
|---|---|---|
| `measured` | The intensity is computed from that hour's actual EIA fuel mix. | Yes, for past hours |
| `pattern` | The intensity is the mean of the same local weekday and hour over recent weeks. | Yes, for future hours and for the gap since the latest measured hour |
| `forecast` | The intensity is predicted from EIA's day-ahead demand with a line fit on recent measured hours. | No. The type remains so the tier can be added later |

**Pattern forecast (shipped).** Each of the next 168 hours is the mean intensity at the same local weekday and the same local hour over the last 4 weeks, or 3 weeks if one week is missing. Those hours are tagged `pattern`. The gap between the latest measured hour and now is filled with pattern values. Alignment uses the local weekday and hour so daylight-saving time does not shift the match. `forecastMadeAt` records when those values were computed.

**Demand-based tier (cut).** The spec, kept for later: fit `intensity = a + b × demand` by least squares on measured hours in the last 28 days. Hours covered by EIA's day-ahead demand forecast (`DF`) would be tagged `forecast`. Later hours would stay `pattern`. If fewer than 100 measured hours are available, or R² is below 0.2, the tier is skipped and every future hour stays `pattern`.

Because that tier is cut, every future hour is `pattern`. The confidence rule then has no higher-confidence hour to protect, so **Best and Greenest are the same window**. The UI still labels non-measured hours as a forecast.

## Scheduling rules

The horizon runs from the next 15-minute boundary after now through a deadline at most 7 days out. Each 15-minute slot carries its hour's intensity and tier. The hourly value is repeated across the slots in that hour.

### Activity catalog

Energy is per cycle. `custom` is user-set and is not in this table.

| ID | Name | Duration | Energy | Attention | Delay-start |
|---|---|---|---|---|---|
| washer | Washer | 60 min | 0.5 kWh | start and end | yes |
| dryer | Dryer | 60 min | 3.0 kWh | start and end | no |
| dishwasher | Dishwasher | 120 min | 1.2 kWh | start | yes |
| ev | EV charging (Level 2) | 240 min | 28.8 kWh | start | yes |
| laptop | Laptop charging | 90 min | 0.06 kWh | start | no |

Attention:

- `start`: the user is needed when the run starts.
- `startEnd`: the user is needed at the start and at the end.
- `throughout`: the user is needed for the whole run.

Each attended moment at the start or end lasts 10 minutes. A `throughout` run is attended the entire time.

### When a run is allowed

1. It finishes by the deadline.
2. The user is free for every attended moment.
3. Busy blocks and sleep block only attended moments. An unattended middle may overlap class, work, or sleep.
4. Delay-start, where the appliance supports it: the user may load at any free moment that is not asleep, at most 24 hours before the run starts. The load itself cannot fall during sleep. Sleep and ordinary busy time otherwise follow the same rule.
5. Two activities in one plan: their attended moments are at least 15 minutes apart. Unattended run time may overlap.

### Modeled grams

The cycle's energy is split evenly across the run's slots.

**kWh per slot = energy per cycle ÷ number of slots**

**grams = Σ (slot intensity in gCO₂/kWh × kWh per slot)**

### Which options we return

A run's confidence is the lowest-confidence tier among its slots. This weekend that tier is `pattern` for any run in the forecast.

| Label | Rule |
|---|---|
| Soonest | Earliest valid start. This is the baseline for "saved." |
| Greenest | Lowest modeled grams among valid runs. |
| Best | Lowest grams after the confidence rule. A later `pattern` run must beat a nearer, higher-confidence run by at least 10% (`CONFIDENCE_MARGIN` = 0.10) to win. With only `pattern` hours ahead, Best equals Greenest. |
| Recommended | A seeded pick among runs within 3% (`NEAR_TIE_MARGIN` = 0.03) of Best. The seed is stored on the device so one person sees a stable choice. The point is to spread users across near-equal hours rather than create a new peak. |
| Worst | Highest modeled grams among valid runs. Used for scoring. Not shown as a choice card. |
| Alternatives | Up to 5 more valid runs, each at least 60 minutes from every other returned option. |

When two labels land on the same window, they merge into one option with both labels.

If nothing is valid, the result names the reason and suggests the nearest valid run after the deadline when one exists within 7 days. Otherwise it says which constraint blocked the run: deadline, busy time, or sleep.

**More than one appliance** is specified as a second step: schedule the largest energy first, treat already chosen runs as fixed blocks, and re-rank the rest. After Choose, the remaining activities refresh around that choice. Single-appliance ranking is the Must path.

The line we show for diversity: "Several times are nearly as clean. We spread users across them so we don't create a new peak."

## Scoring

Scoring uses the grams stored at planning time (chosen, Best, Worst, and Soonest). It does not recompute them from later actuals.

**Per-run score = (Worst − chosen) ÷ (Worst − Best) × 100**

- Cap at 100. Floor at 0.
- If chosen is within 3% of Best, the score is 100.
- If Worst is less than or equal to Best, there is no spread and the score is 100.

**Saved = Soonest − chosen.** Positive means the chosen window is cleaner than the soonest window. Negative values are shown and counted.

**Overall score** is the energy-weighted average of the run scores (each run weighted by its kWh).

**Bands:** 95 and above, Top choice; 75–94, Great; 50–74, OK; below 50, Could be cleaner.

Runs are ranked by score. Ties break toward the more recent run. Totals are CO₂ saved, modeled emissions, counts, and the band breakdown. If scoring is not on the demo build, the screen shows CO₂ saved only.

## Limitations

- Comparisons use the average fuel mix. They are not marginal emissions and not verified avoided emissions.
- Default per-cycle energy is small except for EV charging. An EV session is 28.8 kWh; a washer cycle is 0.5 kWh; a laptop charge is 0.06 kWh. Per-load savings for laundry are small. EV charging is the load that matters most.
- The `OTH` factor (230 gCO₂/kWh) is an assumption based on biomass and refuse.
- Hours with no fuel rows are omitted, so the series can have gaps.
- The shipped forecast repeats recent weeks. It does not use the day-ahead demand forecast. Confidence shading does not vary across forecast days, and Best does not differ from Greenest.
- The near-tie seed is per device. Users are not coordinated with each other.
- The region is ISO New England only.
- Guest history and the diversity seed live in this browser's local storage. There is no account and no server copy. Calendar event titles are never stored, and calendar contents are never sent to our API.
- Scores and "saved" grams stay at the planning-time forecast even if the real hour later differs.
