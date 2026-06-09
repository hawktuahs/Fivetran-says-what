# SurgePilot

SurgePilot is a Gemini-style match-day operations agent for small brick-and-mortar businesses near 2026 World Cup venues. A manager gives it an outcome-oriented mission, such as:

```text
Prepare us for tomorrow's match-day surge with a $2,000 budget.
```

The agent checks Fivetran MCP connector freshness, asks for approval before refreshing stale inventory data, forecasts demand, prepares a budget-bounded action pack, and records the approval trail.

## Hackathon Fit

SurgePilot targets the Fivetran partner track. Fivetran is not decorative here: the agent refuses to recommend reorder and staffing actions until the operational data pipeline is fresh enough to trust.

- Google Cloud Agent Builder: production orchestration path for the Gemini-powered agent.
- Gemini: reasoning, planning, and tool selection.
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

## Demo Flow

1. Run the default mission.
2. Notice the stale inventory connector in the Fivetran MCP panel.
3. Approve `Trigger Fivetran inventory sync`.
4. Review the generated forecast, reorder list, staffing recommendations, promotion copy, and supplier email.
5. Approve or reject the remaining actions and inspect the audit trail.

## Live Fivetran Path

The public demo uses a deterministic Fivetran adapter so judges can run it without private credentials. The live boundary is in `server/services/fivetranAdapter.ts`.

Set these environment variables before replacing the documented live stubs with MCP or REST-backed calls:

```bash
FIVETRAN_API_KEY=...
FIVETRAN_API_SECRET=...
```

The production tool contract should expose:

- `listConnectors`
- `getConnector`
- `getSyncLogs`
- `triggerSync`

Agent Builder can call those tools through the same approval-gated mission contract used by the local API.

## Scripts

```bash
corepack pnpm test
corepack pnpm lint
corepack pnpm build
```

## Devpost Checklist

- Select the Fivetran partner track.
- Include a hosted app URL.
- Include a public repository URL.
- Keep this MIT license visible.
- Upload a three-minute demo video.
- Explain how Google Cloud Agent Builder, Gemini, BigQuery, and Fivetran MCP work together.
