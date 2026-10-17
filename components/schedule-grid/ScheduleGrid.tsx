"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import type { BusyBlock, HourIntensity, ScheduleResult } from "@/lib/types";
import GridLegend, { FORECAST_HATCH_CLASS } from "./GridLegend";
import GridOverlays from "./GridOverlays";
import {
  colorForT,
  formatHour,
  formatHourOfDay,
  groupByLocalDay,
  isoToGridPosition,
  makeColorScale,
  rowCount,
  sanitizeHours,
  sourceLabel,
  type GridDay,
  type GridHour,
} from "./gridMath";
import {
  busyAriaLabel,
  desktopVisibleRows,
  drawnOptionsFromResult,
  markerAriaLabel,
  mobileVisibleRows,
  optionAriaLabel,
} from "./overlays";

type Props = {
  /** 168 hourly values from the current hour (GridResponse.forecast). */
  hours: HourIntensity[];
  /** ISO instant treated as "now" for the Now marker and the default mobile day. */
  now: string;
  busy?: BusyBlock[];
  /** Flattened inside from ok results. Omit until a schedule exists. */
  result?: ScheduleResult;
};

type CellRef = { dayIndex: number; row: number };

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:focus-visible:outline-emerald-400";

/** Lookup of each day's hours by whole-hour row. */
function rowsOf(day: GridDay): Map<number, GridHour> {
  const m = new Map<number, GridHour>();
  for (const h of day.hours) m.set(Math.floor(h.position), h);
  return m;
}

