"use client";

import { useCallback, useEffect, useState } from "react";
import type { RunRecord } from "@/lib/types";
import {
  GUEST_RUNS_CHANGED_EVENT,
  GUEST_RUNS_KEY,
  deleteGuestRun,
  listGuestRuns,
  markGuestRunDone,
  openGuestHistory,
} from "./guestHistory";
import {
  impactTotals,
  scoredRuns,
  sortRuns,
  type SortMode,
} from "./impactModel";
import ImpactSummary from "./ImpactSummary";
import RunList from "./RunList";

export default function ImpactDashboard() {
  const [sort, setSort] = useState<SortMode>("recent");
  const [runs, setRuns] = useState<RunRecord[] | null>(null);

  const reload = useCallback(() => {
    try {
      setRuns(listGuestRuns(openGuestHistory()));
    } catch {
      setRuns([]);
    }
  }, []);

  useEffect(() => {
    // Load after mount so SSR HTML matches the first client paint.
    /* eslint-disable react-hooks/set-state-in-effect */
    reload();
    /* eslint-enable react-hooks/set-state-in-effect */

    function onStorage(event: StorageEvent) {
      if (event.key === GUEST_RUNS_KEY || event.key === null) reload();
    }
    function onVisible() {
      if (document.visibilityState === "visible") reload();
    }
    function onPageShow() {
      reload();
    }
    function onRunsChanged() {
      reload();
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener(GUEST_RUNS_CHANGED_EVENT, onRunsChanged);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener(GUEST_RUNS_CHANGED_EVENT, onRunsChanged);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload]);

  function markDone(id: string) {
    try {
      setRuns(markGuestRunDone(openGuestHistory(), id));
    } catch {
      reload();
    }
  }

  function deleteRun(id: string) {
    try {
      setRuns(deleteGuestRun(openGuestHistory(), id));
    } catch {
      reload();
    }
  }

  if (runs === null) {
    return (
      <p role="status" className="mt-6 text-secondary">
        Loading your runs…
      </p>
    );
  }

  const rows = sortRuns(scoredRuns(runs), sort);
  const totals = impactTotals(runs);

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
      <p className="mt-6 text-sm text-muted">
        Scores use the forecast from when you planned each run. History stays on
        this device.
      </p>
    </div>
  );
}
