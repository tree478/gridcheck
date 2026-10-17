import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import raw from "./__fixtures__/eia-28d.raw.json";
import { parseRows } from "./eia";
import { computeIntensity } from "./intensity";

// Regenerates lib/grid/fallback.json (measured hours) from the saved 28-day
// EIA snapshot. Skipped unless GRID_BUILD_FALLBACK=1:
//   GRID_BUILD_FALLBACK=1 npx vitest run lib/grid/fallback.build.test.ts
const BUILD = process.env.GRID_BUILD_FALLBACK === "1";
const OUT = new URL("./fallback.json", import.meta.url);

describe.skipIf(!BUILD)("build fallback.json", () => {
  it("writes measured hours from eia-28d.raw.json", () => {
    const measured = computeIntensity(parseRows(raw));
    expect(measured.length).toBeGreaterThan(0);
    writeFileSync(OUT, JSON.stringify(measured, null, 0) + "\n");
    console.log(
      `fallback.json: ${measured.length} hours, ${measured[0].hourStart} → ${measured.at(-1)?.hourStart}`,
    );
  });
});
