import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { icsHorizonMs, parseIcsToBusyBlocks } from "./icsBusy";

const demoIcs = readFileSync(
  join(process.cwd(), "public/demo-calendar.ics"),
  "utf8",
);

describe("parseIcsToBusyBlocks", () => {
  const now = "2026-10-18T09:00:00-04:00";
  const { startMs, endMs } = icsHorizonMs(now);

  it("loads timed busy events from the demo .ics and skips free/all-day", () => {
    const blocks = parseIcsToBusyBlocks(demoIcs, startMs, endMs);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.every((b) => !b.asleep)).toBe(true);
    expect(blocks.some((b) => b.title === "CS 220 lecture")).toBe(true);
    expect(blocks.some((b) => b.title === "Midterm study day")).toBe(false);
    expect(blocks.some((b) => b.title === "Office hours (optional)")).toBe(
      false,
    );
  });

  it("rejects non-calendar text", () => {
    expect(() => parseIcsToBusyBlocks("not a calendar", startMs, endMs)).toThrow();
  });
});
