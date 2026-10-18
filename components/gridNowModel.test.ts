import { describe, expect, it } from "vitest";
import type { HourIntensity } from "../lib/types";
import { cleanestWindow } from "./gridNowModel";

function hour(hourStart: string, gco2PerKwh: number): HourIntensity {
  return { hourStart, gco2PerKwh, tier: "pattern" };
}

describe("cleanestWindow", () => {
  it("picks the lowest stretch on the full series, not only afternoon", () => {
    // 24 hours starting at noon EDT; overnight (indices 12–14 = midnight–2 AM) is cleanest
    const hours: HourIntensity[] = [];
    for (let i = 0; i < 24; i++) {
      const h = (12 + i) % 24;
      const day = 12 + i >= 24 ? 19 : 18;
      const iso = `2026-10-${day}T${String(h).padStart(2, "0")}:00:00-04:00`;
      // Dirty afternoon (~200), clean overnight (~80), mid elsewhere (~140)
      const g =
        h >= 12 && h <= 16 ? 200 : h >= 0 && h <= 3 ? 80 : 140;
      hours.push(hour(iso, g));
    }

    const win = cleanestWindow(hours);
    expect(win).not.toBeNull();
    expect(win!.startIndex).toBe(12); // midnight
    expect(win!.length).toBe(3);
    expect(win!.avg).toBe(80);
  });

  it("highlights the same bars the average uses", () => {
    const hours = [
      hour("2026-10-18T10:00:00-04:00", 150),
      hour("2026-10-18T11:00:00-04:00", 100),
      hour("2026-10-18T12:00:00-04:00", 100),
      hour("2026-10-18T13:00:00-04:00", 100),
      hour("2026-10-18T14:00:00-04:00", 180),
    ];
    const win = cleanestWindow(hours);
    expect(win!.startIndex).toBe(1);
    expect(win!.end.hourStart).toBe("2026-10-18T13:00:00-04:00");
  });
});