export default function ScheduleGrid({ hours, now, busy, result }: Props) {
  const baseId = useId();

  const model = useMemo(() => {
    const { valid, dropped } = sanitizeHours(hours);
    const days = groupByLocalDay(valid);
    const scale = makeColorScale(valid.map((h) => h.gco2PerKwh));
    const nowPos = isoToGridPosition(now, days);
    const nowCell: CellRef | null = nowPos ? { dayIndex: nowPos.dayIndex, row: Math.floor(nowPos.hourPosition) } : null;
    const dayRows = days.map(rowsOf);
    const rows = rowCount(days);
    // Axis label for each row: taken from the first day that has a cell in that row.
    const rowLabels: string[] = [];
    for (let r = 0; r < rows; r++) {
      const found = dayRows.map((m) => m.get(r)).find(Boolean);
      rowLabels.push(found ? formatHourOfDay(found.ms) : "");
    }
    const options = drawnOptionsFromResult(result);
    return { days, dropped, scale, nowCell, dayRows, rows, rowLabels, options };
  }, [hours, now, result]);

  const { days, dropped, scale, nowCell, dayRows, rows, rowLabels, options } = model;
  const busyBlocks = busy ?? [];
  const hasOverlays = busyBlocks.length > 0 || options.length > 0;

  const [selectedDay, setSelectedDay] = useState(() => nowCell?.dayIndex ?? 0);
  const [selected, setSelected] = useState<CellRef | null>(null);

  const safeSelectedDay = Math.min(selectedDay, Math.max(0, days.length - 1));
  const selectedHour = selected ? dayRows[selected.dayIndex]?.get(selected.row) : undefined;

  function onTabKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (safeSelectedDay + 1) % days.length;
    else if (e.key === "ArrowLeft") next = (safeSelectedDay - 1 + days.length) % days.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = days.length - 1;
    if (next === null) return;
    e.preventDefault();
    setSelectedDay(next);
    document.getElementById(`${baseId}-tab-${next}`)?.focus();
  }

  if (days.length === 0) {
    return (
      <section
        aria-labelledby={`${baseId}-heading`}
        className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 id={`${baseId}-heading`} className="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
          7-day grid
        </h2>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          We couldn&apos;t read the 7-day forecast right now, so the grid can&apos;t be shown. Try again in a little
          while.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={`${baseId}-heading`}
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 id={`${baseId}-heading`} className="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
        7-day grid
      </h2>
      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
        Hourly carbon intensity for New England, in gCO₂/kWh. Times are shown in Eastern time.
      </p>

      <div className="mt-4">
        <GridLegend min={scale.min} max={scale.max} overlays={hasOverlays} />
      </div>

      {dropped > 0 && (
        <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
          {dropped} {dropped === 1 ? "hour" : "hours"} couldn&apos;t be read and {dropped === 1 ? "was" : "were"}{" "}
          skipped.
        </p>
      )}

      {/* Mobile day tabs */}
      <div
        role="tablist"
        aria-label="Day"
        onKeyDown={onTabKeyDown}
        className="mt-4 grid grid-cols-4 gap-1 sm:hidden"
      >
        {days.map((day, i) => {
          const active = i === safeSelectedDay;
          const isToday = nowCell?.dayIndex === i;
          return (
            <button
              key={day.dateKey}
              id={`${baseId}-tab-${i}`}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setSelectedDay(i)}
              className={`flex min-h-11 flex-col items-center justify-center rounded-lg border px-2 text-xs leading-tight ${FOCUS_RING} ${
                active
                  ? "border-emerald-700 bg-emerald-700 font-semibold text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-zinc-950"
                  : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <span>{day.weekday}</span>
              <span className="tabular-nums">{day.dayOfMonth}</span>
              {isToday && <span className="text-[10px] uppercase">Today</span>}
            </button>
          );
        })}
      </div>

      {/* Grid: one DOM for both breakpoints. Days are columns, hours are rows. */}
      <div className="mt-3 flex gap-px rounded-lg border border-zinc-200 bg-zinc-200 p-px dark:border-zinc-800 dark:bg-zinc-800">
        {/* Hour axis (desktop only; on mobile each row carries its own label) */}
        <div aria-hidden="true" className="hidden w-12 shrink-0 flex-col gap-px sm:flex">
          <div className="h-10 bg-white dark:bg-zinc-900" />
          {rowLabels.map((label, r) => (
            <div
              key={r}
              className="flex h-7 items-center justify-end bg-white pr-1 text-[11px] tabular-nums text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
            >
              {label}
            </div>
          ))}
        </div>

        {days.map((day, dayIndex) => {
          const byRow = dayRows[dayIndex];
          const isToday = nowCell?.dayIndex === dayIndex;
          const visible = dayIndex === safeSelectedDay;
          return (
            <div
              key={day.dateKey}
              className={`${visible ? "flex" : "hidden sm:flex"} min-w-0 flex-1 flex-col gap-px`}
            >
              <div className="hidden h-10 flex-col items-center justify-center bg-white text-xs leading-tight sm:flex dark:bg-zinc-900">
                <span className="font-semibold">{day.weekday}</span>
                <span className="tabular-nums text-zinc-600 dark:text-zinc-400">
                  {day.dayOfMonth}
                  {isToday && <span className="ml-1 text-[10px] uppercase">Today</span>}
                </span>
              </div>

              <div className="relative flex min-w-0 flex-col gap-px">
              {Array.from({ length: rows }, (_, row) => {
                const cell = byRow.get(row);
                if (!cell) {
                  // Placeholder keeps desktop columns aligned; on mobile a single day needs no blank rows.
                  return <div key={row} aria-hidden="true" className="hidden h-7 bg-white sm:block dark:bg-zinc-900" />;
                }
                const isNow = nowCell?.dayIndex === dayIndex && nowCell.row === row;
                const isSelected = selected?.dayIndex === dayIndex && selected.row === row;
                const isForecast = cell.source === "forecast";
                const value = Math.round(cell.hour.gco2PerKwh);
                const label = `${formatHour(cell.hour.hourStart)}, ${value} gCO₂/kWh, ${sourceLabel(cell.source).toLowerCase()}${isNow ? ", now" : ""}`;
                return (
                  <button
                    key={row}
                    type="button"
                    aria-label={label}
                    aria-pressed={isSelected}
                    onClick={() => setSelected(isSelected ? null : { dayIndex, row })}
                    style={{ backgroundColor: colorForT(scale.t(cell.hour.gco2PerKwh)) }}
                    className={`relative flex h-11 w-full items-center gap-2 px-2 text-left text-xs font-medium text-zinc-950 sm:h-7 sm:justify-center sm:px-0.5 sm:text-center ${FOCUS_RING} ${
                      isNow ? "z-10 border-[3px] border-zinc-950 dark:border-white" : ""
                    } ${isSelected ? "ring-[3px] ring-inset ring-sky-800 dark:ring-sky-300" : ""}`}
                  >
                    {isForecast && (
                      <span aria-hidden="true" className={`pointer-events-none absolute inset-0 ${FORECAST_HATCH_CLASS}`} />
                    )}
                    <span className="relative w-14 shrink-0 tabular-nums sm:hidden">{formatHourOfDay(cell.ms)}</span>
                    <span className="relative tabular-nums sm:text-[11px]">{value}</span>
                    <span className="relative text-[11px] text-zinc-800 sm:hidden">
                      {isForecast ? "forecast" : "measured"}
                    </span>
                    {isNow && (
                      <span className="relative ml-auto rounded bg-zinc-950 px-1 text-[10px] font-bold uppercase text-white sm:ml-1 dark:bg-white dark:text-zinc-950">
                        Now
                      </span>
                    )}
                  </button>
                );
              })}
              {hasOverlays && (
                <>
                  <GridOverlays
                    className="sm:hidden"
                    compact={false}
                    dayIndex={dayIndex}
                    days={days}
                    busy={busyBlocks}
                    options={options}
                    visibleRows={mobileVisibleRows(day)}
                    rowHeightPx={44}
                    now={now}
                  />
                  <GridOverlays
                    className="hidden sm:block"
                    compact
                    dayIndex={dayIndex}
                    days={days}
                    busy={busyBlocks}
                    options={options}
                    visibleRows={desktopVisibleRows(rows)}
                    rowHeightPx={28}
                    now={now}
                  />
                </>
              )}
              </div>
            </div>
          );
        })}
      </div>

      {hasOverlays && (
        <ul className="sr-only">
          {busyBlocks.map((block) => (
            <li key={`${block.start}-${block.end}`}>{busyAriaLabel(block)}</li>
          ))}
          {options.map((drawn) => (
            <li key={`${drawn.activityId}-${drawn.option.start}-${drawn.option.labels.join("-")}`}>
              {optionAriaLabel(drawn)}
            </li>
          ))}
          {options.flatMap((drawn) =>
            drawn.option.attendedMoments.map((moment) => (
              <li key={`${drawn.activityId}-${moment.start}`}>
                {markerAriaLabel(drawn, moment.start)}
              </li>
            )),
          )}
        </ul>
      )}

      {/* Details for the tapped cell */}
      <div
        aria-live="polite"
        className="mt-3 min-h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
      >
        {selectedHour ? (
          <p>
            <time dateTime={selectedHour.hour.hourStart} className="font-semibold">
              {formatHour(selectedHour.hour.hourStart)}
            </time>
            {" · "}
            <span className="font-semibold tabular-nums">{Math.round(selectedHour.hour.gco2PerKwh)}</span> gCO₂/kWh
            {" · "}
            {sourceLabel(selectedHour.source)}
            {nowCell && selected && nowCell.dayIndex === selected.dayIndex && nowCell.row === selected.row && " · Now"}
          </p>
        ) : (
          <p className="text-zinc-600 dark:text-zinc-400">
            Tap any hour to see its time, value, and whether it&apos;s measured or forecast.
          </p>
        )}
      </div>

      <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
        Every number here is a modeled estimate from the average generation mix, not a measured emissions value.
      </p>
    </section>
  );
}
