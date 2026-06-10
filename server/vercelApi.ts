import type { IncomingMessage } from "node:http";

type ConnectorStatus = "fresh" | "stale" | "syncing";
type MissionStatus = "idle" | "awaiting_sync_approval" | "awaiting_action_approval" | "completed";
type ApprovalType = "sync" | "reorder" | "staffing" | "campaign" | "supplier_email";

interface ApprovalAction {
  id: string;
  type: ApprovalType;
  title: string;
  reason: string;
  impact: string;
  status: "pending" | "approved" | "rejected";
}

interface Connector {
  id: string;
  name: string;
  source: string;
  destination: string;
  status: ConnectorStatus;
  lastSyncAt: string;
  recordsSynced: number;
  freshnessMinutes: number;
}

const now = () => new Date().toISOString();
const recent = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();

const baseConnectors: Connector[] = [
  {
    id: "google-drive",
    name: "Google Drive operations folder",
    source: "Google Drive",
    destination: "Supabase Postgres surgepilot_ops",
    status: "stale",
    lastSyncAt: recent(178),
    recordsSynced: 144,
    freshnessMinutes: 178
  },
  {
    id: "fivetran-metadata",
    name: "Fivetran metadata",
    source: "Fivetran Platform Connector",
    destination: "Supabase Postgres fivetran_metadata",
    status: "fresh",
    lastSyncAt: recent(9),
    recordsSynced: 38,
    freshnessMinutes: 9
  }
];

const forecastItems = [
  { sku: "cold-brew-1l", name: "Cold brew growler", expectedDemand: 580, unitsOnHand: 38, reorderUnits: 132, estimatedCost: 726, expectedRevenue: 1848, risk: "high" },
  { sku: "iced-latte", name: "Iced latte cup", expectedDemand: 541, unitsOnHand: 64, reorderUnits: 120, estimatedCost: 336, expectedRevenue: 960, risk: "high" },
  { sku: "sparkling-water", name: "Sparkling water", expectedDemand: 520, unitsOnHand: 52, reorderUnits: 96, estimatedCost: 105.6, expectedRevenue: 384, risk: "high" },
  { sku: "empanada", name: "Chicken empanada", expectedDemand: 360, unitsOnHand: 46, reorderUnits: 72, estimatedCost: 162, expectedRevenue: 504, risk: "high" },
  { sku: "veggie-wrap", name: "Veggie wrap", expectedDemand: 330, unitsOnHand: 22, reorderUnits: 48, estimatedCost: 153.6, expectedRevenue: 432, risk: "high" },
  { sku: "protein-bar", name: "Protein bar", expectedDemand: 310, unitsOnHand: 58, reorderUnits: 72, estimatedCost: 100.8, expectedRevenue: 360, risk: "high" },
  { sku: "team-scarf", name: "Blue team scarf", expectedDemand: 120, unitsOnHand: 14, reorderUnits: 20, estimatedCost: 180, expectedRevenue: 480, risk: "high" },
  { sku: "receipt-roll", name: "Receipt roll", expectedDemand: 18, unitsOnHand: 6, reorderUnits: 10, estimatedCost: 15, expectedRevenue: 0, risk: "high" }
] as const;

function audit(actor: "agent" | "manager" | "system", tool: string, message: string) {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: now(),
    actor,
    tool,
    message
  };
}

function approval(type: ApprovalType, title: string, reason: string, impact: string): ApprovalAction {
  return {
    id: `approval-${type}`,
    type,
    title,
    reason,
    impact,
    status: "pending"
  };
}

function buildForecast() {
  return {
    items: forecastItems,
    totalRecommendedSpend: 1779,
    expectedRevenue: 4968,
    confidence: "medium",
    staffing: [
      { hour: 14, role: "barista", needed: 3, scheduled: ["Ana", "Marco"], gap: 1 },
      { hour: 15, role: "cashier", needed: 3, scheduled: ["Dev", "Lena"], gap: 1 },
      { hour: 16, role: "runner", needed: 2, scheduled: ["Ivy", "Sam"], gap: 0 }
    ],
    summary: "Harbor Line Cafe should prioritize 8 high-risk items before kickoff."
  };
}

function buildActionPack() {
  const forecast = buildForecast();
  return {
    reorderItems: forecast.items,
    staffing: forecast.staffing,
    campaignCopy: "Match-day express combo: cold brew plus empanada ready for the walk to the stadium.",
    supplierEmail: {
      to: "orders@harborroasters.example",
      subject: "Rush order for Harbor Line Cafe",
      body: "Hi Harbor Roasters,\n\nPlease confirm availability for cold brew growlers and iced latte cups before the match-day rush.\n\nThanks,\nHarbor Line Cafe"
    },
    expectedSpend: forecast.totalRecommendedSpend,
    expectedRevenue: forecast.expectedRevenue
  };
}

