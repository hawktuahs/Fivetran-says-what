import type { Connector } from "../types";
import type { FivetranAdapter } from "./fivetranAdapter";
import { seedData } from "../data/seed";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";

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
  startupDelayMs: number;
}

interface JsonRpcResponse {
  id?: number;
  result?: unknown;
  error?: { message?: string };
}

interface TextContent {
  type: "text";
  text: string;
}

type SpawnProcess = Pick<ChildProcessWithoutNullStreams, "stdin" | "stdout" | "stderr" | "kill" | "once">;

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

function minutesSince(value: string | undefined) {
  if (!value) {
    return 999;
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return 999;
  }

  return Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function findData(value: unknown): unknown {
  const record = toRecord(value);
  return "data" in record ? record.data : value;
}

function extractItems(value: unknown): unknown[] {
  const data = toRecord(findData(value));
  return Array.isArray(data.items) ? data.items : [];
}

function mapConnectionToConnector(value: unknown, index = 0): Connector {
  const connection = toRecord(value);
  const statusRecord = toRecord(connection.status);
  const id = String(connection.id ?? connection.connection_id ?? `connection-${index + 1}`);
  const service = String(connection.service ?? connection.connector_type ?? connection.source ?? "Fivetran source");
  const schema = String(connection.schema ?? connection.destination_schema ?? connection.name ?? id);
  const syncState = String(statusRecord.sync_state ?? connection.sync_state ?? connection.status ?? "").toLowerCase();
  const rawLastSyncAt = firstString(connection.succeeded_at, connection.last_successful_sync_at, connection.last_sync_at);
  const freshnessMinutes = rawLastSyncAt ? minutesSince(rawLastSyncAt) : 999;
  const lastSyncAt = rawLastSyncAt ?? new Date(Date.now() - freshnessMinutes * 60_000).toISOString();
  const status: Connector["status"] =
    syncState.includes("failed") || syncState.includes("broken")
      ? "failed"
      : syncState.includes("sync")
        ? "syncing"
        : freshnessMinutes > 60
          ? "stale"
          : "fresh";

  return {
    id,
    name: schema.replaceAll("_", " "),
    source: service,
    destination: String(connection.group_id ?? connection.destination_id ?? "Fivetran destination"),
    status,
    lastSyncAt,
    recordsSynced: Number(connection.records_synced ?? connection.recordsSynced ?? 0),
    freshnessMinutes
  };
}

export function parseMcpToolContent(value: unknown): unknown {
  const record = toRecord(value);
  const content = Array.isArray(record.content) ? record.content : undefined;
  const text = content
    ?.map((item) => {
      const part = item as Partial<TextContent>;
      return part.type === "text" ? part.text ?? "" : "";
    })
    .join("")
    .trim();

  if (!text) {
    return value;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
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

export function createOfficialFivetranMcpAdapter(client: FivetranMcpClient): FivetranAdapter {
  const logs = new Map<string, string[]>();

  async function listLiveConnections() {
    const response = await client.callTool("list_connections", {
      schema_file: "open-api-definitions/connections/list_connections.json"
    });
    return extractItems(parseMcpToolContent(response)).map(mapConnectionToConnector);
  }

  return {
    mode: "live",
    transport: "mcp-live",
    serverName: "fivetran",
    async listConnectors() {
      return listLiveConnections();
    },
    async getConnector(id) {
      const response = await client.callTool("get_connection_details", {
        schema_file: "open-api-definitions/connections/connection_details.json",
        connection_id: id
      });
      return mapConnectionToConnector(findData(parseMcpToolContent(response)));
    },
    async getSyncLogs(id) {
      return [...(logs.get(id) ?? [`${id}: read through official Fivetran MCP server.`])];
    },
    async triggerSync(id) {
      const response = await client.callTool("sync_connection", {
        schema_file: "open-api-definitions/connections/sync_connection.json",
        connection_id: id,
        request_body: {}
      });
      const connector = mapConnectionToConnector(findData(parseMcpToolContent(response)));
      logs.set(id, [
        ...(logs.get(id) ?? []),
        `${connector.name}: sync_connection called through official Fivetran MCP server.`
      ]);
      return connector;
    }
  };
}

export function createLiveFivetranMcpClient(config = getOfficialFivetranMcpConfig()): FivetranMcpClient {
  let processRef: SpawnProcess | undefined;
  let processReady: Promise<void> | undefined;
  let nextId = 1;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

  function ensureProcess() {
    if (processRef) {
      return processRef;
    }

    const child = spawn(config.command, config.args, {
      env: { ...process.env, ...config.env },
      stdio: ["pipe", "pipe", "pipe"]
    });
    processRef = child;
    processReady = new Promise((resolve) => {
      setTimeout(resolve, config.startupDelayMs);
    });

    const stdout = createInterface({ input: child.stdout });
    child.stderr.on("data", () => {
      // Drain stderr so a chatty MCP server cannot block on a full pipe.
    });
    stdout.on("line", (line) => {
      if (!line.trim()) {
        return;
      }

      const message = JSON.parse(line) as JsonRpcResponse;
      if (typeof message.id !== "number") {
        return;
      }

      const handler = pending.get(message.id);
      if (!handler) {
        return;
      }

      pending.delete(message.id);
      if (message.error) {
        handler.reject(new Error(message.error.message ?? "Fivetran MCP tool call failed."));
      } else {
        handler.resolve(message.result);
      }
    });

    child.once("exit", () => {
      processRef = undefined;
      processReady = undefined;
      for (const [, handler] of pending) {
        handler.reject(new Error("Fivetran MCP server exited before responding."));
      }
      pending.clear();
    });
    child.once("error", (error) => {
      processRef = undefined;
      processReady = undefined;
      for (const [, handler] of pending) {
        handler.reject(error instanceof Error ? error : new Error(String(error)));
      }
      pending.clear();
    });

    return child;
  }

  async function request(method: string, params?: Record<string, unknown>) {
    const child = ensureProcess();
    await processReady;
    const id = nextId;
    nextId += 1;

    const result = new Promise<unknown>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (!pending.has(id)) {
          return;
        }
        pending.delete(id);
        reject(new Error(`Timed out waiting for Fivetran MCP ${method}.`));
      }, 30_000);
    });

    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    return result;
  }

  let initialized: Promise<void> | undefined;
  async function initialize() {
    if (!initialized) {
      initialized = (async () => {
        await request("initialize", {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "surgepilot", version: "0.1.0" }
        });
        ensureProcess().stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);
      })();
    }
    return initialized;
  }

  return {
    mode: "mcp-live",
    async listTools() {
      await initialize();
      const result = toRecord(await request("tools/list"));
      const tools = Array.isArray(result.tools) ? result.tools : [];
      return tools.map((tool) => {
        const item = toRecord(tool);
        return { name: String(item.name), description: String(item.description ?? "") };
      });
    },
    async callTool(name, args) {
      await initialize();
      return request("tools/call", { name, arguments: args });
    }
  };
}

export function getOfficialFivetranMcpConfig(): FivetranMcpCommandConfig {
  return {
    command: process.env.FIVETRAN_MCP_COMMAND ?? "uvx",
    args: (process.env.FIVETRAN_MCP_ARGS ?? "--from git+https://github.com/fivetran/fivetran-mcp fivetran-mcp").split(" "),
    startupDelayMs: Number(process.env.FIVETRAN_MCP_STARTUP_DELAY_MS ?? 5000),
    env: {
      FIVETRAN_API_KEY: process.env.FIVETRAN_API_KEY ?? "your-api-key",
      FIVETRAN_API_SECRET: process.env.FIVETRAN_API_SECRET ?? "your-api-secret",
      FIVETRAN_ALLOW_WRITES: process.env.FIVETRAN_ALLOW_WRITES ?? "false"
    }
  };
}
