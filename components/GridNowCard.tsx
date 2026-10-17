import { TIMEZONE } from "@/lib/constants";
import type { GridResponse } from "@/lib/types";

type Props = { grid: GridResponse };

const hourFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  timeZoneName: "short",
});

export default function GridNowCard({ grid }: Props) {
  // Only hourStart and gco2PerKwh are read here; the tier/isForecast field is changing in T-K1.
  const latest = grid.recent.at(-1);

  return (
    <section
      aria-labelledby="grid-now-heading"
      className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 id="grid-now-heading" className="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
        Grid right now
      </h2>
      {latest ? (
        <>
          <p className="mt-2 text-4xl font-bold tabular-nums">
            {Math.round(latest.gco2PerKwh)}{" "}
            <span className="text-base font-medium text-zinc-600 dark:text-zinc-400">gCO₂/kWh</span>
          </p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            New England (ISO-NE) · hour starting{" "}
            <time dateTime={latest.hourStart}>{hourFormat.format(new Date(latest.hourStart))}</time>
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          No recent grid data is available right now. Try again in a little while.
        </p>
      )}
      <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
        Modeled estimate from the average generation mix, not a measured emissions value.
      </p>
    </section>
  );
}
