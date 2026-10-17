import { describe, expect, it } from "vitest";
import { TIMEZONE } from "../constants";
import { fetchFuelMix, type EiaFuelRow } from "./eia";

// Live call to EIA. Skipped unless EIA_LIVE=1 (npm run eia:sample).
// Uncached EIA queries take 60–80 s, so this uses a long timeout.
const LIVE = process.env.EIA_LIVE === "1";
const LIVE_TIMEOUT_MS = 120_000;

describe.skipIf(!LIVE)("EIA live", () => {
  it(
    "prints the last 24 h of fuel rows in New York time",
    async () => {
      try {
        process.loadEnvFile(".env.local");
      } catch {
        // Fall back to whatever is already in the environment.
      }

      const started = Date.now();
      const rows = await fetchFuelMix({ timeoutMs: LIVE_TIMEOUT_MS });
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      expect(rows.length).toBeGreaterThan(0);

      const byHour = new Map<string, EiaFuelRow[]>();
      for (const r of rows) {
        const list = byHour.get(r.hourStart) ?? [];
        list.push(r);
        byHour.set(r.hourStart, list);
      }
      const hours = [...byHour.keys()].sort((a, b) => Date.parse(a) - Date.parse(b));
      const codes = [...new Set(rows.map((r) => r.fuelCode))].sort();
      const last24 = hours.slice(-24);

      const table = last24.map((hour) => {
        const line: Record<string, string | number> = { hourStart: hour };
        for (const code of codes) {
          const r = byHour.get(hour)?.find((x) => x.fuelCode === code);
          line[code] = r ? r.mwh : "—";
        }
        return line;
      });

      const latest = hours.at(-1) ?? "";
      const lagHours = (Date.now() - Date.parse(latest)) / 3_600_000;
      console.log(
        [
          `EIA fetch: ${rows.length} rows, ${hours.length} hours, ${seconds} s`,
          `First hour: ${hours[0]}`,
          `Latest hour: ${latest} (${lagHours.toFixed(1)} h behind now)`,
          `Fuel codes: ${codes.join(", ")}`,
          `Last 24 h of available data, MWh, hourStart in ${TIMEZONE} ("—" = row omitted):`,
        ].join("\n"),
      );
      console.table(table);
    },
    LIVE_TIMEOUT_MS + 10_000,
  );
});
