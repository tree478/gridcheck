"use client";

import { useState } from "react";
import PlanOptions from "@/components/option-cards/PlanOptions";
import ScheduleGrid from "@/components/schedule-grid/ScheduleGrid";
import type { BusyBlock, HourIntensity, ScheduleResult } from "@/lib/types";
import PlannerForm from "./PlannerForm";

type Props = {
  now: string;
  forecast: HourIntensity[];
  forecastMadeAt: string;
  result: ScheduleResult;
};

/** Plan page body: busy + option blocks stay empty until a .ics is uploaded. */
export default function PlanWorkspace({
  now,
  forecast,
  forecastMadeAt,
  result,
}: Props) {
  const [busy, setBusy] = useState<BusyBlock[]>([]);
  const hasCalendar = busy.length > 0;

  return (
    <>
      <div className="mt-8">
        <PlannerForm now={now} forecast={forecast} onBusyChange={setBusy} />
      </div>
      <div className="mt-10">
        <ScheduleGrid
          hours={forecast}
          now={now}
          busy={busy}
          result={hasCalendar ? result : undefined}
        />
      </div>
      {hasCalendar ? (
        <PlanOptions result={result} forecastMadeAt={forecastMadeAt} />
      ) : null}
    </>
  );
}
