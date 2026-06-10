import type { IncomingMessage, ServerResponse } from "node:http";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  response.setHeader("Content-Type", "application/json");
  try {
    const { readJsonBody, vercelMissionService } = await import("../server/vercelApi");
    const body = await readJsonBody(request);
    const prompt = typeof body.prompt === "string" ? body.prompt : "";
    await vercelMissionService.startMission(prompt);

    response.statusCode = 200;
    response.end(JSON.stringify(await vercelMissionService.getState()));
  } catch (error) {
    response.statusCode = 500;
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
  }
}
