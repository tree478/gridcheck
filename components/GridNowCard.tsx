import { TIMEZONE } from "@/lib/constants";
import type { GridResponse } from "@/lib/types";
import { colorForT } from "@/components/schedule-grid/gridMath";
import {
  cleanestWindow,
  formatWindowLabel,
} from "@/components/gridNowModel";

type Props = { grid: GridResponse };

const hourOnly = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  hour: "numeric",
});

function normalizeSpaces(s: string): string {
  return s.replace(/[\u202f\u00a0]/g, " ");
}

export default function GridNowCard({ grid }: Props) {
  const latest = grid.recent.at(-1);
  const next24 = grid.forecast.slice(0, 24);
  const values = next24.map((h) => h.gco2PerKwh);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const window = cleanestWindow(next24);
  const nowIso = next24[0]?.hourStart;

  const tickIndexes = [0, 3, 6, 9, 12, 15, 18, 21].filter(
    (i) => i < next24.length,
  );

  return (
    <section
      aria-labelledby="grid-now-heading"
      className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[0_8px_28px_rgba(18,32,28,0.06)] sm:p-6"
    >
      <h2 id="grid-now-heading" className="text-sm font-semibold text-ink">
        The grid:
      </h2>

      {latest ? (
        <>
          <p className="mt-4 text-display font-extrabold tabular-nums tracking-tight text-ink md:text-display-desktop">
            {Math.round(latest.gco2PerKwh)}{" "}
            <span className="text-base font-medium text-muted">g CO₂/kWh</span>
          </p>

          {next24.length > 0 ? (
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">Next 24 hours</p>
                <p className="flex items-center gap-2 font-mono text-caption text-muted md:text-caption-desktop">
                  <span
                    className="inline-block size-2.5 rounded-sm bg-scale-clean"
                    aria-hidden
                  />
                  Cleaner
                  <span
                    className="inline-block size-2.5 rounded-sm bg-scale-dirty"
                    aria-hidden
                  />
                  Dirtier
                </p>
              </div>

              <div
                className="mt-6 flex h-28 items-end gap-px sm:gap-0.5"
                role="img"
                aria-label="Decorative bar chart of modeled carbon intensity for the next 24 hours"
              >
                {next24.map((h, i) => {
                  const t =
                    max > min ? (h.gco2PerKwh - min) / (max - min) : 0.5;
                  const heightPct = 28 + t * 72;
                  const isNow = i === 0;
                  const inBest =
                    window !== null &&
                    i >= window.startIndex &&
                    i < window.startIndex + window.length;
                  return (
                    <div
                      key={h.hourStart}
                      className="relative flex min-w-0 flex-1 flex-col items-center justify-end"
                      style={{ height: "100%" }}
                    >
                      {isNow ? (
                        <span className="absolute -top-5 text-[0.625rem] font-medium text-muted">
                          Now
                        </span>
                      ) : null}
                      <div
                        className="w-full max-w-[14px] rounded-t-[3px]"
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: colorForT(t),
                          outline: inBest
                            ? "2px solid var(--primary)"
                            : undefined,
                          outlineOffset: inBest ? "1px" : undefined,
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-1 flex justify-between font-mono text-[0.625rem] text-muted">
                {tickIndexes.map((i) => (
                  <span key={next24[i].hourStart}>
                    {normalizeSpaces(
                      hourOnly.format(new Date(next24[i].hourStart)),
                    )
                      .replace(" ", "")
                      .toLowerCase()}
                  </span>
                ))}
              </div>

              {window ? (
                <p className="mt-2 text-center font-mono text-caption text-muted md:text-caption-desktop">
                  Best ·{" "}
                  {normalizeSpaces(
                    hourOnly.format(new Date(window.start.hourStart)),
                  )}
                  –
                  {normalizeSpaces(
                    hourOnly.format(
                      new Date(
                        Date.parse(window.end.hourStart) + 60 * 60 * 1000,
                      ),
                    ),
                  )}
                </p>
              ) : null}
            </div>
          ) : null}

          {window && latest ? (
            <div className="mt-5 rounded-[var(--radius-input)] bg-primary-tint px-4 py-3 text-body text-callout md:text-body-desktop">
              <p>
                Cleanest window:{" "}
                <strong className="font-semibold text-ink">
                  {formatWindowLabel(
                    window.start.hourStart,
                    window.end.hourStart,
                    nowIso,
                  )}
                </strong>
                . Intensity then averages about{" "}
                {Math.max(0, Math.round(latest.gco2PerKwh - window.avg))}{" "}
                gCO₂/kWh lower than now — a modeled estimate.
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-sm text-secondary">
          No recent grid data is available right now. Try again in a little
          while.
        </p>
      )}

      <p className="mt-4 text-caption text-muted md:text-caption-desktop">
        Live data uses EIA hourly fuel-mix for ISO New England. Modeled estimate
        from the average generation mix, not a measured emissions value.
      </p>
    </section>
  );
}
