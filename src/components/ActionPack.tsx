import { Mail, Megaphone, PackageCheck, UsersRound } from "lucide-react";
import type { ActionPack as ActionPackType } from "../types";

interface ActionPackProps {
  actionPack?: ActionPackType;
}

function money(value = 0) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function ActionPack({ actionPack }: ActionPackProps) {
  return (
    <section className="panel action-pack" aria-label="Action pack">
      <div className="panel-heading">
        <div>
          <span className="label">Action pack</span>
          <h2>Ready for manager approval</h2>
        </div>
        <PackageCheck size={18} />
      </div>
      {!actionPack ? (
        <p className="empty-state">The action pack appears after Fivetran freshness is confirmed.</p>
      ) : (
        <>
          <div className="pack-summary">
            <span>{money(actionPack.expectedSpend)} spend</span>
            <span>{money(actionPack.expectedRevenue)} projected revenue</span>
          </div>
          <div className="action-grid">
            <div className="action-section">
              <h3>
                <PackageCheck size={16} />
                Reorder
              </h3>
              <div className="compact-table">
                {actionPack.reorderItems.slice(0, 6).map((item) => (
                  <div className="compact-row" key={item.sku}>
                    <span>{item.name}</span>
                    <strong>{item.reorderUnits} units</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="action-section">
              <h3>
                <UsersRound size={16} />
                Staffing
              </h3>
              <div className="compact-table">
                {actionPack.staffing.slice(2, 6).map((slot) => (
                  <div className="compact-row" key={slot.hour}>
                    <span>{slot.hour}:00</span>
                    <strong>{slot.gap ? `${slot.gap} gap` : "covered"}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="action-section text-action">
              <h3>
                <Megaphone size={16} />
                Campaign
              </h3>
              <p>{actionPack.campaignCopy}</p>
            </div>
            <div className="action-section text-action">
              <h3>
                <Mail size={16} />
                Supplier email
              </h3>
              <p>
                <strong>{actionPack.supplierEmail.subject}</strong>
                <br />
                {actionPack.supplierEmail.to}
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
