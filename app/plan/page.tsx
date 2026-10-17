import type { Metadata } from "next";
import ScheduleGrid from "@/components/schedule-grid/ScheduleGrid";
import { MOCK_NOW, mockGrid } from "@/lib/mocks/grid";

export const metadata: Metadata = { title: "Plan a run · GridWait" };

export default function PlanPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight">Plan a run</h1>
      <p className="mt-4 text-zinc-700 dark:text-zinc-300">
        The planner form and recommended run times will appear here. Below is the week ahead on the grid.
      </p>
      <div className="mt-6">
        <ScheduleGrid hours={mockGrid.forecast} now={MOCK_NOW} />
      </div>
    </div>
  );
}
