"use client";

import Link from "next/link";
import { useState } from "react";
import { FOCUS_RING, HINT_CLASS, PRIMARY_BUTTON } from "@/components/planner/plannerStyles";
import { impactTotals, scoredRuns, sortRuns, type SortMode } from "./impactModel";
import ImpactSummary from "./ImpactSummary";
import { mockRuns } from "./mockRuns";
import RunList from "./RunList";

type Preview = "runs" | "empty";

const PREVIEW_OPTIONS: { id: Preview; label: string }[] = [
  { id: "runs", label: "Mock runs" },
  { id: "empty", label: "Empty history" },
];

// Honesty copy is required (PRD F16). Do not drop it to "clean up" the page.
const HONESTY =
  "Scores use the forecast from when each run was planned, not later actuals. History stays on this device. Every number is a modeled estimate.";

export default function ImpactDashboard() {
  // T-I3 will replace this in-component mock state with T-C5 guest history
  // (gridwait.v1.runs.guest) and T-C9 scoring. Do not invent another storage key.
  const [preview, setPreview] = useState<Preview>("runs");
  const [sort, setSort] = useState<SortMode>("recent");
  const [runs, setRuns] = useState(mockRuns);

  const rows = preview === "empty" ? [] : sortRuns(scoredRuns(runs), sort);
  const totals = impactTotals(preview === "empty" ? [] : runs);

  function markDone(id: string) {
    if (preview === "empty") return;
    setRuns((prev) => prev.map((run) => (run.id === id ? { ...run, status: "done" as const } : run)));
  }

  function deleteRun(id: string) {
    if (preview === "empty") return;
    setRuns((prev) => prev.filter((run) => run.id !== id));
  }

  return (
    <div className="mt-6 min-w-0">
      {preview === "empty" ? (
        <section
          aria-labelledby="impact-empty-heading"
          className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2 id="impact-empty-heading" className="text-xl font-semibold">
            No runs yet
          </h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            They appear after you tap Choose on Plan.
          </p>
          <Link href="/plan" className={`mt-4 ${PRIMARY_BUTTON}`}>
            Plan a run
          </Link>
        </section>
      ) : (
        <>
          <ImpactSummary totals={totals} />
          <RunList
            rows={rows}
            sort={sort}
            onSort={setSort}
            onMarkDone={markDone}
            onDelete={deleteRun}
          />
        </>
      )}

      <p className={`mt-6 ${HINT_CLASS}`}>{HONESTY}</p>

      <fieldset className={`mt-8 border-0 p-0 ${HINT_CLASS}`}>
        <legend className="text-xs text-zinc-500 dark:text-zinc-500">Preview states</legend>
        <div className="mt-1 flex flex-wrap gap-1">
          {PREVIEW_OPTIONS.map((option) => {
            const selected = preview === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setPreview(option.id)}
                aria-pressed={selected}
                className={`min-h-11 px-2 text-xs ${FOCUS_RING} ${
                  selected
                    ? "font-semibold text-zinc-700 underline decoration-zinc-400 underline-offset-4 dark:text-zinc-300"
                    : "text-zinc-500 dark:text-zinc-500"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
