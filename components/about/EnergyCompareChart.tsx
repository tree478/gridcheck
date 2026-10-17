import { ACTIVITY_CATALOG } from "@/lib/constants";

const CHART_IDS = ["washer", "dishwasher", "dryer", "ev"] as const;

const TINTS = [
  "bg-primary/35",
  "bg-primary/50",
  "bg-primary/70",
  "bg-primary",
] as const;

/** Horizontal bars of typical energy per run from the activity catalog. */
export default function EnergyCompareChart() {
  const rows = CHART_IDS.map((id, i) => {
    const activity = ACTIVITY_CATALOG.find((a) => a.id === id);
    if (!activity) return null;
    return {
      id,
      label: id === "ev" ? "EV charge" : activity.name,
      kwh: activity.defaultEnergyKwh,
      tint: TINTS[i] ?? "bg-primary",
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  const max = Math.max(...rows.map((r) => r.kwh), 1);

  return (
    <figure className="mt-5">
      <ul className="space-y-3" aria-label="Typical energy per run">
        {rows.map((row) => (
          <li key={row.id} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2 sm:grid-cols-[6.5rem_1fr_auto] sm:gap-3">
            <span className="text-sm font-medium text-ink">{row.label}</span>
            <div className="h-3 overflow-hidden rounded-sm bg-chip">
              <div
                className={`h-full rounded-sm ${row.tint}`}
                style={{ width: `${(row.kwh / max) * 100}%` }}
                role="presentation"
              />
            </div>
            <span className="min-w-[4.5rem] text-right font-mono text-xs tabular-nums text-muted">
              {row.kwh} kWh
            </span>
          </li>
        ))}
      </ul>
      <figcaption className="mt-4 text-caption text-muted md:text-caption-desktop">
        Typical energy per run. Every number in GridCheck is labeled as a modeled
        estimate.
      </figcaption>
    </figure>
  );
}
