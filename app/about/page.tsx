import type { Metadata } from "next";

export const metadata: Metadata = { title: "About · GridWait" };

export default function AboutPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight">About GridWait</h1>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">How the forecast works</h2>
        <p className="mt-2 leading-relaxed text-zinc-700 dark:text-zinc-300">
          We pull New England&apos;s hourly generation mix from the U.S. Energy Information Administration
          (EIA) and convert it into an estimated carbon intensity in gCO₂/kWh. Past hours are measured
          values. Each future hour is forecast as the average of the same weekday and hour over the last
          4 weeks of EIA data for New England, so Tuesday 6 PM next week looks like recent Tuesdays at 6
          PM. Forecast hours are marked as forecasts wherever they appear.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">What the numbers mean</h2>
        <p className="mt-2 leading-relaxed text-zinc-700 dark:text-zinc-300">
          These are modeled comparisons based on the average generation mix, not verified avoided
          emissions, which would require marginal-emissions data.
        </p>
        <p className="mt-2 leading-relaxed text-zinc-700 dark:text-zinc-300">
          Per-load savings are small. Shifting a single laundry or dishwasher load makes only a modest
          difference; EV charging matters most because it uses far more energy per session. Every number
          in GridWait is labeled as a modeled estimate.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Why Recommended may differ from Greenest</h2>
        <p className="mt-2 leading-relaxed text-zinc-700 dark:text-zinc-300">
          Several times are often nearly as clean as the single greenest hour. If everyone picked that
          one hour, we would create a new demand peak. So GridWait spreads users across the near-equal
          times: Greenest is the absolute lowest-emission window, and Recommended is a stable pick among
          the windows within a small margin of it.
        </p>
      </section>
    </article>
  );
}
