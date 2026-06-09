# SurgePilot Design Spec

## Product Thesis

SurgePilot is a Gemini-powered match-day operations agent for small brick-and-mortar businesses near 2026 World Cup venues. A cafe, restaurant, kiosk, or retail manager gives the agent an outcome-oriented mission such as:

> Prepare us for tomorrow's match-day surge with a $2,000 budget.

The agent does not merely explain what to do. It checks whether operational data is fresh, uses Fivetran MCP to inspect and trigger data syncs, analyzes demand against local event conditions, drafts an action pack, and waits for manager approval before executing approved actions.

## Hackathon Fit

SurgePilot targets the Fivetran partner track because Fivetran's role is central rather than decorative: the agent's first responsibility is to make sure it is acting on trusted, recently synced data. Fivetran MCP gives the agent operational control over the data pipeline, including connector inspection, freshness checks, sync log review, and resync requests.

The product aligns with the hackathon goals:

- Move beyond chat: the agent runs tools, checks pipelines, queries data, creates action packs, and records approved actions.
- Multi-step mission: the agent plans and performs a sequence of data, analysis, recommendation, approval, and execution steps.
- Partner power: Fivetran MCP is the data reliability layer that makes the rest of the mission credible.
- Google Cloud Agent Builder: Gemini handles planning and reasoning, while Agent Builder exposes tools and routes the mission.
- Real-world impact: small businesses near large events often lose revenue through stockouts, overstaffing, understaffing, and late promotions.

## Target User

The primary user is an owner-manager of a small business near a World Cup venue. They have limited time, basic operational data, and immediate pressure to prepare for unusual demand spikes. They need a practical plan with enough explanation to trust it, but they do not want to inspect dashboards, spreadsheets, and supplier notes manually.

## Core Scenario

The demo mission uses a fictional cafe near a World Cup stadium district:

1. The manager asks SurgePilot to prepare for tomorrow's high-demand match day.
2. SurgePilot checks Fivetran connector status and discovers inventory data is stale.
3. SurgePilot asks for approval to refresh the connector.
4. After approval, it triggers a Fivetran sync and verifies the data is fresh.
5. It analyzes sales, inventory, staffing, weather, event timing, supplier lead times, and budget.
6. It creates an action pack:
   - reorder quantities by item;
   - staffing adjustments by hour;
   - risk alerts for likely stockouts;
   - a short promotional campaign;
   - supplier email drafts;
   - expected revenue upside and budget use.
7. The manager approves selected actions.
8. SurgePilot records the approved actions and updates the dashboard audit trail.

## Agent Behavior

The agent must operate in a controlled, auditable loop:

- Understand the mission and extract constraints such as date, budget, business type, and event context.
- Create a short plan before using tools.
- Check data freshness before making recommendations.
- Use Fivetran MCP tools for connector and sync operations.
- Ask for approval before triggering syncs or recording executable actions.
- Produce concise recommendations with supporting evidence.
- Preserve an audit trail of tool calls, decisions, approvals, and outputs.

The agent should avoid unsupported claims. If a source is missing, it should state the missing source and either request approval to continue with seeded demo data or propose a fallback.

## Tools And Data

### Fivetran MCP Tools

The production path uses the Fivetran MCP server to provide:

- connector inventory;
- connector status;
- last sync timestamps;
- sync log inspection;
- manual resync trigger.

For local development and judge-friendly demos, the app includes a Fivetran adapter interface with two implementations:

- Live adapter: calls the real Fivetran MCP/REST-backed integration when credentials are present.
- Demo adapter: deterministic mock that simulates connector status, stale data, sync progress, and final freshness.

The demo adapter exists only to make the public repo runnable without private credentials. The README must clearly explain how to switch to live Fivetran.

### Operational Data

The demo app uses seeded data sets:

- sales history by item and hour;
- current inventory;
- supplier lead times and pack sizes;
- staff availability and hourly labor cost;
- local match schedule;
- weather conditions;
- promotion templates;
- approved action log.

The target cloud architecture loads source data through Fivetran into BigQuery. The local implementation can use JSON fixtures or SQLite to keep the demo deterministic while documenting the BigQuery path.

## User Experience

The first screen is the usable operations console, not a marketing landing page.

The dashboard includes:

- mission input;
- agent plan and current step;
- data freshness panel showing Fivetran connector state;
- forecast and risk summary;
- action approval queue;
- generated supplier email and promotion copy;
- audit trail of tool calls and approvals.

The visual tone should feel operational, fast, and trustworthy. It should avoid a generic AI chat surface. The agent transcript is present, but the main UI is built around actions, status, and approvals.

## Architecture

The repo should be a full-stack web app:

- Next.js or Vite React frontend for the dashboard.
- API layer for mission execution and tool orchestration.
- Agent service that models the planning loop and exposes the same contract Google Cloud Agent Builder callbacks will use.
- Fivetran adapter boundary for live or demo MCP-backed data-pipeline actions.
- Data service for seeded operational data and forecast calculations.
- Audit store for tool calls, approvals, and generated artifacts.

The local app should demonstrate the full flow without requiring paid credentials. The cloud deployment path should document Google Cloud Agent Builder, Gemini, BigQuery, and Fivetran MCP wiring.

## Execution Semantics

Actions are split into three categories:

- Read-only: inspect connector status, query seeded data, calculate forecasts.
- Approval-required: trigger sync, generate supplier email, generate campaign.
- Commit-required: record approved action as scheduled or sent.

The agent cannot perform approval-required or commit-required actions silently. The UI must show the action, reason, expected impact, and a confirmation control.

## Forecast Logic

The first implementation uses transparent heuristics rather than an opaque model:

- baseline demand from recent matching weekday/hour sales;
- match-day multiplier by event size and kickoff time;
- weather adjustment;
- current inventory and supplier lead-time constraints;
- budget allocation by margin, stockout risk, and item popularity;
- staffing recommendations based on forecast transactions per hour.

This is sufficient for a hackathon demo because it is explainable, testable, and credible. The architecture also supports a future BigQuery ML or Vertex AI forecasting path.

## Error Handling

The app must handle:

- missing Fivetran credentials by falling back to demo mode with a visible banner;
- stale connector after sync by showing a retry or continue-with-warning choice;
- missing data source by marking confidence lower;
- budget too small by prioritizing highest-margin and highest-risk items;
- no staff availability by escalating a manager alert instead of fabricating coverage.

## Testing Strategy

Core tests should cover:

- freshness state transitions;
- approval gates for sync and execution;
- forecast calculations;
- budget-bounded reorder recommendations;
- agent mission state transitions;
- API responses for the demo mission.

Frontend verification should include a desktop and mobile browser check to confirm the mission console, approval queue, and data freshness panels render without overlap.

## Submission Assets

The final submission should include:

- hosted project URL;
- public open-source repository with license;
- README with local demo setup and live Fivetran setup;
- architecture diagram;
- seeded data explanation;
- about page or README section explaining Google Cloud Agent Builder and Gemini orchestration;
- three-minute demo video script.

## Winning Narrative

SurgePilot is memorable because it turns an AI agent into an operations manager for an urgent, public, globally recognizable event. The story is easy for judges to follow: bad data causes bad actions; Fivetran makes the data fresh and trustworthy; Gemini plans the mission; the manager stays in control; the business avoids stockouts and captures demand.
