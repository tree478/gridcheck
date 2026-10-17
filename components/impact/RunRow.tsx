import {
  HINT_CLASS,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
} from "@/components/planner/plannerStyles";
import {
  activityName,
  formatWindow,
} from "@/components/option-cards/optionCardModel";
import {
  formatMass,
  formatRunDate,
  formatScore,
  modeledLabel,
  type ScoredRun,
} from "./impactModel";

type Props = {
  row: ScoredRun;
  onMarkDone: (id: string) => void;
  onDelete: (id: string) => void;
};

function savedLine(grams: number): string {
  const mass = formatMass(grams);
  if (grams > 0) return modeledLabel(`${mass} saved vs Soonest`);
  if (grams === 0) return modeledLabel(`${mass} vs Soonest · baseline`);
  return modeledLabel(`${mass} vs Soonest`);
}

export default function RunRow({ row, onMarkDone, onDelete }: Props) {
  const { run, score, band, rank, savedGrams } = row;
  const name = activityName(run.activityId);
  const when = formatRunDate(run.start);
  const status = run.status === "done" ? "Done" : "Scheduled";

  return (
    <li className="min-w-0 border-t border-border py-4">
      <dl className="grid grid-cols-1 gap-2 text-sm text-secondary sm:grid-cols-2">
        <div>
          <dt className={HINT_CLASS}>Date</dt>
          <dd>
            <time dateTime={run.start}>{formatRunDate(run.start)}</time>
          </dd>
        </div>
        <div>
          <dt className={HINT_CLASS}>Appliance</dt>
          <dd>{name}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className={HINT_CLASS}>Window</dt>
          <dd>{formatWindow(run.start, run.end)}</dd>
        </div>
        <div>
          <dt className={HINT_CLASS}>CO₂</dt>
          <dd>{modeledLabel(formatMass(run.chosenGrams))}</dd>
        </div>
        <div>
          <dt className={HINT_CLASS}>vs Soonest</dt>
          <dd>
            {savedGrams < 0 ? (
              <span className="sr-only">Dirtier than Soonest. </span>
            ) : null}
            {savedGrams > 0 ? (
              <span className="sr-only">Cleaner than Soonest. </span>
            ) : null}
            <span className={savedGrams < 0 ? "text-error" : undefined}>
              {savedLine(savedGrams)}
            </span>
          </dd>
        </div>
        <div>
          <dt className={HINT_CLASS}>Score</dt>
          <dd>
            {formatScore(score)} · {band}
          </dd>
        </div>
        <div>
          <dt className={HINT_CLASS}>Rank</dt>
          <dd>Rank {rank}</dd>
        </div>
        <div>
          <dt className={HINT_CLASS}>Status</dt>
          <dd>{status}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {run.status === "scheduled" ? (
          <button
            type="button"
            onClick={() => onMarkDone(run.id)}
            aria-label={`Mark ${name} run done`}
            className={PRIMARY_BUTTON}
          >
            Mark done
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onDelete(run.id)}
          aria-label={`Delete ${name} run on ${when}`}
          className={`${SECONDARY_BUTTON} w-full sm:w-auto`}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
