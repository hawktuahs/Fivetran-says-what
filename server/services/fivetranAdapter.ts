import type { Connector } from "../types";
import { seedData } from "../data/seed";

export interface FivetranAdapter {
  mode: "demo" | "live";
  listConnectors(): Promise<Connector[]>;
  getConnector(id: string): Promise<Connector>;
  getSyncLogs(id: string): Promise<string[]>;
  triggerSync(id: string): Promise<Connector>;
}

function cloneConnector(connector: Connector): Connector {
  return { ...connector };
}

export function createDemoFivetranAdapter(): FivetranAdapter {
  const connectors = new Map(seedData.connectors.map((connector) => [connector.id, cloneConnector(connector)]));
  const logs = new Map<string, string[]>(
    seedData.connectors.map((connector) => [
      connector.id,
      [`${connector.name}: last Fivetran MCP status read returned ${connector.status}.`]
    ])
  );

  return {
    mode: "demo",
    async listConnectors() {
      return [...connectors.values()].map(cloneConnector);
    },
    async getConnector(id) {
      const connector = connectors.get(id);
      if (!connector) {
        throw new Error(`Unknown Fivetran connector: ${id}`);
      }
      return cloneConnector(connector);
    },
    async getSyncLogs(id) {
      return [...(logs.get(id) ?? [])];
    },
    async triggerSync(id) {
      const connector = connectors.get(id);
      if (!connector) {
        throw new Error(`Unknown Fivetran connector: ${id}`);
      }

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
        `${updated.name}: manager approved manual sync through Fivetran MCP.`,
        `${updated.name}: sync completed and destination freshness is now 2 minutes.`
      ]);
      return cloneConnector(updated);
    }
  };
}

export function createLiveFivetranAdapter(): FivetranAdapter {
  const apiKey = process.env.FIVETRAN_API_KEY;
  const apiSecret = process.env.FIVETRAN_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("Live Fivetran mode requires FIVETRAN_API_KEY and FIVETRAN_API_SECRET.");
  }

  return {
    mode: "live",
    async listConnectors() {
      throw new Error("Live Fivetran MCP adapter is documented but not invoked in the credential-free demo.");
    },
    async getConnector() {
      throw new Error("Live Fivetran MCP adapter is documented but not invoked in the credential-free demo.");
    },
    async getSyncLogs() {
      throw new Error("Live Fivetran MCP adapter is documented but not invoked in the credential-free demo.");
    },
    async triggerSync() {
      throw new Error("Live Fivetran MCP adapter is documented but not invoked in the credential-free demo.");
    }
  };
}
