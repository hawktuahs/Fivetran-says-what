import { loadLocalEnv } from "../env";
import {
  createLiveFivetranMcpClient,
  createOfficialFivetranMcpAdapter,
  getOfficialFivetranMcpConfig
} from "../services/fivetranMcp";

loadLocalEnv({ override: true });

const config = getOfficialFivetranMcpConfig();

if (!process.env.FIVETRAN_API_KEY || !process.env.FIVETRAN_API_SECRET) {
  console.error("FIVETRAN_API_KEY and FIVETRAN_API_SECRET are required.");
  process.exit(1);
}

try {
  const client = createLiveFivetranMcpClient(config);
  const tools = await client.listTools();
  const names = tools.map((tool) => tool.name);
  const adapter = createOfficialFivetranMcpAdapter(client);
  const connectors = await adapter.listConnectors();

  console.log(`Fivetran MCP check passed with ${tools.length} tools.`);
  console.log(`Core tools: ${names.slice(0, 12).join(", ")}`);
  console.log(`Live list_connections returned ${connectors.length} connection(s).`);

  if (!names.includes("list_connections")) {
    console.warn("Expected list_connections was not advertised by the MCP server.");
  }
} catch (error) {
  console.error("Fivetran MCP check failed.");
  console.error(error instanceof Error ? error.message : String(error));
  console.error("Check FIVETRAN_MCP_COMMAND, FIVETRAN_MCP_ARGS, uvx/Python availability, and your Fivetran credentials.");
  process.exit(1);
}

process.exit(0);
