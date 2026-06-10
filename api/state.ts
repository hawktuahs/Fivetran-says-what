import type { ServerResponse } from "node:http";

export default async function handler(_request: unknown, response: ServerResponse) {
  response.setHeader("Content-Type", "application/json");
  try {
    const { vercelMissionService } = await import("../server/vercelApi.js");
    response.statusCode = 200;
    response.end(JSON.stringify(await vercelMissionService.getState()));
  } catch (error) {
    response.statusCode = 500;
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
  }
}
