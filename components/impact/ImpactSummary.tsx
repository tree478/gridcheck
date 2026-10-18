import { SCORE_BANDS } from "@/lib/constants";
import type { ScoreBand } from "@/lib/types";
import {
  formatMass,
  formatScore,
  type ImpactTotals,
} from "./impactModel";

const CARD =
  "rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6";

/** Segment colors matching the mock (left → dirty, right → clean). */
const BAND_FILL: Record<ScoreBand, string> = {
  "Could be cleaner": "bg-scale-dirty",
  OK: "bg-chip",
  Great: "bg-primary/45",
  "Top choice": "bg-primary",
};

/** Display order for the score gauge (dirty → clean). */
const GAUGE_BANDS: ScoreBand[] = [
  "Could be cleaner",
  "OK",
  "Great",
  "Top choice",
];

/** Width of each gauge segment as a share of 0–100 score. */
function gaugeWidths(): Record<ScoreBand, number> {
  const widths = {} as Record<ScoreBand, number>;
  const ordered = [...SCORE_BANDS].sort((a, b) => a.min - b.min);
  for (let i = 0; i < ordered.length; i++) {
    const cur = ordered[i]!;
    const next = ordered[i + 1];
    const end = next ? next.min : 100;
    widths[cur.band] = Math.max(0, end - cur.min);
  }
  return widths;
}

type Props = { totals: ImpactTotals };

export default function ImpactSummary({ totals }: Props) {
  const widths = gaugeWidths();
  const markerPct = Math.min(100, Math.max(0, totals.overallScore));

  return (
    <section aria-labelledby="impact-summary-heading" className="min-w-0 space-y-4">
      <h2 id="impact-summary-heading" className="sr-only">
        Summary
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={CARD}>
          <p className="text-sm font-medium text-muted">Overall score</p>
          <p
            className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="text-5xl font-extrabold tabular-nums tracking-tight text-primary sm:text-6xl">
              {formatScore(totals.overallScore)}
            </span>
            <span className="text-xl font-semibold text-primary">
              {totals.overallBand}
            </span>
          </p>
          <p className="mt-2 text-xs text-muted">
            Weighted by energy, so EV charging counts most
          </p>
          <div className="relative mt-5">
            <div
              className="flex h-2.5 overflow-hidden rounded-full"
              role="img"
              aria-label={`Score ${formatScore(totals.overallScore)} · ${totals.overallBand}`}
            >
              {GAUGE_BANDS.map((band) => (
                <div
                  key={band}
                  className={`h-full ${BAND_FILL[band]}`}
                  style={{ width: `${widths[band]}%` }}
                />
              ))}
            </div>
            <div
              className="pointer-events-none absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
              style={{ left: `${markerPct}%` }}
              aria-hidden
            />
            <div className="mt-2 flex justify-between gap-1 text-[10px] text-muted">
              <span>Could be cleaner</span>
              <span>OK</span>
              <span>Great</span>
              <span>Top</span>
            </div>
          </div>
        </div>

        <div className={CARD}>
          <p className="text-sm font-medium text-muted">CO₂ saved</p>
          <p
            className={`mt-3 text-5xl font-extrabold tabular-nums tracking-tight sm:text-6xl ${
              totals.totalSavedGrams < 0 ? "text-error" : "text-ink"
            }`}
          >
            {formatMass(totals.totalSavedGrams)}
          </p>
          <p className="mt-2 text-sm text-muted">vs. the soonest times</p>
        </div>

        <div className={CARD}>
          <p className="text-sm font-medium text-muted">Runs</p>
          <p className="mt-3 text-5xl font-extrabold tabular-nums tracking-tight text-ink sm:text-6xl">
            {totals.runCount}
          </p>
          <p className="mt-2 text-sm text-muted">
            {totals.scheduledCount} scheduled · {totals.doneCount} done
          </p>
          <p className="mt-4 border-t border-border pt-3 text-sm text-secondary">
            {formatMass(totals.totalModeledGrams)} CO₂ total
          </p>
        </div>
      </div>
    </section>
  );
}
