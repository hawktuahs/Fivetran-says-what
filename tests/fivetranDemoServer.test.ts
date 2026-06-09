import { describe, expect, it } from "vitest";
import { handleMcpRequest } from "../server/mcp/fivetranDemoServer";

describe("demo Fivetran MCP server", () => {
  it("responds to MCP initialize and tool calls", async () => {
    const initialized = await handleMcpRequest({ method: "initialize" });
    const tools = await handleMcpRequest({ method: "tools/list" });
    const connector = await handleMcpRequest({
      method: "tools/call",
      params: {
        name: "fivetran.get_connector",
        arguments: { id: "inventory" }
      }
    });

    expect((initialized as { serverInfo: { name: string } }).serverInfo.name).toBe("surgepilot-fivetran-demo");
    expect((tools as { tools: unknown[] }).tools.length).toBeGreaterThan(0);
    expect(JSON.stringify(connector)).toContain("inventory");
  });
});
