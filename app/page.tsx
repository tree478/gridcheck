import type { Metadata } from "next";
import Link from "next/link";
import GridNowCard from "@/components/GridNowCard";
import { mockGrid } from "@/lib/mocks/grid";

export const metadata: Metadata = {
  title: "GridCheck",
  description:
    "Find the cleanest, most convenient time to run your appliances on New England's grid.",
};

const STEPS = [
  {
    n: "01",
    title: "Pick",
    body: "Choose a chore: doing laundry, running the dishwasher, charging your devices, and more.",
  },
  {
    n: "02",
    title: "Add",
    body: "Create your schedule by adding event blocks for classes, extracurriculars, and other activities.",
  },
  {
    n: "03",
    title: "Live",
    body: "Compare schedule options and their emissions. Pick your favorite.",
  },
] as const;

export default function Home() {
  return (
    <div className="flex-1 bg-bg">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
        <section className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-12">
          <div className="min-w-0">
            <p className="font-mono text-mono-label font-semibold uppercase tracking-[0.12em] text-muted md:text-mono-label-desktop">
              ISO New England · Boston
            </p>
            <h1 className="mt-4 text-h1 font-extrabold tracking-tight text-primary md:text-h1-desktop">
              Do your chores when the grid is cleanest.
            </h1>
            <p className="mt-4 max-w-xl text-body leading-relaxed text-secondary md:text-body-desktop">
              GridCheck reads New England&apos;s hourly grid forecast and your
              schedule, then picks the cleanest time to run the laundry, the
              dishwasher, and more.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                href="/plan"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-primary px-6 text-btn font-bold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Plan a run →
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex min-h-11 items-center text-body font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:text-body-desktop"
              >
                How it works
              </a>
              <Link
                href="/campus"
                className="inline-flex min-h-11 items-center text-body font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:text-body-desktop"
              >
                The invisible campus
              </Link>
            </div>
          </div>

          <div className="min-w-0">
            <GridNowCard grid={mockGrid} />
          </div>
        </section>

        <section
          id="how-it-works"
          className="mt-16 scroll-mt-8 sm:mt-20"
          aria-labelledby="how-it-works-heading"
        >
          <h2
            id="how-it-works-heading"
            className="text-h2 font-extrabold tracking-tight text-ink md:text-h2-desktop"
          >
            How it works
          </h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((step) => (
              <li key={step.n} className="min-w-0">
                <div className="border-t border-border pt-4">
                  <p className="font-mono text-mono-label font-semibold text-primary md:text-mono-label-desktop">
                    {step.n}
                  </p>
                  <h3 className="mt-2 text-h3 font-bold text-ink md:text-h3-desktop">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-body leading-relaxed text-secondary md:text-body-desktop">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-16 border-t border-border pt-6 text-caption text-muted md:text-caption-desktop">
          <p>Built at HackHarvard 2026</p>
        </footer>
      </div>
    </div>
  );
}
