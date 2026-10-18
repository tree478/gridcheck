"use client";

import { useState } from "react";
import {
  impactTotals,
  scoredRuns,
  sortRuns,
  type SortMode,
} from "./impactModel";
import ImpactSummary from "./ImpactSummary";
import { mockRuns } from "./mockRuns";
import RunList from "./RunList";

export default function ImpactDashboard() {
  // T-I3 will replace this in-component mock state with T-C5 guest history
  // (gridwait.v1.runs.guest) and T-C9 scoring. Do not invent another storage key.
  const [sort, setSort] = useState<SortMode>("recent");
  const [runs, setRuns] = useState(mockRuns);

  const rows = sortRuns(scoredRuns(runs), sort);
  const totals = impactTotals(runs);

  function markDone(id: string) {
    setRuns((prev) =>
      prev.map((run) =>
        run.id === id ? { ...run, status: "done" as const } : run,
      ),
    );
  }

  function deleteRun(id: string) {
    setRuns((prev) => prev.filter((run) => run.id !== id));
  }

  return (
    <div className="mt-6 min-w-0">
      <ImpactSummary totals={totals} />
      <RunList
        rows={rows}
        sort={sort}
        onSort={setSort}
        onMarkDone={markDone}
        onDelete={deleteRun}
      />
    </div>
  );
}
