# SurgePilot

SurgePilot is a Gemini-powered match-day operations agent for small brick-and-mortar businesses near 2026 World Cup venues. A manager gives it an outcome-oriented mission, such as:

```text
Prepare us for tomorrow's match-day surge with a $2,000 budget.
```

The agent checks Fivetran MCP connector freshness, asks for approval before refreshing stale inventory data, calls Gemini reasoning for the mission plan and action rationale when `GEMINI_API_KEY` is configured, forecasts demand, prepares a budget-bounded action pack, and records the approval trail.

## Hackathon Fit

SurgePilot targets the Fivetran partner track. Fivetran is not decorative here: the agent refuses to recommend reorder and staffing actions until the operational data pipeline is fresh enough to trust.

- Google Cloud Agent Builder: production orchestration path for the Gemini-powered agent.
- Gemini API: `generateContent` mission reasoning with thinking configuration.
- Fivetran MCP: connector inspection, sync-log review, and approved sync actions.
- BigQuery: intended cloud destination for POS, inventory, and staffing data.
- Human oversight: syncs and executable actions require manager approval.

## Local Demo

Install dependencies:

```bash
corepack pnpm install
```

Run the API and dashboard:

```bash
corepack pnpm dev
```

Open the Vite URL, usually `http://127.0.0.1:5173`.

The local demo is fully runnable without private credentials. In that mode:

- Gemini runs in an explicit deterministic fallback mode and the UI says `Gemini fallback`.
- Fivetran runs through the local demo MCP transport and the UI says `Fivetran MCP demo`.
- The mission still exercises the end-to-end approval loop: MCP freshness check, sync approval, forecast, action pack, and audit trail.

## Live Gemini

Copy `.env.example` to `.env` and set:

```bash
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash
```

When the key is present, the server calls Gemini's `generateContent` endpoint with a thinking configuration to create the mission plan, action rationale, risk narrative, and confidence label. If the live endpoint fails during a demo, SurgePilot falls back deterministically and records that fallback in the audit trail instead of crashing.

## MCP Demo Server

Run the local demo MCP server:

```bash
corepack pnpm mcp:fivetran:demo
```

It supports:

- `initialize`
- `tools/list`
- `tools/call` for `fivetran.list_connectors`
- `tools/call` for `fivetran.get_connector`
- `tools/call` for `fivetran.get_sync_logs`
- `tools/call` for `fivetran.trigger_sync`

## Demo Flow

1. Run the default mission.
2. Notice the stale inventory connector in the Fivetran MCP panel.
3. Approve `Trigger Fivetran inventory sync`.
4. Review the generated forecast, reorder list, staffing recommendations, promotion copy, and supplier email.
5. Approve or reject the remaining actions and inspect the audit trail.

## Live Fivetran MCP Path

The public demo uses a deterministic Fivetran MCP client so judges can run it without private credentials. The live boundary is in `server/services/fivetranMcp.ts`.

The official Fivetran MCP command documented by Fivetran is:

```bash
uvx --from git+https://github.com/fivetran/fivetran-mcp fivetran-mcp
```

Set these environment variables before using the official server:

```bash
FIVETRAN_API_KEY=...
FIVETRAN_API_SECRET=...
FIVETRAN_ALLOW_WRITES=false
```

The production MCP tool contract should expose:

- `listConnectors`
- `getConnector`
- `getSyncLogs`
- `triggerSync`

Agent Builder can call those tools through the same approval-gated mission contract used by the local API. Keep writes disabled until you are ready to demo an approved sync.

## Scripts

```bash
corepack pnpm test
corepack pnpm lint
corepack pnpm build
corepack pnpm mcp:fivetran:demo
```

## Devpost Checklist

- Select the Fivetran partner track.
- Include a hosted app URL.
- Include a public repository URL.
- Keep this MIT license visible.
- Upload a three-minute demo video.
- Explain how Google Cloud Agent Builder, Gemini, BigQuery, and Fivetran MCP work together.

## Remaining Production Work

This is a functional hackathon prototype, not a fully deployed production system. Before real-world use, connect the official Fivetran MCP server to an actual Fivetran account, put the API behind auth, replace seeded data with BigQuery tables, and add durable audit/action storage.
