import { describe, expect, it } from "vitest";
import { createDemoFivetranMcpClient, createFivetranMcpAdapter, getOfficialFivetranMcpConfig } from "../server/services/fivetranMcp";

describe("Fivetran MCP boundary", () => {
  it("exposes connector tools through a local MCP-compatible client", async () => {
    const client = createDemoFivetranMcpClient();
    const tools = await client.listTools();

    expect(tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(["fivetran.list_connectors", "fivetran.trigger_sync"])
    );
  });

  it("uses MCP tool calls for the Fivetran adapter", async () => {
    const calls: string[] = [];
    const adapter = createFivetranMcpAdapter(createDemoFivetranMcpClient(calls));

    const before = await adapter.getConnector("inventory");
    await adapter.triggerSync("inventory");
    const after = await adapter.getConnector("inventory");

    expect(before.status).toBe("stale");
    expect(after.status).toBe("fresh");
    expect(calls).toEqual(
      expect.arrayContaining(["fivetran.get_connector", "fivetran.trigger_sync"])
    );
  });

  it("documents the official Fivetran MCP server command for live mode", () => {
    const config = getOfficialFivetranMcpConfig();

    expect(config.command).toBe("uvx");
    expect(config.args.join(" ")).toContain("github.com/fivetran/fivetran-mcp");
    expect(config.env.FIVETRAN_ALLOW_WRITES).toBe("false");
  });
});
