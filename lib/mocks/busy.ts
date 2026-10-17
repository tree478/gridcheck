import type { BusyBlock } from "../types";

// MOCK DATA: a student week, Sun Oct 18 – Sun Oct 25, 2026. Sorted, non-overlapping, all EDT (-04:00).
// The asleep: false blocks are public/demo-calendar.ics as it should look after parsing:
// recurrences expanded, the transparent "Office hours (optional)" and the all-day
// "Midterm study day" skipped. Sleep (23:30–07:30 nightly) is not in the .ics.

export const mockBusy: BusyBlock[] = [
  // Sun Oct 18
  { start: "2026-10-18T23:30:00-04:00", end: "2026-10-19T07:30:00-04:00", asleep: true, title: "Sleep" },
  // Mon Oct 19
  { start: "2026-10-19T10:10:00-04:00", end: "2026-10-19T11:00:00-04:00", asleep: false, title: "CS 220 lecture" },
  { start: "2026-10-19T14:30:00-04:00", end: "2026-10-19T15:45:00-04:00", asleep: false, title: "Writing seminar" },
  { start: "2026-10-19T23:30:00-04:00", end: "2026-10-20T07:30:00-04:00", asleep: true, title: "Sleep" },
  // Tue Oct 20
  { start: "2026-10-20T13:00:00-04:00", end: "2026-10-20T14:15:00-04:00", asleep: false, title: "Stats 240" },
  { start: "2026-10-20T17:00:00-04:00", end: "2026-10-20T21:00:00-04:00", asleep: false, title: "Library desk shift" },
  { start: "2026-10-20T23:30:00-04:00", end: "2026-10-21T07:30:00-04:00", asleep: true, title: "Sleep" },
  // Wed Oct 21
  { start: "2026-10-21T10:10:00-04:00", end: "2026-10-21T11:00:00-04:00", asleep: false, title: "CS 220 lecture" },
  { start: "2026-10-21T14:30:00-04:00", end: "2026-10-21T15:45:00-04:00", asleep: false, title: "Writing seminar" },
  { start: "2026-10-21T19:00:00-04:00", end: "2026-10-21T20:30:00-04:00", asleep: false, title: "Climate club meeting" },
  { start: "2026-10-21T23:30:00-04:00", end: "2026-10-22T07:30:00-04:00", asleep: true, title: "Sleep" },
  // Thu Oct 22
  { start: "2026-10-22T13:00:00-04:00", end: "2026-10-22T14:15:00-04:00", asleep: false, title: "Stats 240" },
  { start: "2026-10-22T17:00:00-04:00", end: "2026-10-22T21:00:00-04:00", asleep: false, title: "Library desk shift" },
  { start: "2026-10-22T23:30:00-04:00", end: "2026-10-23T07:30:00-04:00", asleep: true, title: "Sleep" },
  // Fri Oct 23
  { start: "2026-10-23T10:10:00-04:00", end: "2026-10-23T11:00:00-04:00", asleep: false, title: "CS 220 lecture" },
  { start: "2026-10-23T23:30:00-04:00", end: "2026-10-24T07:30:00-04:00", asleep: true, title: "Sleep" },
  // Sat Oct 24
  { start: "2026-10-24T10:00:00-04:00", end: "2026-10-24T14:00:00-04:00", asleep: false, title: "Library desk shift" },
  { start: "2026-10-24T23:30:00-04:00", end: "2026-10-25T07:30:00-04:00", asleep: true, title: "Sleep" },
];
