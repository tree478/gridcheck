"use client";

import { useId, useState } from "react";
import {
  ERROR_CLASS,
  FOCUS_RING,
  HINT_CLASS,
} from "@/components/planner/plannerStyles";
import type { ActivityId, ScheduleOption, ScheduleResult } from "@/lib/types";
import OptionCards from "./OptionCards";
import {
  CALENDAR_PLACEHOLDER,
  DIVERSITY_EXPLANATION,
  activityById,
  chosenRecordPreview,
  hasRecommendedCard,
} from "./optionCardModel";

type Preview = "results" | "loading" | "error" | "no-window";
type Status = "loading" | "error" | "ready";

const PREVIEW_OPTIONS: { id: Preview; label: string }[] = [
  { id: "results", label: "Results" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "Error" },
  { id: "no-window", label: "No valid window" },
];

type Props = {
  result: ScheduleResult;
  noWindowResult: ScheduleResult;
  forecastMadeAt: string;
};

export default function PlanOptions({
  result,
  noWindowResult,
  forecastMadeAt,
}: Props) {
  const calendarHintId = useId();
  const [preview, setPreview] = useState<Preview>("results");
  const [chosen, setChosen] = useState<
    Partial<Record<ActivityId, ScheduleOption>>
  >({});

  const status: Status =
    preview === "loading" ? "loading" : preview === "error" ? "error" : "ready";
  const data = preview === "no-window" ? noWindowResult : result;
  const showDiversity =
    status === "ready" &&
    data.results.some(
      (item) =>
        item.ok && !chosen[item.activityId] && hasRecommendedCard(item.options),
    );

  function handleChoose(
    activityId: ActivityId,
    option: ScheduleOption,
    reference: { bestGrams: number; worstGrams: number; soonestGrams: number },
  ) {
    const activity = activityById(activityId);
    const record = chosenRecordPreview({
      activityId,
      option,
      reference,
      kwh: activity?.defaultEnergyKwh ?? 0,
      forecastMadeAt,
      createdAt: new Date().toISOString(),
    });
    console.log(record);
    setChosen((prev) => ({ ...prev, [activityId]: option }));
  }

  return (
    <section className="mt-10 min-w-0 border-t border-border pt-8">
      <h2 className="text-2xl font-semibold tracking-tight text-ink">
        Your options
      </h2>
      <p className={`mt-2 ${HINT_CLASS}`}>
        Times are in America/New_York. Every emissions figure is a modeled
        estimate.
      </p>
      <p id={calendarHintId} className={`mt-1 ${HINT_CLASS}`}>
        {CALENDAR_PLACEHOLDER}
      </p>

      {status === "loading" ? (
        <p role="status" aria-live="polite" className="mt-4 text-secondary">
          Finding clean times…
        </p>
      ) : null}

      {status === "error" ? (
        <p role="alert" className={ERROR_CLASS}>
          We couldn&apos;t build options. Try again.
        </p>
      ) : null}

      {status === "ready" ? (
        <div className="mt-4 space-y-8">
          {showDiversity ? (
            <p className="text-sm text-secondary">{DIVERSITY_EXPLANATION}</p>
          ) : null}
          {data.results.map((item) => (
            <OptionCards
              key={item.activityId}
              result={item}
              chosen={chosen[item.activityId] ?? null}
              calendarHintId={calendarHintId}
              onChoose={(option) => {
                if (item.ok)
                  handleChoose(item.activityId, option, item.reference);
              }}
            />
          ))}
        </div>
      ) : null}

      <fieldset className={`mt-8 border-0 p-0 ${HINT_CLASS}`}>
        <legend className="text-xs text-muted">Preview states</legend>
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
                    ? "font-semibold text-secondary underline decoration-border underline-offset-4"
                    : "text-muted"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    </section>
  );
}
