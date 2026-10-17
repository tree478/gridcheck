import { SCORE_BANDS } from "@/lib/constants";
import type { ScoreBand } from "@/lib/types";
import { HINT_CLASS } from "@/components/planner/plannerStyles";
import { formatMass, formatScore, modeledLabel, type ImpactTotals } from "./impactModel";

const BAND_TINT: Record<ScoreBand, string> = {
  "Top choice": "text-emerald-800 dark:text-emerald-300",
  Great: "text-teal-800 dark:text-teal-300",
  OK: "text-sky-800 dark:text-sky-300",
  "Could be cleaner": "text-amber-800 dark:text-amber-200",
};

const CARD =
  "rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";

type Props = { totals: ImpactTotals };

export default function ImpactSummary({ totals }: Props) {
  const runLabel = totals.runCount === 1 ? "run" : "runs";

  return (
    <section aria-labelledby="impact-summary-heading" className="min-w-0">
      <h2 id="impact-summary-heading" className="text-xl font-semibold">
        Overall
      </h2>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className={CARD}>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Overall score</p>
          <p className={`mt-2 text-5xl font-bold tabular-nums ${BAND_TINT[totals.overallBand]}`}>
            {formatScore(totals.overallScore)}
          </p>
          <p className="mt-1 text-base font-medium text-zinc-800 dark:text-zinc-200">
            {totals.overallBand}
          </p>
        </div>

        <div className={CARD}>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            CO₂ saved vs Soonest
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-950 dark:text-zinc-50">
            {formatMass(totals.totalSavedGrams)}
          </p>
          <p className={`mt-1 ${HINT_CLASS}`}>{modeledLabel("vs Soonest")}</p>
        </div>

        <div className={CARD}>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Total modeled emissions
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-950 dark:text-zinc-50">
            {formatMass(totals.totalModeledGrams)}
          </p>
          <p className={`mt-1 ${HINT_CLASS}`}>{modeledLabel("CO₂")}</p>
        </div>

        <div className={CARD}>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Runs</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-950 dark:text-zinc-50">
            {totals.runCount}
          </p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{runLabel} on this device</p>
        </div>
      </div>

      <h3 className="mt-6 text-sm font-semibold text-zinc-800 dark:text-zinc-200">Band breakdown</h3>
      <ul className="mt-2 space-y-1 text-sm text-zinc-800 dark:text-zinc-200">
        {SCORE_BANDS.map(({ band }) => (
          <li key={band}>
            {totals.bandBreakdown[band]} × {band}
          </li>
        ))}
      </ul>
    </section>
  );
}
