"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { parseIcs, type IcsParseResult } from "@/lib/calendar/parse";
import { MAX_HORIZON_DAYS } from "@/lib/constants";
import { demoSchedule } from "@/lib/schedule-input/schedule";
import { schedule } from "@/lib/scheduling/schedule";
import type {
  ActivityId,
  BusyBlock,
  HourIntensity,
  ScheduleRequest,
  ScheduleResult,
} from "@/lib/types";
import { activityDisplayName } from "@/components/schedule-grid/overlays";
import ActivityFields from "./ActivityFields";
import BusyBlockFields from "./BusyBlockFields";
import {
  buildScheduleRequest,
  busyBlocksToForm,
  defaultFormState,
  emptyBusyBlock,
  errorKey,
  formBlocksToBusy,
  formatLocal,
  isoToLocal,
  localToIso,
  maxDeadlineIso,
  validatePlanner,
  type ActivityFormState,
  type BusyFormBlock,
  type PlannerFormState,
} from "./plannerModel";
import {
  ERROR_CLASS,
  HINT_CLASS,
  INPUT_CLASS,
  INPUT_ERROR,
  INPUT_OK,
  PRIMARY_BUTTON,
} from "./plannerStyles";

const AWAKE_NOTICE =
  "Imported events are treated as awake, and you should mark sleep with the asleep toggle so a run is not scheduled in the middle of the night.";

const GRID_LOADING = "Finding clean times…";
const GRID_ERROR = "We couldn't build options. Try again.";

type GridStatus = "loading" | "ready" | "error";

type ImportFeedback = { ok: true } | { ok: false; text: string };

type Props = {
  /** ISO instant for this page load. */
  now: string;
  /** Live forecast hours. Null until GET /api/grid succeeds. */
  forecast: HourIntensity[] | null;
  gridStatus: GridStatus;
  diversitySeed: number;
  onBusyChange: (blocks: BusyBlock[]) => void;
  onScheduled: (submission: { busy: BusyBlock[]; result: ScheduleResult }) => void;
  onClearResult: () => void;
};

type Submitted = {
  items: ScheduleRequest["items"];
  busyCount: number;
  asleepCount: number;
  deadline: string;
};

function parseWindow(deadlineLocal: string, now: string): { now: string; deadline: string } {
  const iso = deadlineLocal ? localToIso(deadlineLocal) : null;
  const nowMs = Date.parse(now);
  const deadlineMs = iso ? Date.parse(iso) : Number.NaN;
  if (iso && Number.isFinite(nowMs) && deadlineMs > nowMs) {
    return { now, deadline: iso };
  }
  return { now, deadline: maxDeadlineIso(now) ?? now };
}

