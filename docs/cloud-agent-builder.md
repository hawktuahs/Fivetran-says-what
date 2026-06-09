# Google Cloud Agent Builder Architecture

## Production Shape

SurgePilot's local app mirrors the cloud architecture expected for the hackathon:

1. Fivetran syncs POS, inventory, and staffing sources into BigQuery.
2. Google Cloud Agent Builder hosts the mission agent and exposes tools.
3. Gemini calls `generateContent` to plan the mission, choose tools, summarize evidence, and draft actions.
4. Fivetran MCP handles connector state, sync logs, and approved manual syncs.
5. The SurgePilot API stores mission state, approval gates, and audit events.
6. The React dashboard keeps the manager in control.

## Agent Tools

Recommended Agent Builder tools:

- `fivetran.listConnectors`: read connector inventory and status.
- `fivetran.getConnector`: inspect a specific connector.
- `fivetran.getSyncLogs`: summarize recent sync attempts.
- `fivetran.triggerSync`: approval-required connector refresh.
- `ops.buildForecast`: query BigQuery-derived operational data and calculate demand.
- `ops.createActionPack`: generate reorder, staffing, campaign, and supplier drafts.
- `ops.recordApproval`: commit manager-approved actions to the audit store.

## Implemented Prototype Wiring

The repository now contains two runnable integration paths:

- Gemini reasoning service: `server/services/geminiReasoning.ts`
  - Live mode uses `GEMINI_API_KEY` and `GEMINI_MODEL`.
  - Fallback mode is deterministic and labeled in the UI/audit trail.
- Fivetran MCP service: `server/services/fivetranMcp.ts`
  - Demo mode uses an in-process MCP-compatible tool client.
  - `server/mcp/fivetranDemoServer.ts` exposes a local demo MCP server for inspection.
  - Live configuration points to Fivetran's official `uvx --from git+https://github.com/fivetran/fivetran-mcp fivetran-mcp` server.

## Approval Semantics

The agent can read data without approval. It must ask for explicit approval before:

- triggering a Fivetran sync;
- sending supplier-facing copy;
- scheduling staffing changes;
- recording executable actions as approved.

This is what moves SurgePilot beyond chat while keeping the manager in the loop.

## BigQuery Data Model

Fivetran destinations should land in datasets such as:

- `ops.sales`
- `ops.inventory`
- `ops.staffing`
- `ops.suppliers`
- `ops.promotions`

The local seed data in `server/data/seed.ts` represents those tables for credential-free judging.

## Gemini Prompt Contract

The agent should follow this operating policy:

```text
Create a short plan before using tools.
Check data freshness before recommendations.
Use Fivetran MCP for connector state and sync actions.
Ask for approval before syncs or commits.
Use seeded or BigQuery-backed operational data for forecasts.
State missing sources and lower confidence when data is incomplete.
Write every tool call and approval to the audit trail.
```

## Environment

```bash
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash
FIVETRAN_API_KEY=...
FIVETRAN_API_SECRET=...
FIVETRAN_ALLOW_WRITES=false
```
