import { describe, expect, it } from "vitest";
import { seedData } from "../server/data/seed";
import { createDemoFivetranAdapter } from "../server/services/fivetranAdapter";
import { createMissionService } from "../server/services/mission";

describe("mission service", () => {
  it("requires approval before syncing stale data", async () => {
    const service = createMissionService(seedData, createDemoFivetranAdapter());

    const mission = await service.startMission("Prepare us for tomorrow's match-day surge with a $2,000 budget.");

    expect(mission.pendingApprovals.some((action) => action.type === "sync")).toBe(true);
    expect(mission.actionPack).toBeUndefined();
  });

  it("builds an action pack after sync approval", async () => {
    const service = createMissionService(seedData, createDemoFivetranAdapter());
    const mission = await service.startMission("Prepare us for tomorrow's match-day surge with a $2,000 budget.");
    const sync = mission.pendingApprovals.find((action) => action.type === "sync");

    const updated = await service.approveAction(sync!.id);

    expect(updated.actionPack?.reorderItems.length).toBeGreaterThan(0);
    expect(updated.auditEvents.some((event) => event.tool === "mcp.fivetran/trigger_sync")).toBe(true);
    expect(updated.auditEvents.some((event) => event.tool === "gemini.generateContent")).toBe(true);
    expect(updated.reasoning?.actionNarrative).toContain("Gemini fallback");
  });
});