export default function PlannerForm({
  now,
  forecast,
  gridStatus,
  diversitySeed,
  onBusyChange,
  onScheduled,
  onClearResult,
}: Props) {
  const baseId = useId();
  const [state, setState] = useState<PlannerFormState>(() => defaultFormState(now));
  const [attempted, setAttempted] = useState(false);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<ImportFeedback | null>(null);
  const manualCounter = useRef(0);

  useEffect(() => {
    onBusyChange(formBlocksToBusy(state.busy));
  }, [state.busy, onBusyChange]);

  const errors = useMemo(
    () => (attempted ? validatePlanner(state, now) : {}),
    [attempted, state, now],
  );
  const errorCount = Object.keys(errors).length;

  const deadlineId = `${baseId}-deadline`;
  const deadlineError = errors[errorKey.deadline];
  const deadlineMin = isoToLocal(now) ?? undefined;
  const maxIso = maxDeadlineIso(now);
  const deadlineMax = maxIso ? (isoToLocal(maxIso) ?? undefined) : undefined;

  function updateActivity(id: ActivityId, patch: Partial<ActivityFormState>) {
    setSubmitted(null);
    setState((s) => ({
      ...s,
      activities: s.activities.map((a) =>
        a.activity.id === id ? { ...a, ...patch } : a,
      ),
    }));
  }

  function updateBusy(key: string, patch: Partial<BusyFormBlock>) {
    setSubmitted(null);
    setState((s) => ({
      ...s,
      busy: s.busy.map((b) => (b.key === key ? { ...b, ...patch } : b)),
    }));
  }

  function removeBusy(key: string) {
    setSubmitted(null);
    setState((s) => ({ ...s, busy: s.busy.filter((b) => b.key !== key) }));
  }

  function addBusy() {
    setSubmitted(null);
    manualCounter.current += 1;
    setState((s) => ({
      ...s,
      busy: [...s.busy, emptyBusyBlock(`manual-${manualCounter.current}`)],
    }));
  }

  function loadDemo() {
    setSubmitted(null);
    setImportFeedback(null);
    onClearResult();
    setState((s) => ({ ...s, busy: busyBlocksToForm(demoSchedule(), "demo") }));
  }

  function onImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      let parsed: IcsParseResult;
      try {
        parsed = parseIcs(text, parseWindow(state.deadlineLocal, now));
      } catch {
        setImportFeedback({
          ok: false,
          text: `${file.name}: This file could not be read as a calendar.`,
        });
        return;
      }
      if (!parsed.ok) {
        setImportFeedback({ ok: false, text: `${file.name}: ${parsed.reason}` });
        return;
      }
      const blocks = parsed.blocks;
      setImportFeedback({ ok: true });
      setSubmitted(null);
      onClearResult();
      setState((s) => ({ ...s, busy: busyBlocksToForm(blocks, "ics") }));
    };
    reader.onerror = () => {
      setImportFeedback({
        ok: false,
        text: `${file.name}: This file could not be read as a calendar.`,
      });
    };
    reader.readAsText(file);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAttempted(true);
    setFailure(null);
    if (gridStatus !== "ready" || forecast === null) {
      setFailure(gridStatus === "loading" ? GRID_LOADING : GRID_ERROR);
      return;
    }
    try {
      const built = buildScheduleRequest(state, {
        now,
        forecast,
        diversitySeed,
      });
      if (!built.ok) {
        setSubmitted(null);
        return;
      }
      const results = built.request.items.flatMap(
        (item) =>
          schedule({
            ...built.request,
            items: [item],
            fixedRuns: [],
          }).results,
      );
      onScheduled({ busy: built.request.busy, result: { results } });
      setSubmitted({
        items: built.request.items,
        busyCount: built.request.busy.length,
        asleepCount: built.request.busy.filter((b) => b.asleep).length,
        deadline: built.request.deadline,
      });
    } catch {
      setSubmitted(null);
      setFailure(
        "Something went wrong while building your plan. Please check the fields and try again.",
      );
    }
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-labelledby={`${baseId}-heading`}
      className="min-w-0 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm sm:p-5"
    >
      <h2
        id={`${baseId}-heading`}
        className="text-sm font-semibold uppercase tracking-wide text-muted"
      >
        Planner
      </h2>

      <div className="mt-5 space-y-8">
        <ActivityFields
          baseId={baseId}
          items={state.activities}
          errors={errors}
          onChange={updateActivity}
        />

        <BusyBlockFields
          baseId={baseId}
          blocks={state.busy}
          errors={errors}
          importNotice={importFeedback?.ok ? AWAKE_NOTICE : null}
          importError={importFeedback && !importFeedback.ok ? importFeedback.text : null}
          onLoadDemo={loadDemo}
          onImportFile={onImportFile}
          onAdd={addBusy}
          onRemove={removeBusy}
          onChange={updateBusy}
        />

        <div>
          <label htmlFor={deadlineId} className="text-base font-semibold">
            When does it need to be done by?
          </label>
          <p className={`mt-1 ${HINT_CLASS}`}>
            Up to {MAX_HORIZON_DAYS} days out
            {maxIso ? `, by ${formatLocal(maxIso)}` : ""}. Eastern time.
          </p>
          <input
            id={deadlineId}
            type="datetime-local"
            value={state.deadlineLocal}
            min={deadlineMin}
            max={deadlineMax}
            onChange={(e) => {
              setSubmitted(null);
              const deadlineLocal = e.target.value;
              setState((s) => ({ ...s, deadlineLocal }));
            }}
            aria-invalid={deadlineError ? true : undefined}
            aria-describedby={deadlineError ? `${deadlineId}-error` : undefined}
            className={`mt-2 sm:max-w-xs ${INPUT_CLASS} ${deadlineError ? INPUT_ERROR : INPUT_OK}`}
          />
          {deadlineError && (
            <p id={`${deadlineId}-error`} className={ERROR_CLASS}>
              {deadlineError}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <div aria-live="polite">
          {attempted && errorCount > 0 && (
            <p className={`mb-3 ${ERROR_CLASS}`}>
              Please fix{" "}
              {errorCount === 1 ? "the item" : `the ${errorCount} items`} marked
              above, then try again.
            </p>
          )}
          {failure && <p className={`mb-3 ${ERROR_CLASS}`}>{failure}</p>}
        </div>

        <button type="submit" className={PRIMARY_BUTTON}>
          Find clean times
        </button>

        <div role="status" aria-live="polite">
          {submitted && (
            <div className="mt-4 rounded-[var(--radius-button)] border border-primary bg-primary-tint p-3 text-sm text-callout">
              <p className="font-semibold">Your plan is ready to schedule.</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {submitted.items.map((item) => (
                  <li key={item.activity.id}>
                    {activityDisplayName(item.activity.id)}:{" "}
                    {item.durationMin} min,{" "}
                    {item.energyKwh} kWh
                    {item.delayStart && ", delay-start"}
                  </li>
                ))}
                <li>
                  {submitted.busyCount} busy{" "}
                  {submitted.busyCount === 1 ? "block" : "blocks"}
                  {submitted.asleepCount > 0 &&
                    ` (${submitted.asleepCount} asleep)`}
                </li>
                <li>
                  Done by{" "}
                  <time dateTime={submitted.deadline}>
                    {formatLocal(submitted.deadline)}
                  </time>
                </li>
              </ul>
              <p className={`mt-2 ${HINT_CLASS}`}>
                Recommended, greenest, and soonest windows are on the week grid
                and in the cards below. Every emissions figure is a modeled
                estimate.
              </p>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
