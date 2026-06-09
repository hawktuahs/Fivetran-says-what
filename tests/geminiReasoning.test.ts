import { describe, expect, it } from "vitest";
import { seedData } from "../server/data/seed";
import { buildForecast } from "../server/services/forecast";
import { createGeminiReasoningService } from "../server/services/geminiReasoning";

describe("Gemini reasoning service", () => {
  it("uses a deterministic fallback when GEMINI_API_KEY is absent", async () => {
    const service = createGeminiReasoningService({ apiKey: "", model: "gemini-3.5-flash" });
    const forecast = buildForecast(seedData, { budget: 2000 });

    const result = await service.reason({
      mission: "Prepare us for tomorrow's match-day surge with a $2,000 budget.",
      budget: 2000,
      data: seedData,
      forecast,
      connectors: seedData.connectors
    });

    expect(result.mode).toBe("deterministic");
    expect(result.plan.some((step) => step.includes("Fivetran MCP"))).toBe(true);
    expect(result.actionNarrative).toContain("Gemini fallback");
  });

  it("calls Gemini generateContent with thinking config when an API key is present", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init: init ?? {} });
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      plan: ["Check Fivetran MCP freshness", "Ask for approval", "Build action pack"],
                      actionNarrative: "Gemini planned a controlled operational response.",
                      riskNarrative: "Inventory freshness is the main risk.",
                      confidence: "high"
                    })
                  }
                ]
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };
    const service = createGeminiReasoningService({
      apiKey: "test-key",
      model: "gemini-3.5-flash",
      fetchImpl
    });

    const result = await service.reason({
      mission: "Prepare us for tomorrow's match-day surge with a $2,000 budget.",
      budget: 2000,
      data: seedData,
      forecast: buildForecast(seedData, { budget: 2000 }),
      connectors: seedData.connectors
    });

    expect(result.mode).toBe("live");
    expect(requests[0]?.url).toContain("gemini-3.5-flash:generateContent");
    expect(requests[0]?.init.headers).toMatchObject({ "x-goog-api-key": "test-key" });
    expect(JSON.parse(String(requests[0]?.init.body)).generationConfig.thinkingConfig.thinkingLevel).toBe("low");
  });

  it("falls back deterministically when the live Gemini endpoint is unavailable", async () => {
    const service = createGeminiReasoningService({
      apiKey: "test-key",
      model: "missing-model",
      fetchImpl: async () => new Response("not found", { status: 404 })
    });

    const result = await service.reason({
      mission: "Prepare us for tomorrow's match-day surge with a $2,000 budget.",
      budget: 2000,
      data: seedData,
      forecast: buildForecast(seedData, { budget: 2000 }),
      connectors: seedData.connectors
    });

    expect(result.mode).toBe("deterministic");
    expect(result.riskNarrative).toContain("Live Gemini unavailable");
  });

  it("retries transient Gemini service errors before falling back", async () => {
    let attempts = 0;
    const service = createGeminiReasoningService({
      apiKey: "test-key",
      model: "gemini-3.5-flash",
      retryDelayMs: 0,
      fetchImpl: async () => {
        attempts += 1;
        if (attempts === 1) {
          return new Response("temporarily unavailable", { status: 503 });
        }

        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        plan: ["Retry succeeded through Gemini"],
                        actionNarrative: "Gemini recovered after a transient failure.",
                        riskNarrative: "The mission can continue with live reasoning.",
                        confidence: "high"
                      })
                    }
                  ]
                }
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    });

    const result = await service.reason({
      mission: "Prepare us for tomorrow's match-day surge with a $2,000 budget.",
      budget: 2000,
      data: seedData,
      forecast: buildForecast(seedData, { budget: 2000 }),
      connectors: seedData.connectors
    });

    expect(attempts).toBe(2);
    expect(result.mode).toBe("live");
    expect(result.actionNarrative).toContain("recovered");
  });
});
