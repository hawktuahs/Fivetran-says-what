import { describe, expect, it } from "vitest";
import { createDemoFivetranAdapter } from "../server/services/fivetranAdapter";

describe("demo Fivetran adapter", () => {
  it("starts with stale inventory data", async () => {
    const adapter = createDemoFivetranAdapter();
    const connectors = await adapter.listConnectors();

    expect(connectors.find((connector) => connector.id === "inventory")?.status).toBe("stale");
  });

  it("refreshes inventory after a sync request", async () => {
    const adapter = createDemoFivetranAdapter();

    await adapter.triggerSync("inventory");
    const connector = await adapter.getConnector("inventory");

    expect(connector.status).toBe("fresh");
    expect(connector.freshnessMinutes).toBeLessThan(10);
  });
});
