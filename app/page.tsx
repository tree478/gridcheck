import Link from "next/link";
import GridNowCard from "@/components/GridNowCard";
import { mockGrid } from "@/lib/mocks/grid";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <div className="grid gap-8 md:grid-cols-[3fr_2fr] md:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Run your appliances when New England&apos;s grid is cleanest.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">
            GridWait finds the cleanest and most convenient time to run your washer, dryer, dishwasher,
            or EV charger. Our goal: make sustainable energy use effortless by fitting electricity use
            around people&apos;s lives, rather than making people rearrange their lives around
            sustainability.
          </p>
          <Link
            href="/plan"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-700 px-6 text-base font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            Plan a run
          </Link>
        </div>
        <GridNowCard grid={mockGrid} />
      </div>
    </div>
  );
}
