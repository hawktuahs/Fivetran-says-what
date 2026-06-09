import cors from "cors";
import express from "express";
import { seedData } from "./data/seed";
import { loadLocalEnv } from "./env";
import { createGeminiReasoningService } from "./services/geminiReasoning";
import {
  createDemoFivetranMcpClient,
  createFivetranMcpAdapter,
  createLiveFivetranMcpClient,
  createOfficialFivetranMcpAdapter
} from "./services/fivetranMcp";
import { createMissionService } from "./services/mission";

const app: express.Express = express();
loadLocalEnv({ override: true });
const port = Number(process.env.PORT ?? 8787);

function createRuntimeMissionService() {
  const hasFivetranCredentials = Boolean(process.env.FIVETRAN_API_KEY && process.env.FIVETRAN_API_SECRET);
  const fivetran = hasFivetranCredentials
    ? createOfficialFivetranMcpAdapter(createLiveFivetranMcpClient())
    : createFivetranMcpAdapter(createDemoFivetranMcpClient());

  return createMissionService(
    seedData,
    fivetran,
    createGeminiReasoningService()
  );
}

let service = createRuntimeMissionService();

app.use(cors({ origin: ["http://127.0.0.1:5173", "http://localhost:5173"] }));
app.use(express.json());

function sendError(response: express.Response, error: unknown) {
  response.status(400).json({
    error: error instanceof Error ? error.message : "Unknown error"
  });
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, name: "surgepilot-api" });
});

app.get("/api/state", async (_request, response) => {
  try {
    response.json(await service.getState());
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/missions", async (request, response) => {
  try {
    const prompt = typeof request.body?.prompt === "string" ? request.body.prompt : "";
    await service.startMission(prompt);
    response.json(await service.getState());
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/actions/:id/approve", async (request, response) => {
  try {
    await service.approveAction(request.params.id);
    response.json(await service.getState());
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/actions/:id/reject", async (request, response) => {
  try {
    await service.rejectAction(request.params.id);
    response.json(await service.getState());
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/reset", async (_request, response) => {
  try {
    service = createRuntimeMissionService();
    response.json(await service.reset());
  } catch (error) {
    sendError(response, error);
  }
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, "127.0.0.1", () => {
    console.log(`SurgePilot API listening on http://127.0.0.1:${port}`);
  });
}

export { app };
