"use client";

import { useId, useMemo, useRef, useState, type FormEvent } from "react";
import { MAX_HORIZON_DAYS } from "@/lib/constants";
import { mockBusy } from "@/lib/mocks/busy";
import { mockScheduleRequest } from "@/lib/mocks/schedule";
import type { ActivityId, HourIntensity, ScheduleRequest } from "@/lib/types";
import { activityDisplayName } from "@/components/schedule-grid/overlays";
import ActivityFields from "./ActivityFields";
import BusyBlockFields from "./BusyBlockFields";
import {
  buildScheduleRequest,
  busyBlocksToForm,
  defaultFormState,
  emptyBusyBlock,
  errorKey,
  formatLocal,
  isoToLocal,
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

// PLACEHOLDER: the per-device seed is owned by run history (T-C5) and wired at integration (T-I2).
// Until then the form reuses the mock seed so the request shape is complete. No local storage here.
const PLACEHOLDER_DIVERSITY_SEED = mockScheduleRequest.diversitySeed;

type Props = {
  /** ISO instant treated as "now"(MOCK_NOW until T-I1). */
  now: string;
  /** 168 hourly values from the current hour (GridResponse.forecast). */
  forecast: HourIntensity[];
};

type Submitted = {
  items: ScheduleRequest["items"];
  busyCount: number;
  asleepCount: number;
  deadline: string;
};

export default function PlannerForm({ now, forecast }: Props) {
  const baseId = useId();
  const [state, setState] = useState<PlannerFormState>(() =>
    defaultFormState(now),
  );
  const [attempted, setAttempted] = useState(false);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const manualCounter = useRef(0);

  // Validate on submit, then live until the form is clean again.
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
    // Replaces the current list. Sorting and overlap merging arrive with lib/schedule-input (T-C7).
    setState((s) => ({ ...s, busy: busyBlocksToForm(mockBusy, "demo") }));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAttempted(true);
    setFailure(null);
    try {
      const result = buildScheduleRequest(state, {
        now,
        forecast,
        diversitySeed: PLACEHOLDER_DIVERSITY_SEED,
      });
      if (!result.ok) {
        setSubmitted(null);
        return;
      }
      // Acceptance check for T-B2. The request holds mock busy blocks and the forecast, nothing personal.
      console.log("ScheduleRequest", result.request);
      setSubmitted({
        items: result.request.items,
        busyCount: result.request.busy.length,
        asleepCount: result.request.busy.filter((b) => b.asleep).length,
        deadline: result.request.deadline,
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
      className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm sm:p-5"
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
          onLoadDemo={loadDemo}
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
                Recommended times will appear here once the scheduler is
                connected. For now the request is logged to the browser console.
              </p>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
