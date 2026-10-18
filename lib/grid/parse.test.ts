import { describe, expect, it } from "vitest";
import { mockGrid } from "../mocks/grid";
import { parseGridResponse } from "./parse";

// Round-trip through JSON so the input looks like a real fetch body.
const body = (overrides: Record<string, unknown> = {}): unknown =>
  JSON.parse(JSON.stringify({ ...mockGrid, ...overrides }));

describe("parseGridResponse", () => {
  it("accepts a valid response", () => {
    expect(parseGridResponse(body())).toEqual(mockGrid);
  });

  it("accepts a fallback response", () => {
    expect(parseGridResponse(body({ source: "fallback" }))?.source).toBe("fallback");
  });

  it("rejects non-objects and error bodies", () => {
    expect(parseGridResponse(null)).toBeNull();
    expect(parseGridResponse("oops")).toBeNull();
    expect(parseGridResponse({ error: "Grid data is unavailable right now." })).toBeNull();
  });

  it("rejects missing or malformed fields", () => {
    expect(parseGridResponse(body({ forecastMadeAt: undefined }))).toBeNull();
    expect(parseGridResponse(body({ latestDataHour: "not a date" }))).toBeNull();
    expect(parseGridResponse(body({ recent: "nope" }))).toBeNull();
  });

  it("rejects an unknown source or region", () => {
    expect(parseGridResponse(body({ source: "cache" }))).toBeNull();
    expect(parseGridResponse(body({ region: "PJM" }))).toBeNull();
  });

  it("rejects an empty forecast", () => {
    expect(parseGridResponse(body({ forecast: [] }))).toBeNull();
  });

  it("rejects a forecast hour with a bad value or tier", () => {
    const [first, ...rest] = mockGrid.forecast;
    expect(parseGridResponse(body({ forecast: [{ ...first, gco2PerKwh: null }, ...rest] }))).toBeNull();
    expect(parseGridResponse(body({ forecast: [{ ...first, tier: "guess" }, ...rest] }))).toBeNull();
  });
});
