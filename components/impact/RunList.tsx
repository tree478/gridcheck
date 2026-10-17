import { FOCUS_RING } from "@/components/planner/plannerStyles";
import type { SortMode, ScoredRun } from "./impactModel";
import RunRow from "./RunRow";

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: "recent", label: "Most recent" },
  { id: "sustainable", label: "Most sustainable" },
];

type Props = {
  rows: ScoredRun[];
  sort: SortMode;
  onSort: (mode: SortMode) => void;
  onMarkDone: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function RunList({
  rows,
  sort,
  onSort,
  onMarkDone,
  onDelete,
}: Props) {
  return (
    <section aria-labelledby="impact-runs-heading" className="mt-8 min-w-0">
      <h2
        id="impact-runs-heading"
        className="text-lg font-semibold text-secondary"
      >
        Runs
      </h2>

      <div
        role="group"
        aria-label="Sort runs"
        className="mt-3 flex min-w-0 flex-wrap gap-2"
      >
        {SORT_OPTIONS.map((option) => {
          const selected = sort === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSort(option.id)}
              aria-pressed={selected}
              className={`min-h-11 px-3 text-sm ${FOCUS_RING} ${
                selected
                  ? "font-semibold text-ink underline decoration-primary underline-offset-4"
                  : "font-medium text-muted hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-secondary">No runs in this list.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {rows.map((row) => (
            <RunRow
              key={row.run.id}
              row={row}
              onMarkDone={onMarkDone}
              onDelete={onDelete}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
