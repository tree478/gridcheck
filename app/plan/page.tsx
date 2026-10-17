import type { Metadata } from "next";

export const metadata: Metadata = { title: "Plan a run · GridWait" };

export default function PlanPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight">Plan a run</h1>
      <p className="mt-4 text-zinc-700 dark:text-zinc-300">
        The planner form, 7-day grid, and recommended run times will appear here.
      </p>
    </div>
  );
}
