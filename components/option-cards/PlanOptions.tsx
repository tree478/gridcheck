"use client";

import Link from "next/link";
import { useState } from "react";
import { notifyGuestRunsChanged } from "@/components/impact/guestHistory";
import { ERROR_CLASS } from "@/components/planner/plannerStyles";
import { browserStore, createRunHistory } from "@/lib/impact/history";
import type {
  ActivityId,
  PlannedActivity,
  ScheduleOption,
  ScheduleResult,
} from "@/lib/types";
import OptionCards from "./OptionCards";
import {
  DIVERSITY_EXPLANATION,
  buildRunDraft,
  enteredEnergyKwh,
  hasRecommendedCard,
} from "./optionCardModel";

type Status = "loading" | "error" | "idle" | "ready";

type SaveNote = { kind: "ok" } | { kind: "error" };

type Props = {
  status: Status;
  result: ScheduleResult;
  items: PlannedActivity[];
  forecastMadeAt: string;
};

export default function PlanOptions({
  status,
  result,
  items,
  forecastMadeAt,
}: Props) {
  const [chosen, setChosen] = useState<
    Partial<Record<ActivityId, ScheduleOption>>
  >({});
  const [saveNotes, setSaveNotes] = useState<
    Partial<Record<ActivityId, SaveNote>>
  >({});

  const showDiversity =
    status === "ready" &&
    result.results.some(
      (item) =>
        item.ok && !chosen[item.activityId] && hasRecommendedCard(item.options),
    );

  function handleChoose(activityId: ActivityId, option: ScheduleOption) {
    setChosen((prev) => ({ ...prev, [activityId]: option }));

    const activityResult = result.results.find(
      (item) => item.activityId === activityId,
    );
    const kwh = enteredEnergyKwh(items, activityId);
    if (!activityResult?.ok || kwh === undefined) {
      setSaveNotes((prev) => ({ ...prev, [activityId]: { kind: "error" } }));
      return;
    }

    try {
      const draft = buildRunDraft({
        activityId,
        option,
        reference: activityResult.reference,
        kwh,
        forecastMadeAt,
      });
      createRunHistory(browserStore()).save(draft);
      notifyGuestRunsChanged();
      setSaveNotes((prev) => ({ ...prev, [activityId]: { kind: "ok" } }));
    } catch {
      setSaveNotes((prev) => ({ ...prev, [activityId]: { kind: "error" } }));
    }
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
          {result.results.map((item) => {
            const note = saveNotes[item.activityId];
            return (
              <div key={item.activityId} className="min-w-0 space-y-2">
                <OptionCards
                  result={item}
                  chosen={chosen[item.activityId] ?? null}
                  onChoose={(option) => {
                    handleChoose(item.activityId, option);
                  }}
                />
                {note?.kind === "ok" ? (
                  <p role="status" className="text-sm text-secondary">
                    Saved to this device.{" "}
                    <Link
                      href="/impact"
                      className="font-semibold text-primary underline underline-offset-2"
                    >
                      View Impact
                    </Link>
                  </p>
                ) : null}
                {note?.kind === "error" ? (
                  <p role="status" className="text-sm text-secondary">
                    Couldn&apos;t save on this device. Your choice is still marked
                    here.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
