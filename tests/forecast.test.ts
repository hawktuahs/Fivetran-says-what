import { describe, expect, it } from "vitest";
import { seedData } from "../server/data/seed";
import { buildForecast } from "../server/services/forecast";

describe("buildForecast", () => {
  it("recommends reorder units when match-day demand exceeds inventory", () => {
    const result = buildForecast(seedData, { budget: 2000 });
    const coffee = result.items.find((item) => item.sku === "cold-brew-1l");

    expect(coffee?.reorderUnits).toBeGreaterThan(0);
    expect(result.totalRecommendedSpend).toBeLessThanOrEqual(2000);
  });

  it("marks high risk items when projected demand exceeds stock by at least 40 percent", () => {
    const result = buildForecast(seedData, { budget: 2000 });

    expect(result.items.some((item) => item.risk === "high")).toBe(true);
  });
});
