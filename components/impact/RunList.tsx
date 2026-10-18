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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="impact-runs-heading"
          className="text-xl font-extrabold tracking-tight text-ink"
        >
          Runs
        </h2>

        <div
          role="group"
          aria-label="Sort runs"
          className="inline-flex rounded-full bg-chip p-1"
        >
          {SORT_OPTIONS.map((option) => {
            const selected = sort === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSort(option.id)}
                aria-pressed={selected}
                className={`min-h-10 rounded-full px-3.5 text-sm ${FOCUS_RING} ${
                  selected
                    ? "bg-surface font-semibold text-ink shadow-sm"
                    : "font-medium text-muted hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
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