async function reason(prompt: string) {
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const fallbackModel = process.env.GEMINI_FALLBACK_MODELS?.split(",")[0]?.trim() || "gemini-2.5-flash";
  const apiKey = process.env.GEMINI_API_KEY;
  const fallback = {
    mode: apiKey ? "live" : "deterministic",
    model: apiKey ? fallbackModel : model,
    actionNarrative: "Gemini-guided plan protects cold brew first while staying under the $2,000 budget.",
    riskNarrative: "Fresh Fivetran data gates reorder and staffing decisions before manager-approved actions.",
    confidence: "medium"
  };

  if (!apiKey) {
    return fallback;
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Create a concise action rationale for this retail operations mission: ${prompt}`
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    return {
      ...fallback,
      model,
      actionNarrative: text || fallback.actionNarrative
    };
  } catch {
    return fallback;
  }
}

function initialMission() {
  return {
    id: "mission-demo",
    prompt: "Prepare us for tomorrow's match-day surge with a $2,000 budget.",
    status: "idle" as MissionStatus,
    budget: 2000,
    plan: [
      "Check Fivetran MCP connector freshness.",
      "Request approval before refreshing stale operational data.",
      "Forecast match-day demand and stockout risk.",
      "Prepare reorder, staffing, campaign, and supplier actions.",
      "Record manager approvals in the audit trail."
    ],
    connectors: baseConnectors.map((connector) => ({ ...connector })),
    pendingApprovals: [] as ApprovalAction[],
    auditEvents: [audit("system", "demo.seed", "Loaded Harbor Line Cafe match-day scenario.")]
  };
}

let mission: Record<string, unknown> & ReturnType<typeof initialMission> = initialMission();

function publish() {
  return {
    fivetranMode: "demo",
    fivetranTransport: "mcp-demo",
    geminiMode: process.env.GEMINI_API_KEY ? "live" : "deterministic",
    geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash",
    mission
  };
}

async function completeMission() {
  const forecast = buildForecast();
  const gemini = await reason(mission.prompt);
  const actionPack = buildActionPack();

  mission = {
    ...mission,
    status: "awaiting_action_approval",
    forecast,
    reasoning: gemini,
    actionPack,
    plan: [
      "Verify Google Drive data freshness through Fivetran MCP.",
      "Use Gemini to convert the manager mission into a concrete action plan.",
      "Prioritize high-risk items by margin, lead time, and stockout exposure.",
      "Ask the manager to approve each operational side effect."
    ],
    pendingApprovals: [
      approval("reorder", "Approve recommended reorder", "Demand exceeds current inventory on high-margin items.", "$1,779 spend protects an estimated $4,968 in revenue."),
      approval("staffing", "Approve match-day staffing plan", "Peak demand clusters before kickoff.", "Adds coverage during the 14:00-18:00 rush."),
      approval("campaign", "Approve express combo campaign", "Short promotion shifts fans to fast pickup items.", "Uses existing templates and no media spend."),
      approval("supplier_email", "Approve supplier email draft", "Suppliers need cutoff-aware confirmation.", "Prepares a send-ready rush order.")
    ],
    auditEvents: [
      ...mission.auditEvents,
      audit("agent", "gemini.generateContent", "Generated the mission plan and action rationale."),
      audit("agent", "forecast.buildForecast", "Built budget-bounded match-day forecast and action pack.")
    ]
  };
}

export const vercelMissionService = {
  async getState() {
    return publish();
  },
  async startMission(prompt: string) {
    mission = {
      ...initialMission(),
      prompt,
      status: "awaiting_sync_approval",
      auditEvents: [
        audit("manager", "mission.start", prompt),
        audit("agent", "mcp.fivetran/list_connectors", "Checked Fivetran MCP connector freshness before recommending actions."),
        audit("agent", "mcp.fivetran/get_connector", "Google Drive connector is stale, so sync requires manager approval.")
      ],
      pendingApprovals: [
        approval("sync", "Trigger Fivetran data sync", "Google Drive operations data is 178 minutes old.", "Refreshes destination data before Gemini creates operational actions.")
      ]
    };
    return mission;
  },
  async approveAction(id: string) {
    const action = mission.pendingApprovals.find((item) => item.id === id);
    const fallbackType = id.replace("approval-", "") as ApprovalType;
    const actionType = action?.type ?? fallbackType;

    if (!action && !["sync", "reorder", "staffing", "campaign", "supplier_email"].includes(actionType)) {
      throw new Error(`Unknown approval action: ${id}`);
    }

    if (actionType === "sync") {
      mission = {
        ...mission,
        connectors: mission.connectors.map((connector) =>
          connector.id === "google-drive"
            ? { ...connector, status: "fresh", freshnessMinutes: 2, lastSyncAt: recent(2), recordsSynced: connector.recordsSynced + 147 }
            : connector
        ),
        pendingApprovals: mission.pendingApprovals.filter((item) => item.id !== id),
        auditEvents: [...mission.auditEvents, audit("agent", "mcp.fivetran/trigger_sync", "Triggered approved data sync through Fivetran MCP.")]
      };
      await completeMission();
      return mission;
    }

    mission = {
      ...mission,
      pendingApprovals: mission.pendingApprovals.filter((item) => item.id !== id),
      status: mission.pendingApprovals.length <= 1 ? "completed" : mission.status,
      auditEvents: [...mission.auditEvents, audit("manager", `approval.${actionType}`, `Approved: ${action?.title ?? id}`)]
    };
    return mission;
  },
  async rejectAction(id: string) {
    const action = mission.pendingApprovals.find((item) => item.id === id);
    mission = {
      ...mission,
      pendingApprovals: mission.pendingApprovals.filter((item) => item.id !== id),
      auditEvents: [...mission.auditEvents, audit("manager", `approval.${action?.type ?? "unknown"}`, `Rejected: ${action?.title ?? id}`)]
    };
    return mission;
  },
  async reset() {
    mission = initialMission();
    return publish();
  }
};

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
