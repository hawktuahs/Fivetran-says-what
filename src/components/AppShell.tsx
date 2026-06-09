import { Activity, DatabaseZap } from "lucide-react";
import type { AppState } from "../types";
import { ActionPack } from "./ActionPack";
import { AgentTimeline } from "./AgentTimeline";
import { ApprovalQueue } from "./ApprovalQueue";
import { FivetranPanel } from "./FivetranPanel";
import { ForecastPanel } from "./ForecastPanel";
import { MissionComposer } from "./MissionComposer";

interface AppShellProps {
  state: AppState;
  busy: boolean;
  error?: string;
  onStartMission(prompt: string): void;
  onApprove(id: string): void;
  onReject(id: string): void;
  onReset(): void;
}

export function AppShell({ state, busy, error, onStartMission, onApprove, onReject, onReset }: AppShellProps) {
  return (
    <main className="dashboard">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <DatabaseZap size={18} />
          </span>
          <div>
          <h1>SurgePilot</h1>
            <p>Gemini + Fivetran MCP operations agent.</p>
          </div>
        </div>
        <div className="topbar-status">
          <span className="mode-chip">
            {state.mission.reasoning?.mode === "deterministic"
              ? "Gemini fallback"
              : state.geminiMode === "live"
                ? "Gemini API configured"
                : "Gemini fallback"}{" "}
            · {state.geminiModel}
          </span>
          <span className="mode-chip">{state.fivetranTransport === "mcp-demo" ? "Fivetran MCP demo" : "Fivetran MCP live"}</span>
          <span className={`status-chip status-${state.mission.status}`}>
            <Activity size={14} />
            {state.mission.status.replaceAll("_", " ")}
          </span>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="workspace">
        <div className="rail rail-left">
          <MissionComposer
            prompt={state.mission.prompt}
            budget={state.mission.budget}
            mode={state.fivetranMode}
            busy={busy}
            onStartMission={onStartMission}
            onReset={onReset}
          />
          <AgentTimeline mission={state.mission} />
        </div>

        <div className="rail rail-main">
          <ForecastPanel mission={state.mission} />
          <ActionPack actionPack={state.mission.actionPack} />
        </div>

        <div className="rail rail-right">
          <FivetranPanel connectors={state.mission.connectors} />
          <ApprovalQueue
            approvals={state.mission.pendingApprovals}
            busy={busy}
            onApprove={onApprove}
            onReject={onReject}
          />
        </div>
      </section>
    </main>
  );
}
