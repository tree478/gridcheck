"use client";

import { useState } from "react";
import { ERROR_CLASS } from "@/components/planner/plannerStyles";
import type { ActivityId, ScheduleOption, ScheduleResult } from "@/lib/types";
import OptionCards from "./OptionCards";
import {
  DIVERSITY_EXPLANATION,
  hasRecommendedCard,
} from "./optionCardModel";

type Status = "loading" | "error" | "idle" | "ready";

type Props = {
  status: Status;
  result: ScheduleResult;
  forecastMadeAt: string;
};

export default function PlanOptions({ status, result, forecastMadeAt }: Props) {
  void forecastMadeAt;
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
      <h2 className="sr-only">Your options</h2>

      {status === "loading" ? (
        <p role="status" aria-live="polite" className="text-secondary">
          Finding clean times…
        </p>
      ) : null}

      {status === "error" ? (
        <p role="alert" className={ERROR_CLASS}>
          We couldn&apos;t build options. Try again.
        </p>
      ) : null}

      {status === "ready" ? (
        <div className="space-y-8">
          {showDiversity ? (
            <p className="text-sm text-secondary">{DIVERSITY_EXPLANATION}</p>
          ) : null}
          {result.results.map((item) => (
            <OptionCards
              key={item.activityId}
              result={item}
              chosen={chosen[item.activityId] ?? null}
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
