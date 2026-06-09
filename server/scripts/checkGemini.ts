import { loadLocalEnv } from "../env";

loadLocalEnv({ override: true });

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const timeout = AbortSignal.timeout(15_000);

if (!apiKey) {
  console.error("GEMINI_API_KEY is missing.");
  process.exit(1);
}

let response: Response;

try {
  response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    signal: timeout,
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Reply with exactly: ok" }] }]
    })
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  console.error(`Gemini model check could not reach Google for ${model}.`);
  console.error(message);
  console.error("Check your internet connection, VPN/firewall, and then rerun: corepack pnpm check:gemini");
  process.exit(1);
}

if (!response.ok) {
  console.error(`Gemini model check failed for ${model}: ${response.status}`);
  console.error(await response.text());
  process.exit(1);
}

const payload = (await response.json()) as {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};
const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();

console.log(`Gemini model check passed for ${model}: ${text}`);
