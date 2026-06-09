import { CheckCircle2, Clock3, Database, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { Connector, ConnectorStatus } from "../types";

interface FivetranPanelProps {
  connectors: Connector[];
}

const statusIcon: Record<ConnectorStatus, ReactNode> = {
  fresh: <CheckCircle2 size={16} />,
  stale: <TriangleAlert size={16} />,
  syncing: <Clock3 size={16} />,
  failed: <TriangleAlert size={16} />
};

export function FivetranPanel({ connectors }: FivetranPanelProps) {
  return (
    <section className="panel" aria-label="Fivetran connector freshness">
      <div className="panel-heading">
        <div>
          <span className="label">Fivetran MCP</span>
          <h2>Data freshness</h2>
        </div>
        <Database size={18} />
      </div>
      <div className="connector-list">
        {connectors.map((connector) => (
          <article className={`connector-row connector-${connector.status}`} key={connector.id}>
            <div className="connector-status">{statusIcon[connector.status]}</div>
            <div>
              <h3>{connector.name}</h3>
              <p>{connector.source}</p>
              <span>{connector.destination}</span>
            </div>
            <div className="connector-meta">
              <strong>{connector.status}</strong>
              <span>{connector.freshnessMinutes}m</span>
              <span>{connector.recordsSynced.toLocaleString()} rows</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
