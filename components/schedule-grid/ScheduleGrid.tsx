"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import type { BusyBlock, HourIntensity, ScheduleResult } from "@/lib/types";
import GridLegend from "./GridLegend";
import GridOverlays from "./GridOverlays";
import {
  formatHourOfDay,
  groupByLocalDay,
  isoToGridPosition,
  rowCount,
  sanitizeHours,
  type GridDay,
  type GridHour,
} from "./gridMath";
import {
  awakeBusyBlocks,
  awakeWindowFromBusy,
  busyAriaLabel,
  drawnOptionsFromResult,
  optionAriaLabel,
  optionTone,
  rowsInAwakeWindow,
} from "./overlays";

type Props = {
  /** 168 hourly values from the current hour (GridResponse.forecast). */
  hours: HourIntensity[];
  /** ISO instant treated as "now" for the default mobile day. */
  now: string;
  busy?: BusyBlock[];
  /** Flattened inside from ok results. Omit until a schedule exists. */
  result?: ScheduleResult;
};

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

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
    const nowPos = isoToGridPosition(now, days);
    const nowDayIndex = nowPos?.dayIndex ?? 0;
    const dayRows = days.map(rowsOf);
    const rows = rowCount(days);
    const busyBlocks = busy ?? [];
    const awake = awakeWindowFromBusy(busyBlocks);
    const visibleRows = awake
      ? rowsInAwakeWindow(awake.startHour, awake.endHour, rows)
      : Array.from({ length: rows }, (_, i) => i);
    const rowLabels = visibleRows.map((row) => {
      const found = dayRows.map((m) => m.get(row)).find(Boolean);
      return found ? formatHourOfDay(found.ms) : "";
    });
    const options = drawnOptionsFromResult(result, awake, days);
    const eventBlocks = awakeBusyBlocks(busyBlocks);
    return {
      days,
      dropped,
      nowDayIndex,
      dayRows,
      visibleRows,
      rowLabels,
      options,
      eventBlocks,
    };
  }, [hours, now, busy, result]);

  const {
    days,
    dropped,
    nowDayIndex,
    dayRows,
    visibleRows,
    rowLabels,
    options,
    eventBlocks,
  } = model;
  const hasOverlays = eventBlocks.length > 0 || options.length > 0;
  const showGreenest = options.some(
    (drawn) => optionTone(drawn.option.labels) === "greenest",
  );

  const [selectedDay, setSelectedDay] = useState(() => nowDayIndex);

  const safeSelectedDay = Math.min(selectedDay, Math.max(0, days.length - 1));

  function onTabKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (safeSelectedDay + 1) % days.length;
    else if (e.key === "ArrowLeft")
      next = (safeSelectedDay - 1 + days.length) % days.length;
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
        className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-sm"
      >
        <h2
          id={`${baseId}-heading`}
          className="text-sm font-semibold uppercase tracking-wide text-muted"
        >
          Your week
        </h2>
        <p className="mt-2 text-sm text-secondary">
          We couldn&apos;t read the week ahead right now, so the calendar
          can&apos;t be shown. Try again in a little while.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={`${baseId}-heading`}
      className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm sm:p-5"
    >
      <h2
        id={`${baseId}-heading`}
        className="text-sm font-semibold uppercase tracking-wide text-muted"
      >
        Your week
      </h2>
      <p className="mt-1 text-sm text-secondary">
        Your events and recommended run windows while you&apos;re awake. Times
        are Eastern.
      </p>

      {hasOverlays && (
        <div className="mt-4">
          <GridLegend overlays showGreenest={showGreenest} />
        </div>
      )}

      {dropped > 0 && (
        <p className="mt-3 text-xs text-muted">
          {dropped} {dropped === 1 ? "hour" : "hours"} couldn&apos;t be read and{" "}
          {dropped === 1 ? "was" : "were"} skipped.
        </p>
      )}

      <div
        role="tablist"
        aria-label="Day"
        onKeyDown={onTabKeyDown}
        className="mt-4 grid grid-cols-4 gap-1 sm:hidden"
      >
        {days.map((day, i) => {
          const active = i === safeSelectedDay;
          const isToday = nowDayIndex === i;
          return (
            <button
              key={day.dateKey}
              id={`${baseId}-tab-${i}`}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setSelectedDay(i)}
              className={`flex min-h-11 flex-col items-center justify-center rounded-[var(--radius-button)] border px-2 text-xs leading-tight ${FOCUS_RING} ${
                active
                  ? "border-primary bg-primary font-semibold text-white"
                  : "border-border text-secondary hover:bg-chip"
              }`}
            >
              <span>{day.weekday}</span>
              <span className="tabular-nums">{day.dayOfMonth}</span>
              {isToday && <span className="text-[10px] uppercase">Today</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-px rounded-[var(--radius-button)] border border-border bg-border p-px">
        <div
          aria-hidden="true"
          className="hidden w-12 shrink-0 flex-col gap-px sm:flex"
        >
          <div className="h-10 bg-surface" />
          {rowLabels.map((label, i) => (
            <div
              key={visibleRows[i]}
              className="flex h-7 items-center justify-end bg-surface pr-1 font-mono text-[11px] tabular-nums text-muted"
            >
              {label}
            </div>
          ))}
        </div>

        {days.map((day, dayIndex) => {
          const byRow = dayRows[dayIndex];
          const isToday = nowDayIndex === dayIndex;
          const visible = dayIndex === safeSelectedDay;
          return (
            <div
              key={day.dateKey}
              className={`${visible ? "flex" : "hidden sm:flex"} min-w-0 flex-1 flex-col gap-px`}
            >
              <div className="hidden h-10 flex-col items-center justify-center bg-surface text-xs leading-tight sm:flex">
                <span className="font-semibold">{day.weekday}</span>
                <span className="tabular-nums text-muted">
                  {day.dayOfMonth}
                  {isToday && (
                    <span className="ml-1 text-[10px] uppercase">Today</span>
                  )}
                </span>
              </div>

              <div className="relative flex min-w-0 flex-col gap-px">
                {visibleRows.map((row) => {
                  const cell = byRow.get(row);
                  if (!cell) {
                    return (
                      <div
                        key={row}
                        aria-hidden="true"
                        className="hidden h-7 bg-surface sm:block"
                      />
                    );
                  }
                  return (
                    <div
                      key={row}
                      className="flex h-11 w-full items-center bg-surface px-2 text-xs text-muted sm:h-7 sm:justify-center sm:px-0.5"
                    >
                      <span className="w-14 shrink-0 tabular-nums sm:hidden">
                        {formatHourOfDay(cell.ms)}
                      </span>
                    </div>
                  );
                })}
                {hasOverlays && (
                  <>
                    <GridOverlays
                      className="sm:hidden"
                      dayIndex={dayIndex}
                      days={days}
                      busy={eventBlocks}
                      options={options}
                      visibleRows={visibleRows}
                      rowHeightPx={44}
                    />
                    <GridOverlays
                      className="hidden sm:block"
                      dayIndex={dayIndex}
                      days={days}
                      busy={eventBlocks}
                      options={options}
                      visibleRows={visibleRows}
                      rowHeightPx={28}
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
          {eventBlocks.map((block) => (
            <li key={`${block.start}-${block.end}`}>{busyAriaLabel(block)}</li>
          ))}
          {options.map((drawn) => (
            <li
              key={`${drawn.activityId}-${drawn.option.start}-${drawn.option.labels.join("-")}`}
            >
              {optionAriaLabel(drawn)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
