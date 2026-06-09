import { ChartNoAxesCombined, CircleDollarSign, TriangleAlert } from "lucide-react";
import type { MissionState } from "../types";

interface ForecastPanelProps {
  mission: MissionState;
}

function money(value = 0) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function ForecastPanel({ mission }: ForecastPanelProps) {
  const forecast = mission.forecast;
  const highRisk = forecast?.items.filter((item) => item.risk === "high").length ?? 0;

  return (
    <section className="panel forecast-panel" aria-label="Forecast summary">
      <div className="panel-heading">
        <div>
          <span className="label">Forecast</span>
          <h2>Surge risk summary</h2>
        </div>
        <ChartNoAxesCombined size={18} />
      </div>
      <div className="metric-grid">
        <div className="metric">
          <CircleDollarSign size={18} />
          <span>Recommended spend</span>
          <strong>{money(forecast?.totalRecommendedSpend)}</strong>
        </div>
        <div className="metric">
          <CircleDollarSign size={18} />
          <span>Protected revenue</span>
          <strong>{money(forecast?.expectedRevenue)}</strong>
        </div>
        <div className="metric">
          <TriangleAlert size={18} />
          <span>High-risk SKUs</span>
          <strong>{highRisk}</strong>
        </div>
      </div>
      <p className="forecast-summary">
        {forecast?.summary ?? "Run the mission and approve stale-data refresh before recommendations are generated."}
      </p>
      <div className="risk-table" role="table" aria-label="Top inventory risks">
        <div className="table-row table-head" role="row">
          <span>Item</span>
          <span>Demand</span>
          <span>Stock</span>
          <span>Risk</span>
        </div>
        {(forecast?.items.slice(0, 6) ?? []).map((item) => (
          <div className="table-row" role="row" key={item.sku}>
            <span>{item.name}</span>
            <span>{item.expectedDemand}</span>
            <span>{item.unitsOnHand}</span>
            <span className={`risk-pill risk-${item.risk}`}>{item.risk}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
