"use client";

import { useCallback, useEffect, useState } from "react";
import PlanOptions from "@/components/option-cards/PlanOptions";
import PlannerForm from "@/components/planner/PlannerForm";
import { ERROR_CLASS, PRIMARY_BUTTON } from "@/components/planner/plannerStyles";
import ScheduleGrid from "@/components/schedule-grid/ScheduleGrid";
import { browserStore, createRunHistory } from "@/lib/impact/history";
import type {
  BusyBlock,
  GridResponse,
  HourIntensity,
  PlannedActivity,
  ScheduleResult,
} from "@/lib/types";

const EMPTY_RESULT: ScheduleResult = { results: [] };
const GRID_FETCH_MS = 15_000;

type GridStatus = "loading" | "ready" | "error";

type Submission = {
  busy: BusyBlock[];
  result: ScheduleResult;
  items: PlannedActivity[];
};

function isHourIntensity(value: unknown): value is HourIntensity {
  if (typeof value !== "object" || value === null) return false;
  const hour = value as Record<string, unknown>;
  return (
    typeof hour.hourStart === "string" &&
    typeof hour.gco2PerKwh === "number" &&
    Number.isFinite(hour.gco2PerKwh) &&
    (hour.tier === "measured" || hour.tier === "forecast" || hour.tier === "pattern")
  );
}

function isGridResponse(value: unknown): value is GridResponse {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return (
    body.region === "ISNE" &&
    typeof body.generatedAt === "string" &&
    typeof body.forecastMadeAt === "string" &&
    typeof body.latestDataHour === "string" &&
    (body.source === "live" || body.source === "fallback") &&
    Array.isArray(body.recent) &&
    body.recent.every(isHourIntensity) &&
    Array.isArray(body.forecast) &&
    body.forecast.every(isHourIntensity)
  );
}

function loadDiversitySeed(): number {
  try {
    const history = createRunHistory(browserStore());
    const existing = history.readSeed();
    if (typeof existing === "number") return existing;
    const next = Math.floor(Math.random() * 2 ** 31);
    if (!history.writeSeed(next)) return 1;
    return next;
  } catch {
    return 1;
  }
}

export default function PlanWorkspace() {
  const [grid, setGrid] = useState<GridResponse | null>(null);
  const [gridStatus, setGridStatus] = useState<GridStatus>("loading");
  const [gridAttempt, setGridAttempt] = useState(0);
  const [nowIso, setNowIso] = useState<string | null>(null);
  const [diversitySeed, setDiversitySeed] = useState(1);
  const [previewBusy, setPreviewBusy] = useState<BusyBlock[]>([]);
  const [submitted, setSubmitted] = useState<Submission | null>(null);
  const [planVersion, setPlanVersion] = useState(0);

  useEffect(() => {
    const now = new Date().toISOString();
    const seed = loadDiversitySeed();
    // The clock and the diversity seed exist only in the browser.
    /* eslint-disable react-hooks/set-state-in-effect */
    setNowIso(now);
    setDiversitySeed(seed);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), GRID_FETCH_MS);

    fetch("/api/grid", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("grid");
        const body: unknown = await response.json();
        if (!isGridResponse(body)) throw new Error("grid");
        if (!cancelled) {
          setGrid(body);
          setGridStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGrid(null);
          setGridStatus("error");
        }
      })
      .finally(() => {
        window.clearTimeout(timer);
      });

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [gridAttempt]);

  const onBusyChange = useCallback((blocks: BusyBlock[]) => {
    setPreviewBusy(blocks);
  }, []);

  const onScheduled = useCallback((submission: Submission) => {
    setSubmitted(submission);
    setPlanVersion((version) => version + 1);
  }, []);

  const onClearResult = useCallback(() => {
    setSubmitted(null);
    setPlanVersion((version) => version + 1);
  }, []);

  const retryGrid = useCallback(() => {
    setGrid(null);
    setGridStatus("loading");
    setGridAttempt((n) => n + 1);
  }, []);

  // Grid failures are shown above with Try again; keep options idle then.
  const optionsStatus: "loading" | "error" | "idle" | "ready" =
    gridStatus === "loading"
      ? "loading"
      : gridStatus === "error"
        ? "idle"
        : submitted
          ? "ready"
          : "idle";

  if (!nowIso) {
    return (
      <p role="status" className="mt-8 text-secondary">
        Finding clean times…
      </p>
    );
  }

  return (
    <div className="min-w-0">
      {gridStatus === "error" ? (
        <div role="alert" className="mt-8 space-y-3">
          <p className={ERROR_CLASS}>
            We couldn&apos;t load grid data. Check your connection and try again.
          </p>
          <button type="button" onClick={retryGrid} className={PRIMARY_BUTTON}>
            Try again
          </button>
        </div>
      ) : null}

      <div className="mt-8">
        <PlannerForm
          now={nowIso}
          forecast={grid?.forecast ?? null}
          gridStatus={gridStatus}
          diversitySeed={diversitySeed}
          onBusyChange={onBusyChange}
          onScheduled={onScheduled}
          onClearResult={onClearResult}
        />
      </div>

      {gridStatus === "ready" && grid ? (
        <div className="mt-10">
          {grid.source === "fallback" ? (
            <p role="status" className="mb-4 text-sm text-secondary">
              Using cached grid data.
            </p>
          ) : null}
          <ScheduleGrid
            hours={grid.forecast}
            now={nowIso}
            busy={previewBusy}
            result={submitted?.result ?? EMPTY_RESULT}
          />
        </div>
      ) : null}

      <PlanOptions
        key={planVersion}
        status={optionsStatus}
        result={submitted?.result ?? EMPTY_RESULT}
        items={submitted?.items ?? []}
        forecastMadeAt={grid?.forecastMadeAt ?? ""}
      />
    </div>
  );
}
