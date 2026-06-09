import type { Connector } from "../types";
import type { FivetranAdapter } from "./fivetranAdapter";
import { seedData } from "../data/seed";

export interface McpTool {
  name: string;
  description: string;
}

export interface FivetranMcpClient {
  mode: "mcp-demo" | "mcp-live";
  listTools(): Promise<McpTool[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
}

export interface FivetranMcpCommandConfig {
  command: string;
  args: string[];
  env: Record<string, string>;
}

function cloneConnector(connector: Connector): Connector {
  return { ...connector };
}

function assertConnector(value: unknown): Connector {
  if (!value || typeof value !== "object" || !("id" in value)) {
    throw new Error("Fivetran MCP returned an invalid connector payload.");
  }
  return value as Connector;
}

function assertConnectorList(value: unknown): Connector[] {
  if (!Array.isArray(value)) {
    throw new Error("Fivetran MCP returned an invalid connector list.");
  }
  return value.map(assertConnector);
}

export function createDemoFivetranMcpClient(callLog: string[] = []): FivetranMcpClient {
  const connectors = new Map(seedData.connectors.map((connector) => [connector.id, cloneConnector(connector)]));
  const logs = new Map<string, string[]>(
    seedData.connectors.map((connector) => [
      connector.id,
      [`${connector.name}: demo MCP status read returned ${connector.status}.`]
    ])
  );

  return {
    mode: "mcp-demo",
    async listTools() {
      return [
        { name: "fivetran.list_connectors", description: "List Fivetran connector freshness and destinations." },
        { name: "fivetran.get_connector", description: "Inspect one Fivetran connector by id." },
        { name: "fivetran.get_sync_logs", description: "Read recent sync log summaries for a connector." },
        { name: "fivetran.trigger_sync", description: "Trigger an approved connector sync." }
      ];
    },
    async callTool(name, args) {
      callLog.push(name);

      if (name === "fivetran.list_connectors") {
        return [...connectors.values()].map(cloneConnector);
      }

      const id = String(args.id ?? "");
      const connector = connectors.get(id);
      if (!connector) {
        throw new Error(`Unknown Fivetran MCP connector: ${id}`);
      }

      if (name === "fivetran.get_connector") {
        return cloneConnector(connector);
      }

      if (name === "fivetran.get_sync_logs") {
        return [...(logs.get(id) ?? [])];
      }

      if (name === "fivetran.trigger_sync") {
        const updated: Connector = {
          ...connector,
          status: "fresh",
          lastSyncAt: new Date().toISOString(),
          freshnessMinutes: 2,
          recordsSynced: connector.recordsSynced + 147
        };
        connectors.set(id, updated);
        logs.set(id, [
          ...(logs.get(id) ?? []),
          `${updated.name}: approved trigger_sync tool call received.`,
          `${updated.name}: sync completed through demo MCP transport.`
        ]);
        return cloneConnector(updated);
      }

      throw new Error(`Unsupported Fivetran MCP tool: ${name}`);
    }
  };
}

export function createFivetranMcpAdapter(client = createDemoFivetranMcpClient()): FivetranAdapter {
  return {
    mode: client.mode === "mcp-live" ? "live" : "demo",
    transport: client.mode,
    serverName: "fivetran",
    async listConnectors() {
      return assertConnectorList(await client.callTool("fivetran.list_connectors", {})).map(cloneConnector);
    },
    async getConnector(id) {
      return cloneConnector(assertConnector(await client.callTool("fivetran.get_connector", { id })));
    },
    async getSyncLogs(id) {
      const logs = await client.callTool("fivetran.get_sync_logs", { id });
      return Array.isArray(logs) ? logs.map(String) : [];
    },
    async triggerSync(id) {
      return cloneConnector(assertConnector(await client.callTool("fivetran.trigger_sync", { id })));
    }
  };
}

export function getOfficialFivetranMcpConfig(): FivetranMcpCommandConfig {
  return {
    command: process.env.FIVETRAN_MCP_COMMAND ?? "uvx",
    args: (process.env.FIVETRAN_MCP_ARGS ?? "--from git+https://github.com/fivetran/fivetran-mcp fivetran-mcp").split(" "),
    env: {
      FIVETRAN_API_KEY: process.env.FIVETRAN_API_KEY ?? "your-api-key",
      FIVETRAN_API_SECRET: process.env.FIVETRAN_API_SECRET ?? "your-api-secret",
      FIVETRAN_ALLOW_WRITES: process.env.FIVETRAN_ALLOW_WRITES ?? "false"
    }
  };
}
