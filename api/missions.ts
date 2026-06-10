import type { IncomingMessage, ServerResponse } from "node:http";
import { readJsonBody, vercelMissionService } from "../server/vercelApi";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  const body = await readJsonBody(request);
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  await vercelMissionService.startMission(prompt);

  response.statusCode = 200;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(await vercelMissionService.getState()));
}
