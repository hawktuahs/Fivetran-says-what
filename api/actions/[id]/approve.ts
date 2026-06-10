import type { IncomingMessage, ServerResponse } from "node:http";
import { vercelMissionService } from "../../../server/vercelApi";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  const id = request.url?.split("/").at(-2) ?? "";
  await vercelMissionService.approveAction(id);

  response.statusCode = 200;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(await vercelMissionService.getState()));
}
