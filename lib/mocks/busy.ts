import type { BusyBlock } from "../types";

// MOCK DATA: the student week in public/demo-calendar.ics (Sun Oct 18 – Sat Oct 24, 2026)
// as it should look after parsing with includeAllDay = false: recurrences expanded,
// the transparent "Office hours (optional)" and the all-day "Midterm study day" skipped.
// Sorted, non-overlapping, all EDT (-04:00).

export const mockBusy: BusyBlock[] = [
  // Mon Oct 19
  { start: "2026-10-19T10:10:00-04:00", end: "2026-10-19T11:00:00-04:00", title: "CS 220 lecture" },
  { start: "2026-10-19T14:30:00-04:00", end: "2026-10-19T15:45:00-04:00", title: "Writing seminar" },
  // Tue Oct 20
  { start: "2026-10-20T13:00:00-04:00", end: "2026-10-20T14:15:00-04:00", title: "Stats 240" },
  { start: "2026-10-20T17:00:00-04:00", end: "2026-10-20T21:00:00-04:00", title: "Library desk shift" },
  // Wed Oct 21
  { start: "2026-10-21T10:10:00-04:00", end: "2026-10-21T11:00:00-04:00", title: "CS 220 lecture" },
  { start: "2026-10-21T14:30:00-04:00", end: "2026-10-21T15:45:00-04:00", title: "Writing seminar" },
  { start: "2026-10-21T19:00:00-04:00", end: "2026-10-21T20:30:00-04:00", title: "Climate club meeting" },
  // Thu Oct 22
  { start: "2026-10-22T13:00:00-04:00", end: "2026-10-22T14:15:00-04:00", title: "Stats 240" },
  { start: "2026-10-22T17:00:00-04:00", end: "2026-10-22T21:00:00-04:00", title: "Library desk shift" },
  // Fri Oct 23
  { start: "2026-10-23T10:10:00-04:00", end: "2026-10-23T11:00:00-04:00", title: "CS 220 lecture" },
  // Sat Oct 24
  { start: "2026-10-24T10:00:00-04:00", end: "2026-10-24T14:00:00-04:00", title: "Library desk shift" },
];
