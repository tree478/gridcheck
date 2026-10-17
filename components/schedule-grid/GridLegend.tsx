import { colorForT } from "./gridMath";

type Props = { min: number; max: number };

/** Diagonal hatching marks forecast hours without relying on color. Shared with ScheduleGrid. */
export const FORECAST_HATCH_CLASS =
  "bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.55)_0_3px,transparent_3px_8px)]";

export default function GridLegend({ min, max }: Props) {
  return (
    <div className="text-xs text-zinc-700 dark:text-zinc-300">
      <div className="flex items-center gap-2">
        <span className="shrink-0 tabular-nums">
          Cleaner · <strong className="font-semibold">{Math.round(min)}</strong>
        </span>
        <div
          aria-hidden="true"
          className="h-3 min-w-0 flex-1 rounded-full"
          style={{
            backgroundImage: `linear-gradient(to right, ${colorForT(0)}, ${colorForT(0.5)}, ${colorForT(1)})`,
          }}
        />
        <span className="shrink-0 tabular-nums">
          <strong className="font-semibold">{Math.round(max)}</strong> · Dirtier
        </span>
      </div>
      <p className="mt-1 text-zinc-600 dark:text-zinc-400">
        Color scale runs from the lowest to the highest value in this 7-day forecast, in gCO₂/kWh.
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`inline-block h-4 w-6 rounded border border-zinc-400 ${FORECAST_HATCH_CLASS}`}
            style={{ backgroundColor: colorForT(0.5) }}
          />
          Hatched = forecast (weekly pattern)
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-4 w-6 rounded border border-zinc-400"
            style={{ backgroundColor: colorForT(0.5) }}
          />
          Solid = measured
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-4 w-6 rounded border-2 border-zinc-950 dark:border-white"
          />
          Thick outline = now
        </li>
      </ul>
    </div>
  );
}
