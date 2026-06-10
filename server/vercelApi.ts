import type { IncomingMessage } from "node:http";
import { seedData } from "./data/seed";
import { createDemoFivetranAdapter } from "./services/fivetranAdapter";
import { createGeminiReasoningService } from "./services/geminiReasoning";
import { createMissionService } from "./services/mission";

export const vercelMissionService = createMissionService(
  seedData,
  createDemoFivetranAdapter(),
  createGeminiReasoningService()
);

export function readJsonBody(request: IncomingMessage) {
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
