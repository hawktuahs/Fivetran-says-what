import type { ForecastItem, ForecastResult, SeedData, StaffingRecommendation } from "../types";

interface ForecastOptions {
  budget: number;
}

const matchWeekday = "Tuesday";

function roundToPack(units: number, packSize: number) {
  if (units <= 0) {
    return 0;
  }
  return Math.ceil(units / packSize) * packSize;
}

function riskFor(expectedDemand: number, unitsOnHand: number): ForecastItem["risk"] {
  if (expectedDemand >= unitsOnHand * 1.4) {
    return "high";
  }
  if (expectedDemand > unitsOnHand) {
    return "medium";
  }
  return "low";
}

function weatherMultiplier(category: string, weatherHigh: number) {
  if (category === "beverage" && weatherHigh >= 82) {
    return 1.18;
  }
  if (category === "food" && weatherHigh >= 82) {
    return 1.08;
  }
  return 1;
}

function buildStaffing(data: SeedData): StaffingRecommendation[] {
  return [11, 12, 13, 14, 15, 16, 17, 18].map((hour) => {
    const needed = hour >= 14 && hour <= 17 ? 5 : 3;
    const scheduled = data.staff.filter((staffer) => staffer.availableHours.includes(hour)).map((staffer) => staffer.name);

    return {
      hour,
      role: "floor team",
      needed,
      scheduled: scheduled.slice(0, needed),
      gap: Math.max(0, needed - scheduled.length)
    };
  });
}

export function buildForecast(data: SeedData, options: ForecastOptions): ForecastResult {
  const eventMultiplier = Math.max(1.35, data.match.visitorMultiplier + data.match.expectedAttendance / 100_000);
  const initialItems = data.inventory.map((item) => {
    const baseline = data.sales
      .filter((record) => record.sku === item.sku && record.weekday === matchWeekday)
      .reduce((sum, record) => sum + record.unitsSold, 0);
    const expectedDemand = Math.ceil(baseline * eventMultiplier * weatherMultiplier(item.category, data.weather.highFahrenheit));
    const shortage = Math.max(0, expectedDemand - item.unitsOnHand);
    const desiredUnits = roundToPack(Math.ceil(shortage * 1.1), item.packSize);
    const margin = Math.max(0, item.unitPrice - item.unitCost);

    return {
      sku: item.sku,
      name: item.name,
      expectedDemand,
      unitsOnHand: item.unitsOnHand,
      reorderUnits: desiredUnits,
      estimatedCost: desiredUnits * item.unitCost,
      expectedRevenue: Math.min(expectedDemand, item.unitsOnHand + desiredUnits) * item.unitPrice,
      risk: riskFor(expectedDemand, item.unitsOnHand),
      margin
    };
  });

  let remainingBudget = options.budget;
  const allocated = [...initialItems]
    .sort((a, b) => {
      const riskRank = { high: 3, medium: 2, low: 1 };
      return riskRank[b.risk] - riskRank[a.risk] || b.margin - a.margin;
    })
    .map((item) => {
      if (item.estimatedCost <= remainingBudget) {
        remainingBudget -= item.estimatedCost;
        return item;
      }

      const source = data.inventory.find((inventoryItem) => inventoryItem.sku === item.sku);
      const affordablePacks = source ? Math.floor(remainingBudget / (source.packSize * source.unitCost)) : 0;
      const reorderUnits = source ? affordablePacks * source.packSize : 0;
      const estimatedCost = source ? reorderUnits * source.unitCost : 0;
      remainingBudget -= estimatedCost;

      return {
        ...item,
        reorderUnits,
        estimatedCost,
        expectedRevenue: source ? Math.min(item.expectedDemand, item.unitsOnHand + reorderUnits) * source.unitPrice : item.expectedRevenue
      };
    })
    .sort((a, b) => b.expectedDemand - a.expectedDemand);

  const items = allocated.map(({ margin: _margin, ...item }) => item);
  const totalRecommendedSpend = Number(items.reduce((sum, item) => sum + item.estimatedCost, 0).toFixed(2));
  const expectedRevenue = Number(items.reduce((sum, item) => sum + item.expectedRevenue, 0).toFixed(2));
  const highRiskCount = items.filter((item) => item.risk === "high").length;

  return {
    items,
    totalRecommendedSpend,
    expectedRevenue,
    confidence: highRiskCount > 3 ? "medium" : "high",
    staffing: buildStaffing(data),
    summary: `${data.businessName} should prioritize ${highRiskCount} high-risk items before kickoff.`
  };
}
