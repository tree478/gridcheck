import type { Metadata } from "next";
import PlanWorkspace from "@/components/planner/PlanWorkspace";
import { MOCK_NOW, mockGrid } from "@/lib/mocks/grid";
import { mockScheduleResult } from "@/lib/mocks/schedule";

export const metadata: Metadata = { title: "Plan a run · GridCheck" };

export default function PlanPage() {
  return (
    <div className="flex-1 bg-bg">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
        <h1 className="text-h1 font-extrabold tracking-tight text-ink md:text-h1-desktop">
          Plan a run
        </h1>
        <p className="mt-3 max-w-2xl text-body text-secondary md:text-body-desktop">
          Three quick steps. We&apos;ll find the cleanest times that fit around
          your week.
        </p>
        <PlanWorkspace
          now={MOCK_NOW}
          forecast={mockGrid.forecast}
          forecastMadeAt={mockGrid.forecastMadeAt}
          result={mockScheduleResult}
        />
      </div>
    </div>
  );
}
