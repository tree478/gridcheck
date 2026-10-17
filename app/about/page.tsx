import type { Metadata } from "next";

export const metadata: Metadata = { title: "About · GridCheck" };

export default function AboutPage() {
  return (
    <div className="flex-1 bg-bg">
      <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        <h1 className="text-h1 font-extrabold tracking-tight text-ink md:text-h1-desktop">
          About GridCheck
        </h1>
        <p className="mt-3 text-body text-secondary md:text-body-desktop">
          How we forecast the grid, what the numbers mean, and why Recommended
          isn&apos;t always Greenest.
        </p>

        <section className="mt-10">
          <h2 className="text-h2 font-extrabold text-ink md:text-h2-desktop">
            How the forecast works
          </h2>
          <p className="mt-2 text-body leading-relaxed text-secondary md:text-body-desktop">
            We pull New England&apos;s hourly generation mix from the U.S.
            Energy Information Administration (EIA) and convert it into an
            estimated carbon intensity in gCO₂/kWh. Past hours are measured
            values. Each future hour is forecast as the average of the same
            weekday and hour over the last 4 weeks of EIA data for New England,
            so Tuesday 6 PM next week looks like recent Tuesdays at 6 PM.
            Forecast hours are marked as forecasts wherever they appear.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-h2 font-extrabold text-ink md:text-h2-desktop">
            What the numbers mean
          </h2>
          <p className="mt-2 text-body leading-relaxed text-secondary md:text-body-desktop">
            These are modeled comparisons based on the average generation mix,
            not verified avoided emissions, which would require
            marginal-emissions data.
          </p>
          <p className="mt-2 text-body leading-relaxed text-secondary md:text-body-desktop">
            Per-load savings are small. Shifting a single laundry or dishwasher
            load makes only a modest difference; EV charging matters most
            because it uses far more energy per session. Every number in
            GridCheck is labeled as a modeled estimate.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-h2 font-extrabold text-ink md:text-h2-desktop">
            Why Recommended may differ from Greenest
          </h2>
          <p className="mt-2 text-body leading-relaxed text-secondary md:text-body-desktop">
            Several times are often nearly as clean as the single greenest hour.
            If everyone picked that one hour, we would create a new demand peak.
            So GridCheck spreads users across the near-equal times: Greenest is
            the absolute lowest-emission window, and Recommended is a stable
            pick among the windows within a small margin of it.
          </p>
        </section>
      </article>
    </div>
  );
}
