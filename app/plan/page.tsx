import type { Metadata } from "next";
import PlanClient from "./PlanClient";

export const metadata: Metadata = { title: "Plan a run · GridCheck" };

export default function PlanPage() {
  return (
    <div className="flex-1 bg-bg">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
        <h1 className="text-h1 font-extrabold tracking-tight text-ink md:text-h1-desktop">
          Plan a run
        </h1>
        <p className="mt-3 max-w-2xl text-body text-secondary md:text-body-desktop">
          Pick what to run, when you&apos;re busy, and a deadline. Then choose a
          recommended window on the week ahead.
        </p>
        <PlanClient />
      </div>
    </div>
  );
}
