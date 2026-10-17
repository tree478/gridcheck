import type { Metadata } from "next";
import PlannerForm from "@/components/planner/PlannerForm";
import ScheduleGrid from "@/components/schedule-grid/ScheduleGrid";
import { mockBusy } from "@/lib/mocks/busy";
import { MOCK_NOW, mockGrid } from "@/lib/mocks/grid";
import { mockScheduleResult } from "@/lib/mocks/schedule";

export const metadata: Metadata = { title: "Plan a run · GridWait" };

export default function PlanPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight">Plan a run</h1>
      <p className="mt-4 text-zinc-700 dark:text-zinc-300">
        Tell us what you need to run, when you&apos;re busy, and your deadline. Below the form is the week ahead on
        the grid, with busy times and labeled run windows (Recommended, Greenest, Soonest).
      </p>
      <div className="mt-6">
        <PlannerForm now={MOCK_NOW} forecast={mockGrid.forecast} />
      </div>
      <div className="mt-6">
        <ScheduleGrid hours={mockGrid.forecast} now={MOCK_NOW} busy={mockBusy} result={mockScheduleResult} />
      </div>
    </div>
  );
}
