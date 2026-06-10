import { loadLocalEnv } from "../env";

loadLocalEnv({ override: true });

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const fallbackModels = (process.env.GEMINI_FALLBACK_MODELS ?? "gemini-2.5-flash")
  .split(",")
  .map((modelName) => modelName.trim())
  .filter(Boolean);
const modelCandidates = [model, ...fallbackModels].filter(
  (modelName, index, models) => modelName.length > 0 && models.indexOf(modelName) === index
);
const transientStatuses = new Set([408, 429, 500, 502, 503, 504]);

if (!apiKey) {
  console.error("GEMINI_API_KEY is missing.");
  process.exit(1);
}

let response: Response | undefined;
let lastError: unknown;
let activeModel = model;

for (const modelCandidate of modelCandidates) {
  activeModel = modelCandidate;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelCandidate}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Reply with exactly: ok" }] }]
        })
      });
    } catch (error) {
      lastError = error;
      if (attempt === 2) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
      continue;
    }

    if (!transientStatuses.has(response.status) || attempt === 2) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
  }

  if (response?.ok) {
    break;
  }
}

if (!response?.ok) {
  console.error(`Gemini model check failed for ${activeModel}: ${response?.status ?? "no response"}`);
  console.error(response ? await response.text() : lastError instanceof Error ? lastError.message : "No response returned.");
  process.exit(1);
}

const payload = (await response.json()) as {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};
const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();

console.log(`Gemini model check passed for ${activeModel}: ${text}`);
