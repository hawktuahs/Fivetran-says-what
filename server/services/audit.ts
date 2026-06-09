import type { AuditEvent } from "../types";

export function createAuditEvent(actor: AuditEvent["actor"], tool: string, message: string): AuditEvent {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    actor,
    tool,
    message
  };
}
