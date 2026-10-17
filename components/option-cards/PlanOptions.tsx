"use client";

import { useState } from "react";
import type { ActivityId, ScheduleOption, ScheduleResult } from "@/lib/types";
import OptionCards from "./OptionCards";
import {
  DIVERSITY_EXPLANATION,
  activityById,
  chosenRecordPreview,
  hasRecommendedCard,
} from "./optionCardModel";

type Props = {
  result: ScheduleResult;
  forecastMadeAt: string;
};

export default function PlanOptions({ result, forecastMadeAt }: Props) {
  const [chosen, setChosen] = useState<
    Partial<Record<ActivityId, ScheduleOption>>
  >({});

  const showDiversity = result.results.some(
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
      <h2 className="text-h2 font-extrabold tracking-tight text-primary md:text-h2-desktop">
        Your options
      </h2>

      <div className="mt-4 space-y-8">
        {showDiversity ? (
          <p className="text-sm text-secondary">{DIVERSITY_EXPLANATION}</p>
        ) : null}
        {result.results.map((item) => (
          <OptionCards
            key={item.activityId}
            result={item}
            chosen={chosen[item.activityId] ?? null}
            onChoose={(option) => {
              if (item.ok)
                handleChoose(item.activityId, option, item.reference);
            }}
          />
        ))}
      </div>
    </section>
  );
}
