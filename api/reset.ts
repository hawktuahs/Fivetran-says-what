import type { ServerResponse } from "node:http";
import { vercelMissionService } from "../server/vercelApi";

export default async function handler(_request: unknown, response: ServerResponse) {
  response.statusCode = 200;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(await vercelMissionService.reset()));
}
