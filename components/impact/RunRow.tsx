import {
  FOCUS_RING,
  HINT_CLASS,
} from "@/components/planner/plannerStyles";
import {
  activityName,
  formatWindow,
} from "@/components/option-cards/optionCardModel";
import type { ScoreBand } from "@/lib/types";
import {
  formatMass,
  formatRunDate,
  formatScore,
  type ScoredRun,
} from "./impactModel";

type Props = {
  row: ScoredRun;
  onMarkDone: (id: string) => void;
  onDelete: (id: string) => void;
};

const BADGE: Record<ScoreBand, string> = {
  "Top choice": "bg-primary text-white",
  Great: "bg-primary/70 text-white",
  OK: "bg-chip text-ink",
  "Could be cleaner": "bg-scale-dirty text-white",
};

function vsSoonestLine(grams: number): { text: string; className: string } {
  const mass = formatMass(Math.abs(grams));
  if (grams > 0) {
    return { text: `${mass} saved`, className: "font-semibold text-primary" };
  }
  if (grams === 0) {
    return { text: `${mass} · baseline`, className: "text-muted" };
  }
  return {
    text: `+${mass} more`,
    className: "font-semibold text-error",
  };
}

export default function RunRow({ row, onMarkDone, onDelete }: Props) {
  const { run, score, band, savedGrams } = row;
  const name = activityName(run.activityId);
  const when = formatRunDate(run.start);
  const window = formatWindow(run.start, run.end);
  const vs = vsSoonestLine(savedGrams);

  return (
    <li className="min-w-0 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <div
          className={`flex size-14 shrink-0 items-center justify-center rounded-[var(--radius-button)] text-xl font-extrabold tabular-nums ${BADGE[band]}`}
          aria-label={`Score ${formatScore(score)}, ${band}`}
        >
          {formatScore(score)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-ink">{name}</p>
          <p className="mt-0.5 text-sm text-muted">
            <time dateTime={run.start}>{when}</time>
            <span aria-hidden> · </span>
            {window.replace(/^[A-Za-z]{3}\s/, "")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:shrink-0 sm:gap-8">
          <div>
            <p className={`font-mono text-[10px] font-semibold uppercase tracking-wide ${HINT_CLASS}`}>
              CO₂
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">
              {formatMass(run.chosenGrams)}
            </p>
          </div>
          <div>
            <p className={`font-mono text-[10px] font-semibold uppercase tracking-wide ${HINT_CLASS}`}>
              Vs. soonest
            </p>
            <p className={`mt-0.5 text-sm tabular-nums ${vs.className}`}>
              {savedGrams < 0 ? (
                <span className="sr-only">Dirtier than Soonest. </span>
              ) : null}
              {savedGrams > 0 ? (
                <span className="sr-only">Cleaner than Soonest. </span>
              ) : null}
              {vs.text}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:shrink-0 sm:justify-end">
          {run.status === "done" ? (
            <span className="inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-white">
              Done
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onMarkDone(run.id)}
              aria-label={`Mark ${name} run as done`}
              className={`inline-flex min-h-10 items-center justify-center rounded-[var(--radius-button)] border border-border bg-surface px-3 text-sm font-semibold text-ink hover:bg-chip ${FOCUS_RING}`}
            >
              Mark as done
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(run.id)}
            aria-label={`Delete ${name} run on ${when}`}
            className={`inline-flex size-10 items-center justify-center rounded-[var(--radius-button)] text-muted hover:bg-chip hover:text-ink ${FOCUS_RING}`}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </li>
  );
}

function TrashIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
