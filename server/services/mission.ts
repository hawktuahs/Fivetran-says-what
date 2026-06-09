import type { ActionPack, ApprovalAction, AppState, MissionState, SeedData } from "../types";
import { buildForecast } from "./forecast";
import type { FivetranAdapter } from "./fivetranAdapter";
import { createAuditEvent } from "./audit";
import { createGeminiReasoningService, type GeminiReasoningService } from "./geminiReasoning";

const defaultPrompt = "Prepare us for tomorrow's match-day surge with a $2,000 budget.";

function parseBudget(prompt: string) {
  const match = prompt.match(/\$?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/);
  return match ? Number(match[1].replace(/,/g, "")) : 2000;
}

function createApproval(type: ApprovalAction["type"], title: string, reason: string, impact: string): ApprovalAction {
  return {
    id: `approval-${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    title,
    reason,
    impact,
    status: "pending"
  };
}

function buildActionPack(data: SeedData, budget: number): ActionPack {
  const forecast = buildForecast(data, { budget });
  const reorderItems = forecast.items.filter((item) => item.reorderUnits > 0);
  const primarySupplier = data.suppliers.find((supplier) => supplier.id === data.inventory[0]?.supplier) ?? data.suppliers[0];
  const topItems = reorderItems.slice(0, 4).map((item) => `${item.reorderUnits} ${item.name}`).join(", ");
  const campaignCopy = data.promotions[0]?.copy ?? "Match-day express menu ready before kickoff.";

  return {
    reorderItems,
    staffing: forecast.staffing,
    campaignCopy,
    supplierEmail: {
      to: primarySupplier.email,
      subject: `Rush order for ${data.businessName}`,
      body: `Hi ${primarySupplier.name},\n\nPlease confirm availability for ${topItems}. We are preparing for a World Cup match-day surge near ${data.location} and can receive delivery before your cutoff.\n\nThanks,\n${data.businessName}`
    },
    expectedSpend: forecast.totalRecommendedSpend,
    expectedRevenue: forecast.expectedRevenue
  };
}

function initialMission(connectors = [] as MissionState["connectors"]): MissionState {
  return {
    id: "mission-demo",
    prompt: defaultPrompt,
    status: "idle",
    budget: 2000,
    plan: [
      "Check Fivetran MCP connector freshness.",
      "Request approval before refreshing stale operational data.",
      "Forecast match-day demand and stockout risk.",
      "Prepare reorder, staffing, campaign, and supplier actions.",
      "Record manager approvals in the audit trail."
    ],
    connectors,
    pendingApprovals: [],
    auditEvents: [createAuditEvent("system", "demo.seed", "Loaded Harbor Line Cafe match-day scenario.")]
  };
}

function findConnectorForFreshnessGate(connectors: MissionState["connectors"]) {
  const stale = connectors.filter((connector) => connector.status !== "fresh");
  return (
    stale.find((connector) =>
      [connector.id, connector.name, connector.source, connector.destination].some((value) =>
        value.toLowerCase().includes("inventory")
      )
    ) ?? stale[0]
  );
}

export function createMissionService(
  data: SeedData,
  fivetran: FivetranAdapter,
  reasoningService: GeminiReasoningService = createGeminiReasoningService()
) {
  let mission = initialMission(data.connectors);

  async function refreshConnectors() {
    mission = {
      ...mission,
      connectors: await fivetran.listConnectors()
    };
  }

  function publish(): AppState {
    return {
      fivetranMode: fivetran.mode,
      fivetranTransport: fivetran.transport,
      geminiMode: reasoningService.mode,
      geminiModel: reasoningService.model,
      mission: {
        ...mission,
        connectors: mission.connectors.map((connector) => ({ ...connector })),
        pendingApprovals: mission.pendingApprovals.map((approval) => ({ ...approval })),
        auditEvents: mission.auditEvents.map((event) => ({ ...event })),
        reasoning: mission.reasoning ? { ...mission.reasoning } : undefined,
        actionPack: mission.actionPack
          ? {
              ...mission.actionPack,
              reorderItems: mission.actionPack.reorderItems.map((item) => ({ ...item })),
              staffing: mission.actionPack.staffing.map((item) => ({ ...item })),
              supplierEmail: { ...mission.actionPack.supplierEmail }
            }
          : undefined,
        forecast: mission.forecast
          ? {
              ...mission.forecast,
              items: mission.forecast.items.map((item) => ({ ...item })),
              staffing: mission.forecast.staffing.map((item) => ({ ...item }))
            }
          : undefined
      }
    };
  }

  async function completeActionPack() {
    const forecast = buildForecast(data, { budget: mission.budget });
    const reasoning = await reasoningService.reason({
      mission: mission.prompt,
      budget: mission.budget,
      data,
      forecast,
      connectors: mission.connectors
    });
    const actionPack = buildActionPack(data, mission.budget);
    mission = {
      ...mission,
      status: "awaiting_action_approval",
      forecast,
      reasoning: {
        mode: reasoning.mode,
        model: reasoning.model,
        actionNarrative: reasoning.actionNarrative,
        riskNarrative: reasoning.riskNarrative,
        confidence: reasoning.confidence
      },
      plan: reasoning.plan,
      actionPack,
      pendingApprovals: [
        ...mission.pendingApprovals,
        createApproval(
          "reorder",
          "Approve recommended reorder",
          "Demand exceeds current inventory on high-margin items.",
          `$${actionPack.expectedSpend.toFixed(0)} spend protects an estimated $${actionPack.expectedRevenue.toFixed(0)} in revenue.`
        ),
        createApproval("staffing", "Approve match-day staffing plan", "Peak demand clusters before kickoff.", "Adds coverage during 14:00-18:00 rush."),
        createApproval("campaign", "Approve express combo campaign", "Short promotion shifts fans to fast pickup items.", "Uses existing templates and no media spend."),
        createApproval("supplier_email", "Approve supplier email draft", "Suppliers need cutoff-aware confirmation.", "Prepares a send-ready rush order.")
      ],
      auditEvents: [
        ...mission.auditEvents,
        createAuditEvent(
          "agent",
          "gemini.generateContent",
          reasoning.mode === "live"
            ? `Gemini ${reasoning.model} generated the mission plan and action rationale.`
            : `Deterministic Gemini fallback generated the mission plan because live Gemini was not configured or was unavailable.`
        ),
        createAuditEvent("agent", "forecast.buildForecast", "Built budget-bounded match-day forecast and action pack.")
      ]
    };
  }

  return {
    async getState() {
      await refreshConnectors();
      return publish();
    },
    async startMission(prompt: string) {
      mission = {
        ...initialMission(data.connectors),
        prompt,
        status: "checking_data",
        budget: parseBudget(prompt),
        auditEvents: [
          createAuditEvent("manager", "mission.start", prompt),
          createAuditEvent("agent", "mcp.fivetran/list_connectors", "Checked Fivetran MCP connector freshness before recommending actions.")
        ]
      };
      await refreshConnectors();

      const staleInventory = findConnectorForFreshnessGate(mission.connectors);
      if (staleInventory) {
        mission = {
          ...mission,
          status: "awaiting_sync_approval",
          pendingApprovals: [
            createApproval(
              "sync",
              "Trigger Fivetran inventory sync",
              `${staleInventory.name} data is ${staleInventory.freshnessMinutes} minutes old.`,
              "Refreshes BigQuery inventory before Gemini creates operational actions."
            )
          ],
          auditEvents: [
            ...mission.auditEvents,
            createAuditEvent("agent", "mcp.fivetran/get_connector", "Inventory connector is stale, so sync requires manager approval.")
          ]
        };
        return mission;
      }

      await completeActionPack();
      return mission;
    },
    async approveAction(id: string) {
      const action = mission.pendingApprovals.find((approval) => approval.id === id);
      if (!action) {
        throw new Error(`Unknown approval action: ${id}`);
      }

      mission = {
        ...mission,
        pendingApprovals: mission.pendingApprovals.map((approval) =>
          approval.id === id ? { ...approval, status: "approved" } : approval
        ),
        auditEvents: [...mission.auditEvents, createAuditEvent("manager", `approval.${action.type}`, `Approved: ${action.title}`)]
      };

      if (action.type === "sync") {
        const connectorToSync = findConnectorForFreshnessGate(mission.connectors);
        mission = {
          ...mission,
          status: "forecasting",
          pendingApprovals: mission.pendingApprovals.filter((approval) => approval.id !== id),
          auditEvents: [...mission.auditEvents, createAuditEvent("agent", "mcp.fivetran/trigger_sync", "Triggered approved inventory sync through Fivetran MCP.")]
        };
        await fivetran.triggerSync(connectorToSync?.id ?? "inventory");
        await refreshConnectors();
        await completeActionPack();
      } else {
        mission = {
          ...mission,
          pendingApprovals: mission.pendingApprovals.filter((approval) => approval.id !== id),
          status: mission.pendingApprovals.filter((approval) => approval.id !== id && approval.status === "pending").length === 0 ? "completed" : mission.status
        };
      }

      return mission;
    },
    async rejectAction(id: string) {
      const action = mission.pendingApprovals.find((approval) => approval.id === id);
      if (!action) {
        throw new Error(`Unknown approval action: ${id}`);
      }
      mission = {
        ...mission,
        pendingApprovals: mission.pendingApprovals.filter((approval) => approval.id !== id),
        auditEvents: [...mission.auditEvents, createAuditEvent("manager", `approval.${action.type}`, `Rejected: ${action.title}`)]
      };
      return publish().mission;
    },
    async reset() {
      mission = initialMission(await fivetran.listConnectors());
      return publish();
    }
  };
}
