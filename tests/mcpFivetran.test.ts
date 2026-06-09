import { describe, expect, it } from "vitest";
import {
  createDemoFivetranMcpClient,
  createFivetranMcpAdapter,
  createOfficialFivetranMcpAdapter,
  getOfficialFivetranMcpConfig,
  parseMcpToolContent
} from "../server/services/fivetranMcp";

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

  it("maps app connector operations to official Fivetran MCP tools", async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const adapter = createOfficialFivetranMcpAdapter({
      mode: "mcp-live",
      async listTools() {
        return [
          { name: "list_connections", description: "List ALL Fivetran connections in your account." },
          { name: "get_connection_details", description: "Get detailed information about a specific connection." },
          { name: "sync_connection", description: "Trigger a data sync for a connection." }
        ];
      },
      async callTool(name, args) {
        calls.push({ name, args });
        if (name === "list_connections") {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  data: {
                    items: [
                      {
                        id: "inventory",
                        service: "sortly",
                        schema: "ops_inventory",
                        status: { sync_state: "paused" },
                        succeeded_at: new Date(Date.now() - 90 * 60_000).toISOString()
                      }
                    ]
                  }
                })
              }
            ]
          };
        }

        if (name === "sync_connection") {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  data: {
                    id: "inventory",
                    service: "sortly",
                    schema: "ops_inventory",
                    status: { sync_state: "syncing" },
                    succeeded_at: new Date().toISOString()
                  }
                })
              }
            ]
          };
        }

        throw new Error(`Unexpected tool ${name}`);
      }
    });

    const connectors = await adapter.listConnectors();
    const synced = await adapter.triggerSync("inventory");

    expect(connectors[0]).toMatchObject({ id: "inventory", status: "stale" });
    expect(synced).toMatchObject({ id: "inventory", status: "syncing" });
    expect(calls).toEqual([
      {
        name: "list_connections",
        args: { schema_file: "open-api-definitions/connections/list_connections.json" }
      },
      {
        name: "sync_connection",
        args: {
          schema_file: "open-api-definitions/connections/sync_connection.json",
          connection_id: "inventory",
          request_body: {}
        }
      }
    ]);
  });

  it("parses JSON payloads returned as MCP text content", () => {
    expect(parseMcpToolContent({ content: [{ type: "text", text: "{\"ok\":true}" }] })).toEqual({ ok: true });
  });
});
