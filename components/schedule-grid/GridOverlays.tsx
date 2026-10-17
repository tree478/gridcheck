import type { BusyBlock } from "@/lib/types";
import type { GridDay } from "./gridMath";
import {
  busyCanvasLabel,
  laneForOption,
  optionDisplayLabel,
  optionTone,
  segmentStyle,
  segmentsForRange,
  type DrawnOption,
} from "./overlays";

const GAP_PX = 1;

/** Recommended = orange · Greenest = teal · Soonest = gray */
const TONE_CLASS = {
  recommended: "border-scale-dirty bg-scale-dirty text-white",
  greenest: "border-primary bg-primary text-white",
  soonest: "border-[#7a827c] bg-[#8b928c] text-white",
} as const;

type Props = {
  className?: string;
  compact?: boolean;
  dayIndex: number;
  days: GridDay[];
  busy: BusyBlock[];
  options: DrawnOption[];
  visibleRows: number[];
  rowHeightPx: number;
};

export default function GridOverlays({
  className = "",
  dayIndex,
  days,
  busy,
  options,
  visibleRows,
  rowHeightPx,
}: Props) {
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
                className={`absolute inset-x-0 overflow-hidden rounded-sm px-0.5 text-[10px] font-semibold leading-tight ${
                  sleep ? "bg-sleep text-ink" : "bg-busy text-ink"
                }`}
                style={{ top: box.topPx, height: box.heightPx, zIndex: 1 }}
              >
                {box.heightPx >= 14 && (
                  <span className="line-clamp-2">{label}</span>
                )}
              </div>
            );
          }),
      )}

      {options.map((drawn) => {
        const { lane, laneCount } = laneForOption(
          drawn,
          options,
          dayIndex,
          days,
        );
        const widthPct = 100 / laneCount;
        const leftPct = lane * widthPct;
        const tone = optionTone(drawn.option.labels);
        const text = `${drawn.name} · ${optionDisplayLabel(drawn.option.labels)}`;
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
    </div>
  );
}
