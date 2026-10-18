import type { Metadata } from "next";
import Link from "next/link";
import PlanWorkspace from "@/components/plan/PlanWorkspace";

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
        <PlanWorkspace />
        <div className="mt-10 flex justify-end">
          <Link
            href="/impact"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-primary px-6 text-btn font-bold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            View your impact →
          </Link>
        </div>
      </div>
    </div>
  );
}
