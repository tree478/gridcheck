/**
 * Illustrative overnight intensity bars for the About page.
 * Heights are relative (shorter = cleaner); not live EIA data.
 */
const HOURS = [
  { label: "10p", height: 92, tone: "dirty" as const },
  { label: "11p", height: 78, tone: "mid" as const },
  { label: "12a", height: 58, tone: "mid" as const },
  { label: "1a", height: 36, tone: "tie" as const },
  { label: "2a", height: 32, tone: "tie" as const },
  { label: "3a", height: 40, tone: "tie" as const },
  { label: "4a", height: 48, tone: "mid" as const },
  { label: "5a", height: 62, tone: "mid" as const },
];

const TONE_CLASS = {
  dirty: "bg-scale-dirty",
  mid: "bg-chip",
  tie: "border-2 border-ink bg-primary/80",
} as const;

export default function OvernightIntensityChart() {
  return (
    <figure className="min-w-0">
      <p className="text-sm font-semibold text-ink">
        Overnight intensity, one example night{" "}
        <span className="font-normal text-muted">(shorter is cleaner)</span>
      </p>

      <div className="relative mt-6">
        {/* Bracket over near-tie hours (1a–3a = indices 3–5) */}
        <div
          className="pointer-events-none absolute top-0 z-10 hidden sm:block"
          style={{ left: "37.5%", width: "37.5%" }}
          aria-hidden
        >
          <div className="mx-1 border-t-2 border-x-2 border-ink pt-1">
            <p className="px-1 text-center font-mono text-[10px] font-semibold uppercase tracking-wide text-ink">
              Recommended &amp; Greenest
            </p>
          </div>
        </div>

        <div
          className="flex h-40 items-end justify-between gap-1.5 pt-8 sm:gap-2 sm:pt-10"
          role="img"
          aria-label="Example overnight carbon intensity: 10 PM is dirtiest; 1 AM through 3 AM are within the near-tie margin and are the recommended and greenest windows."
        >
          {HOURS.map((h) => (
            <div
              key={h.label}
              className="flex min-w-0 flex-1 flex-col items-center gap-2"
            >
              <div
                className={`w-full max-w-[2.25rem] rounded-t-sm ${TONE_CLASS[h.tone]}`}
                style={{ height: `${h.height}%` }}
              />
              <span className="font-mono text-[10px] text-muted sm:text-xs">
                {h.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <figcaption className="mt-4 flex items-center gap-2 text-caption text-muted md:text-caption-desktop">
        <span
          className="inline-block size-3 shrink-0 rounded-sm border-2 border-ink bg-primary/80"
          aria-hidden
        />
        Within the near-tie margin
      </figcaption>
    </figure>
  );
}
