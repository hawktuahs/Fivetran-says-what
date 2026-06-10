import type { IncomingMessage, ServerResponse } from "node:http";
import { seedData } from "../server/data/seed";
import { createGeminiReasoningService } from "../server/services/geminiReasoning";
import { createDemoFivetranAdapter } from "../server/services/fivetranAdapter";
import { createMissionService } from "../server/services/mission";

const service = createMissionService(
  seedData,
  createDemoFivetranAdapter(),
  createGeminiReasoningService()
);

function send(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

function readBody(request: IncomingMessage) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += String(chunk);
    });
    request.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body) as Record<string, unknown>);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
    request.on("error", reject);
  });
}

function pathSegments(request: IncomingMessage) {
  const url = new URL(request.url ?? "/api", "https://surgepilot.local");
  return url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  try {
    const method = request.method ?? "GET";
    const segments = pathSegments(request);

    if (method === "GET" && segments[0] === "health") {
      send(response, 200, { ok: true, name: "surgepilot-api" });
      return;
    }

    if (method === "GET" && segments[0] === "state") {
      send(response, 200, await service.getState());
      return;
    }

    if (method === "POST" && segments[0] === "missions") {
      const body = await readBody(request);
      const prompt = typeof body.prompt === "string" ? body.prompt : "";
      await service.startMission(prompt);
      send(response, 200, await service.getState());
      return;
    }

    if (method === "POST" && segments[0] === "actions" && typeof segments[1] === "string" && segments[2] === "approve") {
      await service.approveAction(segments[1]);
      send(response, 200, await service.getState());
      return;
    }

    if (method === "POST" && segments[0] === "actions" && typeof segments[1] === "string" && segments[2] === "reject") {
      await service.rejectAction(segments[1]);
      send(response, 200, await service.getState());
      return;
    }

    if (method === "POST" && segments[0] === "reset") {
      send(response, 200, await service.reset());
      return;
    }

    send(response, 404, { error: "Not found" });
  } catch (error) {
    send(response, 500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
}
