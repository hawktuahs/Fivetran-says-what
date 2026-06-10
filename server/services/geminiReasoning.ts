import type { Connector, ForecastResult, SeedData } from "../types";

export type GeminiReasoningMode = "live" | "deterministic";

export interface GeminiReasoningInput {
  mission: string;
  budget: number;
  data: SeedData;
  forecast: ForecastResult;
  connectors: Connector[];
}

export interface GeminiReasoningResult {
  mode: GeminiReasoningMode;
  model: string;
  plan: string[];
  actionNarrative: string;
  riskNarrative: string;
  confidence: "low" | "medium" | "high";
}

export interface GeminiReasoningService {
  mode: GeminiReasoningMode;
  model: string;
  reason(input: GeminiReasoningInput): Promise<GeminiReasoningResult>;
}

interface GeminiServiceOptions {
  apiKey?: string;
  model?: string;
  fallbackModels?: string[];
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  retryDelayMs?: number;
  requestTimeoutMs?: number;
}

interface GeminiPayload {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

const defaultModel = "gemini-3.5-flash";
const transientStatuses = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uniqueModels(models: string[]) {
  return models.filter((modelName, index) => modelName.length > 0 && models.indexOf(modelName) === index);
}

function parseFallbackModels() {
  return (process.env.GEMINI_FALLBACK_MODELS ?? "gemini-2.5-flash")
    .split(",")
    .map((modelName) => modelName.trim())
    .filter(Boolean);
}

function deterministicReasoning(input: GeminiReasoningInput, model: string): GeminiReasoningResult {
  const stale = input.connectors.filter((connector) => connector.status !== "fresh");
  const highRiskItems = input.forecast.items.filter((item) => item.risk === "high");
  const topItem = highRiskItems[0] ?? input.forecast.items[0];

  return {
    mode: "deterministic",
    model,
    plan: [
      "Use Gemini fallback reasoning to parse the manager mission and budget.",
      "Use Fivetran MCP to verify connector freshness before operational actions.",
      stale.length
        ? "Pause for manager approval before refreshing stale Fivetran connectors."
        : "Proceed because all required Fivetran connectors are fresh.",
      "Build a budget-bounded action pack from forecast, inventory, staffing, and supplier constraints.",
      "Ask the manager to approve every sync, reorder, staffing, campaign, and supplier email action."
    ],
    actionNarrative: `Gemini fallback recommends protecting ${topItem?.name ?? "high-risk inventory"} first while staying under the $${input.budget.toLocaleString()} budget.`,
    riskNarrative: stale.length
      ? `${stale.map((connector) => connector.name).join(", ")} is stale, so recommendations should wait for an approved Fivetran MCP sync.`
      : `${highRiskItems.length} high-risk SKUs remain after freshness checks; reorder decisions should prioritize margin and lead time.`,
    confidence: stale.length ? "medium" : input.forecast.confidence
  };
}

function buildPrompt(input: GeminiReasoningInput) {
  const connectorSummary = input.connectors
    .map((connector) => `${connector.name}: ${connector.status}, ${connector.freshnessMinutes} minutes old`)
    .join("; ");
  const topItems = input.forecast.items
    .slice(0, 6)
    .map((item) => `${item.name}: demand ${item.expectedDemand}, stock ${item.unitsOnHand}, reorder ${item.reorderUnits}, risk ${item.risk}`)
    .join("; ");

  return [
    `Mission: ${input.mission}`,
    `Business: ${input.data.businessName}, ${input.data.location}`,
    `Budget: $${input.budget}`,
    `Event: ${input.data.match.venue}, expected attendance ${input.data.match.expectedAttendance}`,
    `Fivetran MCP connectors: ${connectorSummary}`,
    `Forecast: ${input.forecast.summary}`,
    `Top inventory signals: ${topItems}`,
    "Return strict JSON with keys plan, actionNarrative, riskNarrative, confidence.",
    "The plan must mention Fivetran MCP and manager approval gates."
  ].join("\n");
}

function parseGeminiText(payload: GeminiPayload) {
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
}

function parseReasoning(text: string, input: GeminiReasoningInput, model: string): GeminiReasoningResult {
  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Partial<GeminiReasoningResult>;
    return {
      mode: "live",
      model,
      plan: Array.isArray(parsed.plan) && parsed.plan.length > 0 ? parsed.plan : deterministicReasoning(input, model).plan,
      actionNarrative: parsed.actionNarrative ?? deterministicReasoning(input, model).actionNarrative,
      riskNarrative: parsed.riskNarrative ?? deterministicReasoning(input, model).riskNarrative,
      confidence: parsed.confidence === "low" || parsed.confidence === "medium" || parsed.confidence === "high" ? parsed.confidence : "medium"
    };
  } catch {
    return {
      ...deterministicReasoning(input, model),
      mode: "live",
      actionNarrative: text || deterministicReasoning(input, model).actionNarrative
    };
  }
}

export function createGeminiReasoningService(options: GeminiServiceOptions = {}): GeminiReasoningService {
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY ?? "";
  const model = options.model ?? process.env.GEMINI_MODEL ?? defaultModel;
  const modelCandidates = uniqueModels([model, ...(options.fallbackModels ?? parseFallbackModels())]);
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxRetries = options.maxRetries ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 500;
  const requestTimeoutMs = options.requestTimeoutMs ?? 20_000;

  if (!apiKey) {
    return {
      mode: "deterministic",
      model,
      async reason(input) {
        return deterministicReasoning(input, model);
      }
    };
  }

  return {
    mode: "live",
    model,
    async reason(input) {
      try {
        let response: Response | undefined;
        let lastError: unknown;
        let activeModel = model;

        for (const modelCandidate of modelCandidates) {
          activeModel = modelCandidate;

          for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
            try {
              response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${modelCandidate}:generateContent`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-goog-api-key": apiKey
                },
                signal: AbortSignal.timeout(requestTimeoutMs),
                body: JSON.stringify({
                  system_instruction: {
                    parts: [
                      {
                        text: "You are SurgePilot, an operations agent. Plan concrete actions, use Fivetran MCP as the data freshness gate, and require manager approval before side effects."
                      }
                    ]
                  },
                  contents: [{ parts: [{ text: buildPrompt(input) }] }],
                  generationConfig: {
                    responseMimeType: "application/json",
                    thinkingConfig: {
                      thinkingLevel: "low"
                    }
                  }
                })
              });
            } catch (error) {
              lastError = error;
              if (attempt === maxRetries) {
                break;
              }
              await sleep(retryDelayMs * (attempt + 1));
              continue;
            }

            if (!transientStatuses.has(response.status) || attempt === maxRetries) {
              break;
            }

            await sleep(retryDelayMs * (attempt + 1));
          }

          if (response?.ok) {
            break;
          }
        }

        if (!response?.ok) {
          const fallback = deterministicReasoning(input, activeModel);
          return {
            ...fallback,
            riskNarrative: `Live Gemini unavailable (${response?.status ?? (lastError instanceof Error ? lastError.message : "no response")}); ${fallback.riskNarrative}`
          };
        }

        return parseReasoning(parseGeminiText((await response.json()) as GeminiPayload), input, activeModel);
      } catch (error) {
        const fallback = deterministicReasoning(input, model);
        return {
          ...fallback,
          riskNarrative: `Live Gemini unavailable (${error instanceof Error ? error.message : "unknown error"}); ${fallback.riskNarrative}`
        };
      }
    }
  };
}
