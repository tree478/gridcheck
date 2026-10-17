"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { MAX_HORIZON_DAYS } from "@/lib/constants";
import { mockScheduleRequest } from "@/lib/mocks/schedule";
import type {
  ActivityId,
  BusyBlock,
  HourIntensity,
  ScheduleRequest,
} from "@/lib/types";
import { activityDisplayName } from "@/components/schedule-grid/overlays";
import ActivityFields from "./ActivityFields";
import BusyBlockFields from "./BusyBlockFields";
import {
  buildScheduleRequest,
  busyFormToBlocks,
  defaultFormState,
  errorKey,
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

const PLACEHOLDER_DIVERSITY_SEED = mockScheduleRequest.diversitySeed;

type Props = {
  now: string;
  forecast: HourIntensity[];
  /** Fires whenever uploaded busy blocks change (empty until a .ics is loaded). */
  onBusyChange?: (busy: BusyBlock[]) => void;
};

type Submitted = {
  items: ScheduleRequest["items"];
  busyCount: number;
  asleepCount: number;
  deadline: string;
};

type DeadlinePreset = "tonight" | "tomorrow" | "latest";

function attentionSidebarLabel(item: ActivityFormState): string {
  if (item.delayStart && item.activity.supportsDelayStart) {
    return "Can run overnight";
  }
  if (item.activity.attention === "startEnd") return "Start + finish";
  if (item.activity.attention === "throughout") return "Needed throughout";
  return "At the start";
}

function splitDeadlineLocal(local: string): { date: string; time: string } {
  if (!local.includes("T")) return { date: "", time: "" };
  const [date, time] = local.split("T");
  return { date: date ?? "", time: (time ?? "").slice(0, 5) };
}

function joinDeadlineLocal(date: string, time: string): string {
  if (!date) return "";
  return `${date}T${time || "21:00"}`;
}

function addLocalDays(nowIso: string, days: number): string {
  const parts = splitDeadlineLocal(isoToLocal(nowIso) ?? "");
  if (!parts.date) return "";
  const [y, m, d] = parts.date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const date = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  return joinDeadlineLocal(date, "21:00");
}

function formatPresetSub(local: string): string {
  const iso = localToIso(local);
  if (!iso) return "";
  return formatLocal(iso)
    .replace(/, \d{4}/, "")
    .replace(/:00(?=\s|$)/, "");
}

export default function PlannerForm({ now, forecast, onBusyChange }: Props) {
  const baseId = useId();
  const [state, setState] = useState<PlannerFormState>(() =>
    defaultFormState(now),
  );
  const [attempted, setAttempted] = useState(false);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<DeadlinePreset | null>(null);
  const [calendarFileName, setCalendarFileName] = useState<string | null>(null);

  function publishBusy(blocks: BusyFormBlock[]) {
    onBusyChange?.(busyFormToBlocks(blocks));
  }

  const errors = useMemo(
    () => (attempted ? validatePlanner(state, now) : {}),
    [attempted, state, now],
  );
  const errorCount = Object.keys(errors).length;

  const deadlineId = `${baseId}-deadline`;
  const dateId = `${baseId}-deadline-date`;
  const timeId = `${baseId}-deadline-time`;
  const deadlineError = errors[errorKey.deadline];
  const maxIso = maxDeadlineIso(now);
  const { date: deadlineDate, time: deadlineTime } = splitDeadlineLocal(
    state.deadlineLocal,
  );

  const selected = state.activities.filter((a) => a.selected);
  const asleepCount = state.busy.filter((b) => b.asleep).length;
  const awakeBusy = state.busy.length - asleepCount;
  const deadlineIso = localToIso(state.deadlineLocal);
  const forecastHours =
    deadlineIso && Number.isFinite(Date.parse(deadlineIso))
      ? Math.max(
          0,
          Math.round(
            (Date.parse(deadlineIso) - Date.parse(now)) / (60 * 60 * 1000),
          ),
        )
      : 0;

  const tonightLocal = addLocalDays(now, 0);
  const tomorrowLocal = addLocalDays(now, 1);
  const latestLocal = maxIso ? (isoToLocal(maxIso) ?? "") : "";

  const presets: {
    id: DeadlinePreset;
    label: string;
    local: string;
  }[] = [
    { id: "tonight", label: "Tonight", local: tonightLocal },
    { id: "tomorrow", label: "Tomorrow", local: tomorrowLocal },
    { id: "latest", label: "Latest", local: latestLocal },
  ];

  function updateActivity(id: ActivityId, patch: Partial<ActivityFormState>) {
    setSubmitted(null);
    setState((s) => ({
      ...s,
      activities: s.activities.map((a) =>
        a.activity.id === id ? { ...a, ...patch } : a,
      ),
    }));
  }

  function removeBusy(key: string) {
    setSubmitted(null);
    setState((s) => {
      const busy = s.busy.filter((b) => b.key !== key);
      publishBusy(busy);
      return { ...s, busy };
    });
  }

  function onBusyLoaded(blocks: BusyFormBlock[], fileName: string) {
    setSubmitted(null);
    setCalendarFileName(fileName);
    setState((s) => ({ ...s, busy: blocks }));
    publishBusy(blocks);
  }

  function clearBusy() {
    setSubmitted(null);
    setCalendarFileName(null);
    setState((s) => ({ ...s, busy: [] }));
    publishBusy([]);
  }

  function setDeadlineLocal(deadlineLocal: string, preset: DeadlinePreset | null) {
    setSubmitted(null);
    setActivePreset(preset);
    setState((s) => ({ ...s, deadlineLocal }));
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
      className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:items-start lg:gap-8"
    >
      <h2 id={`${baseId}-heading`} className="sr-only">
        Planner
      </h2>

      <div className="space-y-5">
        <ActivityFields
          baseId={baseId}
          items={state.activities}
          errors={errors}
          onChange={updateActivity}
        />

        <BusyBlockFields
          now={now}
          blocks={state.busy}
          onBusyLoaded={onBusyLoaded}
          onClear={clearBusy}
          onRemove={removeBusy}
        />

        <fieldset className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
          <legend className="float-left w-full">
            <span className="flex items-baseline gap-2">
              <span className="font-mono text-sm font-semibold text-primary">
                03
              </span>
              <span className="text-xl font-semibold tracking-tight text-ink">
                When does it need to be done?
              </span>
            </span>
          </legend>
          <p className="clear-both mt-1 text-sm text-secondary">
            Later deadlines open more clean hours. Up to {MAX_HORIZON_DAYS} days
            out.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {presets.map((p) => {
              const selectedPreset = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={!p.local}
                  onClick={() => setDeadlineLocal(p.local, p.id)}
                  className={`min-h-14 rounded-[var(--radius-button)] border px-2 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    selectedPreset
                      ? "border-ink bg-ink text-white"
                      : "border-border bg-surface text-ink hover:border-primary/40"
                  }`}
                >
                  <span className="block text-sm font-semibold">{p.label}</span>
                  <span
                    className={`mt-0.5 block text-[11px] ${
                      selectedPreset ? "text-white/80" : "text-muted"
                    }`}
                  >
                    {p.local ? formatPresetSub(p.local) : "—"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor={dateId} className="block text-sm font-medium text-ink">
                Date
              </label>
              <input
                id={dateId}
                type="date"
                value={deadlineDate}
                onChange={(e) =>
                  setDeadlineLocal(
                    joinDeadlineLocal(e.target.value, deadlineTime || "21:00"),
                    null,
                  )
                }
                className={`mt-1 ${INPUT_CLASS} ${deadlineError ? INPUT_ERROR : INPUT_OK}`}
              />
            </div>
            <div>
              <label htmlFor={timeId} className="block text-sm font-medium text-ink">
                Time
              </label>
              <input
                id={timeId}
                type="time"
                value={deadlineTime}
                onChange={(e) =>
                  setDeadlineLocal(
                    joinDeadlineLocal(deadlineDate, e.target.value),
                    null,
                  )
                }
                className={`mt-1 ${INPUT_CLASS} ${deadlineError ? INPUT_ERROR : INPUT_OK}`}
              />
            </div>
            <p className={`pb-3 ${HINT_CLASS}`}>Eastern time</p>
          </div>
          <input
            id={deadlineId}
            type="hidden"
            value={state.deadlineLocal}
            readOnly
          />
          {deadlineError && (
            <p id={`${deadlineId}-error`} className={ERROR_CLASS}>
              {deadlineError}
            </p>
          )}
        </fieldset>
      </div>

      <aside className="mt-5 lg:sticky lg:top-6 lg:mt-0">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
          <h3 className="text-lg font-semibold text-ink">Your plan</h3>

          <div className="mt-5 space-y-4 text-sm">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted">
                Running
              </p>
              {selected.length === 0 ? (
                <p className="mt-1 text-secondary">Nothing selected yet</p>
              ) : (
                <ul className="mt-1 space-y-1 text-ink">
                  {selected.map((item) => (
                    <li key={item.activity.id}>
                      <span className="font-medium">
                        {activityDisplayName(item.activity.id)}
                      </span>
                      : {attentionSidebarLabel(item)}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted">
                Busy
              </p>
              <p className="mt-1 text-ink">
                {state.busy.length === 0
                  ? "No calendar uploaded"
                  : `${calendarFileName ?? "Calendar"} · ${awakeBusy} busy block${awakeBusy === 1 ? "" : "s"}${asleepCount > 0 ? " + sleep" : ""}`}
              </p>
            </div>

            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted">
                Done by
              </p>
              <p className="mt-1 font-medium text-ink">
                {deadlineIso ? formatLocal(deadlineIso) : "Set a deadline"}
              </p>
              {forecastHours > 0 ? (
                <p className={`mt-0.5 ${HINT_CLASS}`}>
                  {forecastHours} hours of forecast to search
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6" aria-live="polite">
            {attempted && errorCount > 0 && (
              <p className={`mb-3 ${ERROR_CLASS}`}>
                Please fix{" "}
                {errorCount === 1 ? "the item" : `the ${errorCount} items`}{" "}
                marked above, then try again.
              </p>
            )}
            {failure && <p className={`mb-3 ${ERROR_CLASS}`}>{failure}</p>}
          </div>

          <button type="submit" className={`${PRIMARY_BUTTON} w-full sm:w-full`}>
            Find clean times
          </button>
          <p className={`mt-3 ${HINT_CLASS}`}>
            Results show recommended times on the week calendar. Nothing is
            saved until you choose one.
          </p>

          <div role="status" aria-live="polite">
            {submitted && (
              <div className="mt-4 rounded-[var(--radius-button)] border border-primary bg-primary-tint p-3 text-sm text-callout">
                <p className="font-semibold">Your plan is ready to schedule.</p>
                <p className={`mt-1 ${HINT_CLASS}`}>
                  Request logged to the browser console.
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </form>
  );
}
