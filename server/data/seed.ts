import type { SeedData } from "../types";

const recent = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
const tomorrowKickoff = new Date(Date.now() + 27 * 60 * 60_000).toISOString();

const items = [
  ["cold-brew-1l", "Cold brew growler", "beverage", 38, 5.5, 14, "harbor-roasters", 12, 8],
  ["iced-latte", "Iced latte cup", "beverage", 64, 2.8, 8, "harbor-roasters", 24, 6],
  ["sparkling-water", "Sparkling water", "beverage", 52, 1.1, 4, "city-provisions", 24, 5],
  ["empanada", "Chicken empanada", "food", 46, 2.25, 7, "stadium-bakery", 18, 4],
  ["veggie-wrap", "Veggie wrap", "food", 22, 3.2, 9, "stadium-bakery", 12, 4],
  ["protein-bar", "Protein bar", "food", 58, 1.4, 5, "city-provisions", 24, 5],
  ["team-scarf", "Blue team scarf", "merch", 14, 9, 24, "matchday-goods", 10, 12],
  ["receipt-roll", "Receipt roll", "supplies", 6, 1.5, 0, "city-provisions", 10, 5]
] as const;

const sales = items.flatMap(([sku], index) =>
  [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].flatMap((hour) => [
    {
      sku,
      weekday: "Tuesday",
      hour,
      unitsSold: Math.max(2, Math.round((index < 3 ? 12 : 8) + (hour >= 15 ? 7 : 0) - index))
    },
    {
      sku,
      weekday: "Friday",
      hour,
      unitsSold: Math.max(1, Math.round((index < 3 ? 8 : 5) + (hour >= 15 ? 4 : 0) - index))
    }
  ])
);

export const seedData: SeedData = {
  businessName: "Harbor Line Cafe",
  location: "East stadium district",
  weather: {
    summary: "Warm and humid with a low rain chance",
    highFahrenheit: 86,
    precipitationChance: 15
  },
  connectors: [
    {
      id: "pos",
      name: "POS sales",
      source: "Toast POS",
      destination: "BigQuery ops.sales",
      status: "fresh",
      lastSyncAt: recent(7),
      recordsSynced: 18420,
      freshnessMinutes: 7
    },
    {
      id: "inventory",
      name: "Inventory",
      source: "Sortly inventory",
      destination: "BigQuery ops.inventory",
      status: "stale",
      lastSyncAt: recent(178),
      recordsSynced: 1228,
      freshnessMinutes: 178
    },
    {
      id: "staffing",
      name: "Staffing",
      source: "Homebase staffing",
      destination: "BigQuery ops.staffing",
      status: "fresh",
      lastSyncAt: recent(13),
      recordsSynced: 92,
      freshnessMinutes: 13
    }
  ],
  inventory: items.map(([sku, name, category, unitsOnHand, unitCost, unitPrice, supplier, packSize, leadTimeHours]) => ({
    sku,
    name,
    category,
    unitsOnHand,
    unitCost,
    unitPrice,
    supplier,
    packSize,
    leadTimeHours
  })),
  sales,
  match: {
    id: "wc-2026-g8",
    venue: "Metro World Cup Stadium",
    kickoffAt: tomorrowKickoff,
    expectedAttendance: 64500,
    visitorMultiplier: 2.1
  },
  staff: [
    { id: "ana", name: "Ana", role: "barista", hourlyCost: 24, availableHours: [8, 9, 10, 11, 12, 13, 14, 15, 16] },
    { id: "marco", name: "Marco", role: "barista", hourlyCost: 23, availableHours: [11, 12, 13, 14, 15, 16, 17, 18] },
    { id: "dev", name: "Dev", role: "cashier", hourlyCost: 20, availableHours: [10, 11, 12, 13, 14, 15, 16, 17] },
    { id: "lena", name: "Lena", role: "cashier", hourlyCost: 21, availableHours: [14, 15, 16, 17, 18, 19, 20] },
    { id: "ivy", name: "Ivy", role: "runner", hourlyCost: 19, availableHours: [12, 13, 14, 15, 16, 17, 18] },
    { id: "sam", name: "Sam", role: "runner", hourlyCost: 19, availableHours: [15, 16, 17, 18, 19, 20] }
  ],
  suppliers: [
    { id: "harbor-roasters", name: "Harbor Roasters", email: "orders@harborroasters.example", cutoffHour: 16 },
    { id: "stadium-bakery", name: "Stadium Bakery", email: "rush@stadiumbakery.example", cutoffHour: 15 },
    { id: "city-provisions", name: "City Provisions", email: "dispatch@cityprovisions.example", cutoffHour: 17 },
    { id: "matchday-goods", name: "Matchday Goods", email: "ops@matchdaygoods.example", cutoffHour: 14 }
  ],
  promotions: [
    {
      id: "pre-kickoff-combo",
      channel: "social",
      copy: "Match-day express combo: cold brew plus empanada ready for the walk to the stadium."
    },
    {
      id: "line-skip",
      channel: "window",
      copy: "Order-ahead pickup lane open two hours before kickoff."
    }
  ]
};
