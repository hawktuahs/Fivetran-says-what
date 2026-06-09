import { Check, ShieldCheck, X } from "lucide-react";
import type { ApprovalAction } from "../types";

interface ApprovalQueueProps {
  approvals: ApprovalAction[];
  busy: boolean;
  onApprove(id: string): void;
  onReject(id: string): void;
}

export function ApprovalQueue({ approvals, busy, onApprove, onReject }: ApprovalQueueProps) {
  const pending = approvals.filter((approval) => approval.status === "pending");

  return (
    <section className="panel" aria-label="Approval queue">
      <div className="panel-heading">
        <div>
          <span className="label">Approval queue</span>
          <h2>{pending.length ? `${pending.length} pending` : "Clear"}</h2>
        </div>
        <ShieldCheck size={18} />
      </div>
      <div className="approval-list">
        {pending.length === 0 ? (
          <p className="empty-state">No pending actions. The agent will pause here before any sync or commit action.</p>
        ) : (
          pending.map((approval) => (
            <article className="approval-row" key={approval.id}>
              <h3>{approval.title}</h3>
              <p>{approval.reason}</p>
              <span>{approval.impact}</span>
              <div className="button-row approval-actions">
                <button className="approve-button" type="button" disabled={busy} onClick={() => onApprove(approval.id)}>
                  <Check size={15} />
                  Approve
                </button>
                <button className="reject-button" type="button" disabled={busy} onClick={() => onReject(approval.id)}>
                  <X size={15} />
                  Reject
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
