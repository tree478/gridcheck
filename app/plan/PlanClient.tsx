"use client";

import { useEffect, useState } from "react";
import PlanOptions from "@/components/option-cards/PlanOptions";
import PlannerForm from "@/components/planner/PlannerForm";
import {
  ERROR_CLASS,
  SECONDARY_BUTTON,
} from "@/components/planner/plannerStyles";
import ScheduleGrid from "@/components/schedule-grid/ScheduleGrid";
import { parseGridResponse } from "@/lib/grid/parse";
import { mockNoWindowResult, mockScheduleResult } from "@/lib/mocks/schedule";
import type { GridResponse } from "@/lib/types";

// A cold server instance waits out the 8 s EIA timeout before serving the
// fallback, so give the request room before showing an error.
const GRID_FETCH_TIMEOUT_MS = 15_000;

type GridState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; grid: GridResponse; now: string };

export default function PlanClient() {
  const [state, setState] = useState<GridState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GRID_FETCH_TIMEOUT_MS);
    let cancelled = false;

    fetch("/api/grid", { cache: "no-store", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: unknown) => {
        if (cancelled) return;
        const grid = parseGridResponse(json);
        // "now" is read when the data arrives, so the form and the grid share it.
        setState(
          grid
            ? { status: "ready", grid, now: new Date().toISOString() }
            : { status: "error" },
        );
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [attempt]);

  function retry() {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }

  if (state.status === "loading") {
    return (
      <p role="status" aria-live="polite" className="mt-8 text-secondary">
        Loading New England grid data… this can take up to 10 seconds.
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <div role="alert" className="mt-8">
        <p className={ERROR_CLASS}>
          We couldn&apos;t load grid data. Check your connection and try again.
        </p>
        <button type="button" onClick={retry} className={`mt-3 ${SECONDARY_BUTTON}`}>
          Try again
        </button>
      </div>
    );
  }

  const { grid, now } = state;
  return (
    <>
      {grid.source === "fallback" ? (
        <p
          role="status"
          className="mt-6 rounded-[var(--radius-input)] border border-border bg-surface px-4 py-3 text-sm text-secondary"
        >
          <strong className="font-semibold text-ink">Using cached grid data.</strong>{" "}
          Live EIA data isn&apos;t reachable right now, so the forecast comes
          from a saved snapshot of real New England hours.
        </p>
      ) : null}
      <div className="mt-8">
        <PlannerForm now={now} forecast={grid.forecast} />
      </div>
      <div className="mt-10">
        <ScheduleGrid hours={grid.forecast} now={now} />
      </div>
      {/* Options stay on mocks until the scheduler is wired in T-I2. */}
      <PlanOptions
        result={mockScheduleResult}
        noWindowResult={mockNoWindowResult}
        forecastMadeAt={grid.forecastMadeAt}
      />
    </>
  );
}
