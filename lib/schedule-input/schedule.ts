import type { BusyBlock } from "../types";
import { mockBusy } from "../mocks/busy";

export type ScheduleInput = {
  list(): BusyBlock[];
  add(block: BusyBlock): boolean;
  remove(manualIndex: number): boolean;
};

function isValidBlock(value: unknown): value is BusyBlock {
  if (value === null || typeof value !== "object") return false;
  const block = value as Record<string, unknown>;
  if (typeof block.start !== "string" || typeof block.end !== "string") return false;
  if (typeof block.asleep !== "boolean") return false;
  if ("title" in block && block.title !== undefined && typeof block.title !== "string") {
    return false;
  }
  const start = Date.parse(block.start);
  const end = Date.parse(block.end);
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return start < end;
}

function copyBlock(block: BusyBlock): BusyBlock {
  const copy: BusyBlock = {
    start: block.start,
    end: block.end,
    asleep: block.asleep,
  };
  if (typeof block.title === "string") copy.title = block.title;
  return copy;
}

function overlaps(a: BusyBlock, b: BusyBlock): boolean {
  return Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end);
}

function compareBlocks(a: BusyBlock, b: BusyBlock): number {
  const startDelta = Date.parse(a.start) - Date.parse(b.start);
  if (startDelta !== 0) return startDelta;
  const endDelta = Date.parse(a.end) - Date.parse(b.end);
  if (endDelta !== 0) return endDelta;
  return (a.title ?? "").localeCompare(b.title ?? "");
}

function union(existing: BusyBlock, next: BusyBlock): BusyBlock {
  const end = Date.parse(next.end) > Date.parse(existing.end) ? next.end : existing.end;
  return {
    start: existing.start,
    end,
    asleep: existing.asleep && next.asleep,
  };
}

export function demoSchedule(): BusyBlock[] {
  return mockBusy.map(copyBlock);
}

export function mergeBusy(blocks: readonly BusyBlock[]): BusyBlock[] {
  const valid: BusyBlock[] = [];
  for (const block of blocks) {
    if (isValidBlock(block)) valid.push(copyBlock(block));
  }
  valid.sort(compareBlocks);

  const merged: BusyBlock[] = [];
  for (const block of valid) {
    const last = merged.at(-1);
    if (last && overlaps(last, block)) {
      merged[merged.length - 1] = union(last, block);
    } else {
      merged.push(block);
    }
  }
  return merged;
}

export function createSchedule(manual: readonly BusyBlock[] = []): ScheduleInput {
  const manualBlocks: BusyBlock[] = [];
  for (const block of manual) {
    if (isValidBlock(block)) manualBlocks.push(copyBlock(block));
  }

  return {
    list(): BusyBlock[] {
      const demo = demoSchedule();
      const added = manualBlocks.map(copyBlock);
      return mergeBusy([...demo, ...added]);
    },
    add(block: BusyBlock): boolean {
      if (!isValidBlock(block)) return false;
      manualBlocks.push(copyBlock(block));
      return true;
    },
    remove(manualIndex: number): boolean {
      if (
        !Number.isInteger(manualIndex) ||
        manualIndex < 0 ||
        manualIndex >= manualBlocks.length
      ) {
        return false;
      }
      manualBlocks.splice(manualIndex, 1);
      return true;
    },
  };
}
