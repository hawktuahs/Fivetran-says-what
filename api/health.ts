import type { ServerResponse } from "node:http";

export default function handler(_request: unknown, response: ServerResponse) {
  response.statusCode = 200;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify({ ok: true, name: "surgepilot-api" }));
}
