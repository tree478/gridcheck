import type { ScoreBand } from "@/lib/types";
import { HINT_CLASS } from "@/components/planner/plannerStyles";
import {
  formatMass,
  formatScore,
  modeledLabel,
  type ImpactTotals,
} from "./impactModel";

const BAND_TINT: Record<ScoreBand, string> = {
  "Top choice": "text-primary",
  Great: "text-primary",
  OK: "text-ink",
  "Could be cleaner": "text-muted",
};

type Props = { totals: ImpactTotals };

export default function ImpactSummary({ totals }: Props) {
  const runLabel = totals.runCount === 1 ? "run" : "runs";

  return (
    <section aria-labelledby="impact-summary-heading" className="min-w-0">
      <h2 id="impact-summary-heading" className="sr-only">
        Overall
      </h2>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10">
        <div>
          <p className="text-sm font-medium text-muted">Overall score</p>
          <p
            className={`mt-2 text-6xl font-bold tabular-nums tracking-tight ${BAND_TINT[totals.overallBand]}`}
          >
            {formatScore(totals.overallScore)}
          </p>
          <p className="mt-1 text-base font-medium text-secondary">
            {totals.overallBand}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-muted">CO₂ saved</p>
          <p
            className={`mt-2 text-4xl font-bold tabular-nums tracking-tight sm:text-5xl ${
              totals.totalSavedGrams < 0 ? "text-error" : "text-ink"
            }`}
          >
            {formatMass(totals.totalSavedGrams)}
          </p>
          <p className={`mt-1 ${HINT_CLASS}`}>{modeledLabel("vs Soonest")}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 border-t border-border pt-6 text-sm">
        <div>
          <p className="text-muted">Total modeled emissions</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-ink">
            {formatMass(totals.totalModeledGrams)}
          </p>
          <p className={`mt-0.5 ${HINT_CLASS}`}>{modeledLabel("CO₂")}</p>
        </div>
        <div>
          <p className="text-muted">Runs</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-ink">
            {totals.runCount}
          </p>
          <p className="mt-0.5 text-xs text-muted">{runLabel} on this device</p>
        </div>
      </div>
    </section>
  );
}
