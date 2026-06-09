import { createDemoFivetranMcpClient } from "../services/fivetranMcp";

interface JsonRpcRequest {
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

const client = createDemoFivetranMcpClient();

export async function handleMcpRequest(request: JsonRpcRequest) {
  if (request.method === "initialize") {
    return {
      protocolVersion: "2024-11-05",
      serverInfo: { name: "surgepilot-fivetran-demo", version: "0.1.0" },
      capabilities: { tools: {} }
    };
  }

  if (request.method === "tools/list") {
    return {
      tools: await client.listTools()
    };
  }

  if (request.method === "tools/call") {
    const name = String(request.params?.name ?? "");
    const args = (request.params?.arguments ?? {}) as Record<string, unknown>;
    const result = await client.callTool(name, args);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    };
  }

  throw new Error(`Unsupported MCP method: ${request.method}`);
}

async function main() {
  process.stdin.setEncoding("utf8");

  for await (const chunk of process.stdin) {
    for (const line of chunk.split(/\r?\n/).filter(Boolean)) {
      const request = JSON.parse(line) as JsonRpcRequest;
      try {
        const result = await handleMcpRequest(request);
        process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: request.id, result })}\n`);
      } catch (error) {
        process.stdout.write(
          `${JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            error: { code: -32000, message: error instanceof Error ? error.message : "Unknown error" }
          })}\n`
        );
      }
    }
  }
}

if (process.argv[1]?.endsWith("fivetranDemoServer.ts")) {
  void main();
}
