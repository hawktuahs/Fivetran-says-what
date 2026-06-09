import { ListChecks } from "lucide-react";
import type { MissionState } from "../types";

interface AgentTimelineProps {
  mission: MissionState;
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function AgentTimeline({ mission }: AgentTimelineProps) {
  return (
    <section className="panel timeline-panel" aria-label="Agent timeline">
      <div className="panel-heading">
        <div>
          <span className="label">Agent plan</span>
          <h2>Oversight loop</h2>
        </div>
        <ListChecks size={18} />
      </div>
      <ol className="plan-list">
        {mission.plan.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="audit-list">
        {mission.auditEvents.slice(-6).map((event) => (
          <article className="audit-row" key={event.id}>
            <span>{timeLabel(event.timestamp)}</span>
            <div>
              <strong>{event.tool}</strong>
              <p>{event.message}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
