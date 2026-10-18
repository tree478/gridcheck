"use client";

import { useId, useState } from "react";
import {
  ERROR_CLASS,
  HINT_CLASS,
} from "@/components/planner/plannerStyles";
import type { ActivityId, ScheduleOption, ScheduleResult } from "@/lib/types";
import OptionCards from "./OptionCards";
import {
  CALENDAR_PLACEHOLDER,
  DIVERSITY_EXPLANATION,
  hasRecommendedCard,
} from "./optionCardModel";

type Status = "loading" | "error" | "idle" | "ready";

type Props = {
  status: Status;
  result: ScheduleResult;
  forecastMadeAt: string;
};

export default function PlanOptions({ status, result }: Props) {
  const calendarHintId = useId();
  const [chosen, setChosen] = useState<
    Partial<Record<ActivityId, ScheduleOption>>
  >({});

  const showDiversity =
    status === "ready" &&
    result.results.some(
      (item) =>
        item.ok && !chosen[item.activityId] && hasRecommendedCard(item.options),
    );

  function handleChoose(activityId: ActivityId, option: ScheduleOption) {
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
          {result.results.map((item) => (
            <OptionCards
              key={item.activityId}
              result={item}
              chosen={chosen[item.activityId] ?? null}
              calendarHintId={calendarHintId}
              onChoose={(option) => {
                handleChoose(item.activityId, option);
              }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
