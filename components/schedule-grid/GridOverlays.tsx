import type { BusyBlock } from "@/lib/types";
import { isoToGridPosition, type GridDay } from "./gridMath";
import {
  busyCanvasLabel,
  laneForOption,
  markerKind,
  optionDisplayLabel,
  optionTone,
  segmentStyle,
  segmentsForRange,
  type DrawnOption,
} from "./overlays";

const GAP_PX = 1;

const TONE_CLASS = {
  recommended:
    "border-emerald-800 bg-emerald-700/90 text-white dark:border-emerald-300 dark:bg-emerald-600/90",
  greenest: "border-teal-800 bg-teal-700/90 text-white dark:border-teal-300 dark:bg-teal-600/90",
  soonest: "border-sky-800 bg-sky-700/90 text-white dark:border-sky-300 dark:bg-sky-600/90",
};

type Props = {
  className?: string;
  compact: boolean;
  dayIndex: number;
  days: GridDay[];
  busy: BusyBlock[];
  options: DrawnOption[];
  visibleRows: number[];
  rowHeightPx: number;
  now: string;
};

export default function GridOverlays({
  className = "",
  compact,
  dayIndex,
  days,
  busy,
  options,
  visibleRows,
  rowHeightPx,
  now,
}: Props) {
  const nowBox = nowHourBox(now, days, dayIndex, visibleRows, rowHeightPx);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-[20] overflow-visible ${className}`}
    >
      {busy.map((block) =>
        segmentsForRange(block.start, block.end, days)
          .filter((seg) => seg.dayIndex === dayIndex)
          .map((seg) => {
            const box = segmentStyle(seg, visibleRows, rowHeightPx, GAP_PX);
            if (!box) return null;
            const sleep = block.asleep;
            const label = busyCanvasLabel(block);
            return (
              <div
                key={`${block.start}-${block.end}-${seg.startHour}`}
                title={label}
                className={`absolute inset-x-0 overflow-hidden px-0.5 text-[10px] font-semibold leading-tight ${
                  sleep
                    ? "bg-indigo-900/45 text-indigo-50 dark:bg-indigo-800/50 dark:text-indigo-100"
                    : "bg-zinc-800/35 text-zinc-950 dark:bg-zinc-500/40 dark:text-zinc-50"
                }`}
                style={{ top: box.topPx, height: box.heightPx, zIndex: 1 }}
              >
                <span
                  className={`pointer-events-none absolute inset-0 ${
                    sleep
                      ? "bg-[radial-gradient(circle,rgba(255,255,255,0.45)_1px,transparent_1.4px)] bg-size-[4px_4px]"
                      : "bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.35)_0_2px,transparent_2px_6px)]"
                  }`}
                />
                {box.heightPx >= 14 && (
                  <span className="relative line-clamp-2">{label}</span>
                )}
              </div>
            );
          }),
      )}

      {options.map((drawn) => {
        const { lane, laneCount } = laneForOption(drawn, options, dayIndex, days);
        const widthPct = 100 / laneCount;
        const leftPct = lane * widthPct;
        const tone = optionTone(drawn.option.labels);
        const text = `${drawn.name} · ${optionDisplayLabel(drawn.option.labels, compact)}`;
        return segmentsForRange(drawn.option.start, drawn.option.end, days)
          .filter((seg) => seg.dayIndex === dayIndex)
          .map((seg) => {
            const box = segmentStyle(seg, visibleRows, rowHeightPx, GAP_PX);
            if (!box) return null;
            return (
              <div
                key={`${drawn.activityId}-${drawn.option.start}-${seg.startHour}`}
                title={text}
                className={`absolute overflow-hidden rounded-sm border px-0.5 text-[10px] font-semibold leading-tight ${TONE_CLASS[tone]}`}
                style={{
                  top: box.topPx,
                  height: box.heightPx,
                  left: `calc(${leftPct}% + 1px)`,
                  width: `calc(${widthPct}% - 2px)`,
                  zIndex: 2,
                }}
              >
                <span className="line-clamp-3">{text}</span>
              </div>
            );
          });
      })}

      {options.map((drawn) =>
        drawn.option.attendedMoments.flatMap((moment) => {
          const kind = markerKind(drawn, moment.start);
          const { lane, laneCount } = laneForOption(drawn, options, dayIndex, days);
          const widthPct = 100 / laneCount;
          const leftPct = lane * widthPct;
          return segmentsForRange(moment.start, moment.end, days)
            .filter((seg) => seg.dayIndex === dayIndex)
            .map((seg) => {
              const box = segmentStyle(seg, visibleRows, rowHeightPx, GAP_PX);
              if (!box) return null;
              return (
                <div
                  key={`${drawn.activityId}-${moment.start}-${seg.startHour}`}
                  title={kind === "load" ? `Load ${drawn.name}` : `You needed · ${drawn.name}`}
                  className="absolute"
                  style={{
                    top: box.topPx,
                    left: `calc(${leftPct}% + 1px)`,
                    width: `calc(${widthPct}% - 2px)`,
                    zIndex: 3,
                  }}
                >
                  <span className="inline-flex items-center gap-0.5 rounded bg-zinc-950 px-1 py-0.5 text-[10px] font-bold uppercase leading-none text-white dark:bg-white dark:text-zinc-950">
                    <MarkerIcon />
                    {kind === "load" ? "Load" : "You"}
                  </span>
                </div>
              );
            });
        }),
      )}

      {nowBox && (
        <div
          className="absolute inset-x-0 box-border border-[3px] border-zinc-950 dark:border-white"
          style={{ top: nowBox.topPx, height: nowBox.heightPx, zIndex: 4 }}
        />
      )}
    </div>
  );
}

function nowHourBox(
  now: string,
  days: GridDay[],
  dayIndex: number,
  visibleRows: number[],
  rowHeightPx: number,
) {
  const pos = isoToGridPosition(now, days);
  if (!pos || pos.dayIndex !== dayIndex) return null;
  const row = Math.floor(pos.hourPosition);
  return segmentStyle(
    { dayIndex, startHour: row, endHour: row + 1 },
    visibleRows,
    rowHeightPx,
    GAP_PX,
  );
}

function MarkerIcon() {
  return (
    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" className="shrink-0">
      <circle cx="6" cy="3.2" r="2" fill="currentColor" />
      <path d="M2.2 10.5c.4-2.4 1.8-3.6 3.8-3.6s3.4 1.2 3.8 3.6" fill="currentColor" />
    </svg>
  );
}
