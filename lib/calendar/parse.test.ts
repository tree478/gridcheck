import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mockBusy } from "../mocks/busy";
import { parseIcs } from "./parse";

const NOW = "2026-10-18T12:00:00-04:00";
const DEADLINE = "2026-10-25T12:00:00-04:00";

function calendar(events: string): string {
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//GridWait//Parse test//EN\r\n${events}\r\nEND:VCALENDAR\r\n`;
}

function event(uid: string, start: string, end: string, summary: string): string {
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:20261017T120000Z`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    "END:VEVENT",
  ].join("\r\n");
}

describe("parseIcs", () => {
  it("expands the demo calendar into the awake mock rows", () => {
    const text = readFileSync(join(process.cwd(), "public/demo-calendar.ics"), "utf8");
    const result = parseIcs(text, { now: NOW, deadline: DEADLINE });
    const expected = mockBusy.filter((block) => !block.asleep);

    expect(result).toEqual({ ok: true, blocks: expected });
    if (!result.ok) return;
    expect(result.blocks.map((block) => block.start)).toEqual(
      [...result.blocks.map((block) => block.start)].sort(
        (a, b) => Date.parse(a) - Date.parse(b),
      ),
    );
    expect(result.blocks.some((block) => block.asleep)).toBe(false);
    expect(result.blocks.some((block) => block.title === "Sleep")).toBe(false);
    expect(result.blocks.some((block) => block.title === "Office hours (optional)")).toBe(
      false,
    );
    expect(result.blocks.some((block) => block.title === "Midterm study day")).toBe(false);
  });

  it("rejects text that is not a calendar without throwing", () => {
    expect(() => parseIcs("this is not a calendar", { now: NOW, deadline: DEADLINE })).not.toThrow();
    expect(parseIcs("this is not a calendar", { now: NOW, deadline: DEADLINE })).toEqual({
      ok: false,
      reason: "This file could not be read as a calendar.",
    });
  });

  it("drops an event that ends before now and clips one that straddles now", () => {
    const text = calendar(
      [
        event("past", "20261018T140000Z", "20261018T150000Z", "Already over"),
        event("straddle", "20261018T153000Z", "20261018T163000Z", "Still going"),
      ].join("\r\n"),
    );
    const result = parseIcs(text, { now: NOW, deadline: DEADLINE });

    expect(result).toEqual({
      ok: true,
      blocks: [
        {
          start: "2026-10-18T12:00:00-04:00",
          end: "2026-10-18T12:30:00-04:00",
          asleep: false,
          title: "Still going",
        },
      ],
    });
  });

  it("merges overlapping timed events into one awake block", () => {
    const text = calendar(
      [
        event("a", "20261019T180000Z", "20261019T200000Z", "First"),
        event("b", "20261019T190000Z", "20261019T210000Z", "Second"),
      ].join("\r\n"),
    );
    const result = parseIcs(text, { now: NOW, deadline: DEADLINE });

    expect(result).toEqual({
      ok: true,
      blocks: [
        {
          start: "2026-10-19T14:00:00-04:00",
          end: "2026-10-19T17:00:00-04:00",
          asleep: false,
        },
      ],
    });
  });
});
