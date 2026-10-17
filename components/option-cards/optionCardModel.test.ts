import { describe, expect, it } from "vitest";
import { ACTIVITY_CATALOG } from "../../lib/constants";
import { mockGrid } from "../../lib/mocks/grid";
import { mockNoWindowResult, mockScheduleResult } from "../../lib/mocks/schedule";
import { formatOptionLabels } from "../schedule-grid/overlays";
import {
  activityById,
  attentionLines,
  cardTitle,
  chosenRecordPreview,
  chosenSummary,
  confidenceLabel,
  formatWindow,
  hasRecommendedCard,
  modeledGramsLine,
  noWindowDetails,
  savingsLine,
  visibleOptions,
} from "./optionCardModel";

function okResult(id: "washer" | "dishwasher") {
  const result = mockScheduleResult.results.find((item) => item.activityId === id);
  if (!result || !result.ok) throw new Error(`expected ok result for ${id}`);
  return result;
}

function optionWith(id: "washer" | "dishwasher", label: "soonest" | "recommended" | "worst" | "alternative") {
  const found = okResult(id).options.find((option) => option.labels.includes(label));
  if (!found) throw new Error(`expected ${label} option for ${id}`);
  return found;
}

const washer = activityById("washer");
const dishwasher = activityById("dishwasher");
if (!washer || !dishwasher) throw new Error("catalog missing washer or dishwasher");

describe("visibleOptions", () => {
  it("filters Worst out of the washer mock and keeps the rest", () => {
    const washerResult = okResult("washer");
    const visible = visibleOptions(washerResult.options);
    expect(washerResult.options.some((option) => option.labels.includes("worst"))).toBe(true);
    expect(visible.every((option) => !option.labels.includes("worst"))).toBe(true);
    expect(visible).toHaveLength(washerResult.options.length - 1);
    expect(visible.map((option) => option.labels)).toEqual([
      ["soonest"],
      ["recommended", "best", "greenest"],
      ["alternative"],
      ["alternative"],
    ]);
  });
});

describe("cardTitle", () => {
  it("merges labels via formatOptionLabels", () => {
    const recommended = optionWith("washer", "recommended");
    expect(cardTitle(recommended.labels)).toBe("Recommended · Best · Greenest");
    expect(cardTitle(recommended.labels)).toBe(formatOptionLabels(recommended.labels));
  });

  it("labels a lone alternative as Alternative", () => {
    expect(cardTitle(["alternative"])).toBe("Alternative");
    expect(cardTitle(optionWith("washer", "alternative").labels)).toBe("Alternative");
  });
});

describe("attentionLines", () => {
  it("adds a Load at line for the dishwasher recommended option", () => {
    const recommended = optionWith("dishwasher", "recommended");
    expect(recommended.loadAt).toBe("2026-10-20T22:00:00-04:00");
    expect(attentionLines(dishwasher, recommended)).toEqual([
      "You're needed at the start",
      "Load at 10 PM",
    ]);
  });

  it("omits Load at when loadAt is unset", () => {
    const recommended = optionWith("washer", "recommended");
    expect(recommended.loadAt).toBeUndefined();
    expect(attentionLines(washer, recommended)).toEqual(["You're needed at the start and the end"]);
  });
});

describe("noWindowDetails", () => {
  it("surfaces the EV reason and suggestion from mockNoWindowResult", () => {
    const ev = mockNoWindowResult.results[0];
    expect(noWindowDetails(ev)).toEqual({
      activityId: "ev",
      name: "EV charging (Level 2)",
      reason: "No free 10-minute moment before your deadline.",
      suggestion: "The nearest valid run starts Fri Oct 23 at 7:30 AM. Move your deadline later to include it.",
    });
  });

  it("returns null for an ok result", () => {
    expect(noWindowDetails(okResult("washer"))).toBeNull();
  });
});

describe("savingsLine", () => {
  it("does not treat Soonest as a CO₂ win", () => {
    const soonest = optionWith("washer", "soonest");
    expect(soonest.savedVsSoonestGrams).toBe(0);
    expect(soonest.savedVsSoonestPct).toBe(0);
    const line = savingsLine(soonest);
    expect(line).toBe("0% vs Soonest · baseline (Soonest)");
    expect(line.toLowerCase()).not.toContain("saved");
    expect(line).not.toMatch(/[1-9]/);
  });

  it("shows a negative when this option is dirtier than Soonest", () => {
    const soonest = optionWith("washer", "soonest");
    const dirtier = {
      ...soonest,
      labels: ["alternative" as const],
      savedVsSoonestGrams: -4.2,
      savedVsSoonestPct: -3.5,
    };
    expect(savingsLine(dirtier)).toBe("-3.5% vs Soonest (-4.2 g, modeled estimate)");
  });
});

describe("modeledGramsLine and confidenceLabel", () => {
  it("labels every grams figure as a modeled estimate", () => {
    const recommended = optionWith("washer", "recommended");
    expect(modeledGramsLine(recommended.modeledGrams)).toBe(
      `${recommended.modeledGrams} g CO₂ (modeled estimate)`,
    );
    expect(savingsLine(recommended)).toContain("modeled estimate");
  });

  it("names each confidence tier in words", () => {
    expect(confidenceLabel("pattern")).toBe("Pattern forecast");
    expect(confidenceLabel("forecast")).toBe("Demand forecast");
    expect(confidenceLabel("measured")).toBe("Measured");
  });
});

describe("chosenRecordPreview", () => {
  it("builds a guest RunRecord from the washer Recommended mock", () => {
    const washerResult = okResult("washer");
    const recommended = optionWith("washer", "recommended");
    const record = chosenRecordPreview({
      activityId: "washer",
      option: recommended,
      reference: washerResult.reference,
      kwh: washer.defaultEnergyKwh,
      forecastMadeAt: mockGrid.forecastMadeAt,
      createdAt: "2026-10-18T09:05:00-04:00",
    });
    expect(record).toEqual({
      id: "guest:washer:2026-10-18T13:00:00-04:00",
      owner: "guest",
      activityId: "washer",
      start: recommended.start,
      end: recommended.end,
      kwh: ACTIVITY_CATALOG.find((a) => a.id === "washer")?.defaultEnergyKwh,
      chosenGrams: recommended.modeledGrams,
      bestGrams: washerResult.reference.bestGrams,
      worstGrams: washerResult.reference.worstGrams,
      soonestGrams: washerResult.reference.soonestGrams,
      confidence: "pattern",
      forecastMadeAt: mockGrid.forecastMadeAt,
      status: "scheduled",
      createdAt: "2026-10-18T09:05:00-04:00",
    });
  });
});

describe("formatWindow and chosenSummary", () => {
  it("reads washer Recommended times from the mock option, in America/New_York", () => {
    const recommended = optionWith("washer", "recommended");
    expect(recommended.start).toBe("2026-10-18T13:00:00-04:00");
    expect(formatWindow(recommended.start, recommended.end)).toBe("Sun 1 PM–2 PM");
    expect(chosenSummary("Washer", recommended)).toBe("Washer chosen — Sun 1 PM–2 PM");
  });
});

describe("hasRecommendedCard", () => {
  it("is true for washer options and false when only Worst remains", () => {
    expect(hasRecommendedCard(okResult("washer").options)).toBe(true);
    expect(hasRecommendedCard([optionWith("washer", "worst")])).toBe(false);
  });
});
