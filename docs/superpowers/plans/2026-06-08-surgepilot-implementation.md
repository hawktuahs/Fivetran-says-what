# SurgePilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build SurgePilot, a polished match-day operations agent dashboard that demonstrates Gemini-style planning, Fivetran MCP-powered data freshness actions, manager approvals, and business execution outputs.

**Architecture:** Use a React + Vite frontend backed by a small Express API. The API owns mission state, seeded operational data, forecasting, audit events, and a Fivetran adapter with deterministic demo mode plus a live integration boundary. Keep Google Cloud Agent Builder wiring documented and represented through tool contracts so the hackathon submission can show the intended production path.

**Tech Stack:** React, Vite, TypeScript, Express, Vitest, Testing Library, Playwright or Browser plugin verification, Fivetran MCP/REST adapter boundary, Google Cloud Agent Builder documentation.

---

## File Structure

- Create: `package.json` - scripts and dependencies for frontend, API, tests, and build.
- Create: `index.html` - Vite HTML entry.
- Create: `tsconfig.json` - shared TypeScript settings.
- Create: `tsconfig.node.json` - Node/Express TypeScript settings.
- Create: `vite.config.ts` - Vite and Vitest config.
- Create: `server/tsconfig.json` - server build config.
- Create: `server/index.ts` - Express app and API routes.
- Create: `server/services/fivetranAdapter.ts` - live/demo Fivetran adapter contract.
- Create: `server/services/forecast.ts` - deterministic forecast and recommendation engine.
- Create: `server/services/mission.ts` - mission state machine and approval gates.
- Create: `server/services/audit.ts` - audit event helpers.
- Create: `server/data/seed.ts` - demo business, event, inventory, sales, supplier, and staffing data.
- Create: `server/types.ts` - shared server domain types.
- Create: `src/main.tsx` - React entry.
- Create: `src/App.tsx` - dashboard composition.
- Create: `src/types.ts` - frontend API types.
- Create: `src/api/client.ts` - API client wrapper.
- Create: `src/components/AppShell.tsx` - dashboard shell.
- Create: `src/components/MissionComposer.tsx` - mission input and run controls.
- Create: `src/components/FivetranPanel.tsx` - connector freshness and sync controls.
- Create: `src/components/AgentTimeline.tsx` - plan, tool calls, and audit events.
- Create: `src/components/ForecastPanel.tsx` - demand, budget, and risk summary.
- Create: `src/components/ApprovalQueue.tsx` - approval-required actions.
- Create: `src/components/ActionPack.tsx` - reorder, staffing, campaign, and supplier drafts.
- Create: `src/styles.css` - full app styling and responsive rules.
- Create: `src/assets/surgepilot-concept-notes.md` - visual design extraction from the accepted concept.
- Create: `tests/forecast.test.ts` - forecast unit tests.
- Create: `tests/fivetranAdapter.test.ts` - adapter state tests.
- Create: `tests/mission.test.ts` - mission state and approval tests.
- Create: `docs/cloud-agent-builder.md` - Google Cloud Agent Builder, Gemini, BigQuery, and Fivetran MCP setup.
- Create: `docs/demo-script.md` - three-minute submission video script.
- Create: `LICENSE` - MIT license for Devpost requirement.
- Create: `README.md` - setup, demo, live Fivetran path, architecture, and judging narrative.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `server/tsconfig.json`
- Create: `src/main.tsx`
- Create: `src/App.tsx`

- [ ] **Step 1: Create package scripts and dependencies**

Use this `package.json`:

```json
{
  "name": "surgepilot",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "concurrently \"vite --host 127.0.0.1\" \"tsx watch server/index.ts\"",
    "dev:web": "vite --host 127.0.0.1",
    "dev:api": "tsx watch server/index.ts",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host 127.0.0.1",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc -b --pretty false"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "concurrently": "^9.2.0",
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "lucide-react": "^0.468.0",
    "tsx": "^4.20.0",
    "vite": "^7.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Add app entry files**

Use this `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SurgePilot</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Use this `src/main.tsx`:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Use this temporary `src/App.tsx`:

```tsx
export default function App() {
  return <main className="app-root">SurgePilot</main>;
}
```

- [ ] **Step 3: Add TypeScript and Vite config**

Create strict TS configs and Vitest config. Use `jsdom` as the test environment and proxy `/api` from Vite to `http://127.0.0.1:8787`.

- [ ] **Step 4: Install dependencies**

Run: `corepack pnpm install`
Expected: dependencies install and `pnpm-lock.yaml` is created.

- [ ] **Step 5: Verify scaffold**

Run: `corepack pnpm test`
Expected: Vitest starts and reports no tests found or zero passing tests without TypeScript errors.

---

### Task 2: Domain Types And Seed Data

**Files:**
- Create: `server/types.ts`
- Create: `server/data/seed.ts`
- Create: `src/types.ts`

- [ ] **Step 1: Define server types**

Include these domain objects:

```ts
export type ConnectorStatus = "fresh" | "stale" | "syncing" | "failed";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface Connector {
  id: string;
  name: string;
  source: string;
  destination: string;
  status: ConnectorStatus;
  lastSyncAt: string;
  recordsSynced: number;
  freshnessMinutes: number;
}

export interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  unitsOnHand: number;
  unitCost: number;
  unitPrice: number;
  supplier: string;
  packSize: number;
  leadTimeHours: number;
}

export interface SalesRecord {
  sku: string;
  weekday: string;
  hour: number;
  unitsSold: number;
}

export interface MatchEvent {
  id: string;
  venue: string;
  kickoffAt: string;
  expectedAttendance: number;
  visitorMultiplier: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  hourlyCost: number;
  availableHours: number[];
}

export interface ForecastItem {
  sku: string;
  name: string;
  expectedDemand: number;
  unitsOnHand: number;
  reorderUnits: number;
  estimatedCost: number;
  expectedRevenue: number;
  risk: "low" | "medium" | "high";
}

export interface ApprovalAction {
  id: string;
  type: "sync" | "reorder" | "staffing" | "campaign" | "supplier_email";
  title: string;
  reason: string;
  impact: string;
  status: ApprovalStatus;
}
```

- [ ] **Step 2: Seed a complete World Cup cafe scenario**

Create seed data for:

- three connectors: POS, inventory, staffing;
- eight inventory items;
- hourly sales records for match-like and normal weekdays;
- one match event tomorrow;
- six staff members;
- supplier contacts;
- promotion templates.

- [ ] **Step 3: Mirror shared frontend types**

Export the API response shapes in `src/types.ts` so UI components do not import server files directly.

- [ ] **Step 4: Add a seed-data smoke test**

Run: `corepack pnpm test tests/forecast.test.ts`
Expected before forecast implementation: fail with module-not-found for `forecast`.

---

### Task 3: Forecast Engine

**Files:**
- Create: `server/services/forecast.ts`
- Create: `tests/forecast.test.ts`

- [ ] **Step 1: Write failing forecast tests**

Tests must assert:

```ts
import { describe, expect, it } from "vitest";
import { buildForecast } from "../server/services/forecast";
import { seedData } from "../server/data/seed";

describe("buildForecast", () => {
  it("recommends reorder units when match-day demand exceeds inventory", () => {
    const result = buildForecast(seedData, { budget: 2000 });
    const coffee = result.items.find((item) => item.sku === "cold-brew-1l");
    expect(coffee?.reorderUnits).toBeGreaterThan(0);
    expect(result.totalRecommendedSpend).toBeLessThanOrEqual(2000);
  });

  it("marks high risk items when projected demand exceeds stock by at least 40 percent", () => {
    const result = buildForecast(seedData, { budget: 2000 });
    expect(result.items.some((item) => item.risk === "high")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `corepack pnpm test tests/forecast.test.ts`
Expected: FAIL because `buildForecast` does not exist.

- [ ] **Step 3: Implement forecast logic**

Implement:

- baseline demand from matching weekday sales;
- event multiplier from match attendance and visitor multiplier;
- weather boost for cold drinks and snack items;
- budget-bounded reorder allocation sorted by risk and gross margin;
- expected revenue and confidence summary.

- [ ] **Step 4: Run forecast tests**

Run: `corepack pnpm test tests/forecast.test.ts`
Expected: PASS.

---

### Task 4: Fivetran Adapter

**Files:**
- Create: `server/services/fivetranAdapter.ts`
- Create: `tests/fivetranAdapter.test.ts`

- [ ] **Step 1: Write failing adapter tests**

Tests must assert demo-mode behavior:

```ts
import { describe, expect, it } from "vitest";
import { createDemoFivetranAdapter } from "../server/services/fivetranAdapter";

describe("demo Fivetran adapter", () => {
  it("starts with stale inventory data", async () => {
    const adapter = createDemoFivetranAdapter();
    const connectors = await adapter.listConnectors();
    expect(connectors.find((c) => c.id === "inventory")?.status).toBe("stale");
  });

  it("refreshes inventory after a sync request", async () => {
    const adapter = createDemoFivetranAdapter();
    await adapter.triggerSync("inventory");
    const connector = await adapter.getConnector("inventory");
    expect(connector.status).toBe("fresh");
    expect(connector.freshnessMinutes).toBeLessThan(10);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `corepack pnpm test tests/fivetranAdapter.test.ts`
Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement adapter contract**

Expose:

```ts
export interface FivetranAdapter {
  mode: "demo" | "live";
  listConnectors(): Promise<Connector[]>;
  getConnector(id: string): Promise<Connector>;
  getSyncLogs(id: string): Promise<string[]>;
  triggerSync(id: string): Promise<Connector>;
}
```

Create `createDemoFivetranAdapter()` with in-memory connector state. Create `createLiveFivetranAdapter()` that reads `FIVETRAN_API_KEY` and `FIVETRAN_API_SECRET` and throws a clear configuration error if either is missing.

- [ ] **Step 4: Run adapter tests**

Run: `corepack pnpm test tests/fivetranAdapter.test.ts`
Expected: PASS.

---

### Task 5: Mission State Machine

**Files:**
- Create: `server/services/audit.ts`
- Create: `server/services/mission.ts`
- Create: `tests/mission.test.ts`

- [ ] **Step 1: Write failing mission tests**

Tests must assert:

```ts
import { describe, expect, it } from "vitest";
import { createDemoFivetranAdapter } from "../server/services/fivetranAdapter";
import { createMissionService } from "../server/services/mission";
import { seedData } from "../server/data/seed";

describe("mission service", () => {
  it("requires approval before syncing stale data", async () => {
    const service = createMissionService(seedData, createDemoFivetranAdapter());
    const mission = await service.startMission("Prepare us for tomorrow's match-day surge with a $2,000 budget.");
    expect(mission.pendingApprovals.some((action) => action.type === "sync")).toBe(true);
    expect(mission.actionPack).toBeUndefined();
  });

  it("builds an action pack after sync approval", async () => {
    const service = createMissionService(seedData, createDemoFivetranAdapter());
    const mission = await service.startMission("Prepare us for tomorrow's match-day surge with a $2,000 budget.");
    const sync = mission.pendingApprovals.find((action) => action.type === "sync");
    const updated = await service.approveAction(sync!.id);
    expect(updated.actionPack?.reorderItems.length).toBeGreaterThan(0);
    expect(updated.auditEvents.some((event) => event.tool === "fivetran.triggerSync")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `corepack pnpm test tests/mission.test.ts`
Expected: FAIL because mission service does not exist.

- [ ] **Step 3: Implement mission service**

Mission states:

- `idle`
- `checking_data`
- `awaiting_sync_approval`
- `forecasting`
- `awaiting_action_approval`
- `completed`

Extract budget from the mission text with a numeric dollar parser. Default to `$2,000` when no budget is supplied. Generate a plan, pending approvals, action pack, and audit trail.

- [ ] **Step 4: Run mission tests**

Run: `corepack pnpm test tests/mission.test.ts`
Expected: PASS.

---

### Task 6: Express API

**Files:**
- Create: `server/index.ts`

- [ ] **Step 1: Implement API routes**

Routes:

- `GET /api/health`
- `GET /api/state`
- `POST /api/missions`
- `POST /api/actions/:id/approve`
- `POST /api/actions/:id/reject`
- `POST /api/reset`

Use a single in-memory mission service instance. Enable CORS for Vite local development.

- [ ] **Step 2: Add API smoke checks**

Run: `corepack pnpm dev:api`
Expected: Express starts on `http://127.0.0.1:8787`.

In a separate shell, run: `Invoke-WebRequest -Uri http://127.0.0.1:8787/api/health`
Expected: JSON body includes `"ok":true`.

- [ ] **Step 3: Run all service tests**

Run: `corepack pnpm test`
Expected: PASS.

---

### Task 7: Visual Concept And Design System

**Files:**
- Create: `src/assets/surgepilot-concept-notes.md`
- Modify: `src/styles.css`

- [ ] **Step 1: Generate the primary dashboard concept**

Use the image generation workflow to create one full primary screen concept for:

- mission console;
- Fivetran freshness panel;
- agent timeline;
- forecast/risk summary;
- approval queue;
- action pack preview.

Design requirements:

- first screen is the actual operations console;
- no marketing hero;
- restrained operational palette;
- readable dense dashboard;
- no nested cards;
- no decorative orbs;
- clear approval controls;
- visible Fivetran connector state.

- [ ] **Step 2: Extract design tokens**

Record in `src/assets/surgepilot-concept-notes.md`:

- palette;
- typography scale;
- spacing;
- panel model;
- icon style;
- responsive behavior;
- exact visible labels.

- [ ] **Step 3: Create base CSS**

Implement app-level tokens in `src/styles.css`:

```css
:root {
  color-scheme: light;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f6f7f4;
  color: #17201b;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

button,
input,
textarea {
  font: inherit;
}
```

---

### Task 8: Frontend API Client And App State

**Files:**
- Create: `src/api/client.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create API client**

Expose:

```ts
export async function getState(): Promise<AppState>;
export async function startMission(prompt: string): Promise<AppState>;
export async function approveAction(id: string): Promise<AppState>;
export async function rejectAction(id: string): Promise<AppState>;
export async function resetDemo(): Promise<AppState>;
```

Each function should throw an `Error` with response text when the API returns a non-2xx status.

- [ ] **Step 2: Implement app state loading**

`App.tsx` should load `/api/state`, show a compact loading state, and pass state/action callbacks into dashboard components.

- [ ] **Step 3: Run lint**

Run: `corepack pnpm lint`
Expected: PASS.

---

### Task 9: Dashboard Components

**Files:**
- Create: `src/components/AppShell.tsx`
- Create: `src/components/MissionComposer.tsx`
- Create: `src/components/FivetranPanel.tsx`
- Create: `src/components/AgentTimeline.tsx`
- Create: `src/components/ForecastPanel.tsx`
- Create: `src/components/ApprovalQueue.tsx`
- Create: `src/components/ActionPack.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Build component skeletons**

Each component gets typed props and renders real state, not hardcoded screenshots. Use lucide-react icons for clear controls such as refresh, approve, reject, database, timeline, and alert.

- [ ] **Step 2: Implement mission composer**

Default prompt:

```text
Prepare us for tomorrow's match-day surge with a $2,000 budget.
```

Controls:

- Run mission;
- Reset demo;
- visible demo/live Fivetran mode.

- [ ] **Step 3: Implement Fivetran panel**

Show connector rows with status, last sync time, freshness, records synced, and sync-log summary. The stale inventory connector must be visually prominent before approval.

- [ ] **Step 4: Implement approval queue**

Render each pending approval with:

- action title;
- reason;
- impact;
- approve button;
- reject button.

Buttons must keep stable width and not shift layout when state changes.

- [ ] **Step 5: Implement action pack**

Render:

- reorder table;
- staffing table;
- campaign copy;
- supplier email draft;
- expected spend and revenue.

- [ ] **Step 6: Run frontend checks**

Run: `corepack pnpm lint`
Expected: PASS.

---

### Task 10: Documentation And Submission Assets

**Files:**
- Create: `README.md`
- Create: `docs/cloud-agent-builder.md`
- Create: `docs/demo-script.md`
- Create: `LICENSE`

- [ ] **Step 1: Write README**

Sections:

- What SurgePilot is;
- why Fivetran MCP matters;
- local demo setup;
- live Fivetran setup;
- Google Cloud Agent Builder architecture;
- demo mission;
- testing;
- Devpost submission checklist.

- [ ] **Step 2: Write Google Cloud Agent Builder guide**

Document:

- Fivetran syncs data into BigQuery;
- Agent Builder exposes mission tools;
- Gemini plans and selects tools;
- Fivetran MCP handles connector state and sync actions;
- API approval gates keep the human in control.

- [ ] **Step 3: Write demo video script**

Three-minute structure:

- 0:00-0:20 problem and user;
- 0:20-0:50 mission start;
- 0:50-1:30 Fivetran MCP stale-data detection and sync approval;
- 1:30-2:20 forecast and action pack;
- 2:20-2:50 approvals and audit trail;
- 2:50-3:00 close with impact and partner value.

- [ ] **Step 4: Add MIT license**

Use the standard MIT license with year `2026`.

---

### Task 11: End-To-End Verification

**Files:**
- Modify: files identified by the failing verification command, with each fix scoped to the failed check.

- [ ] **Step 1: Run unit and type checks**

Run: `corepack pnpm test`
Expected: PASS.

Run: `corepack pnpm lint`
Expected: PASS.

Run: `corepack pnpm build`
Expected: PASS and `dist/` created.

- [ ] **Step 2: Start the local app**

Run: `corepack pnpm dev`
Expected:

- API on `http://127.0.0.1:8787`;
- frontend on Vite's printed local URL.

- [ ] **Step 3: Browser verification**

Use the in-app Browser plugin first. Verify:

- dashboard loads;
- default mission starts;
- stale inventory connector appears;
- approving sync changes connector to fresh;
- action pack appears;
- approving final actions updates audit trail;
- desktop layout has no overlap;
- mobile layout has no overlap.

- [ ] **Step 4: Visual fidelity verification**

Compare the accepted concept image to the browser-rendered dashboard with `view_image` on both images. Inspect at least:

- copy and labels;
- first viewport composition;
- palette;
- typography scale;
- panel/container model;
- spacing;
- icon treatment;
- mobile collapse.

- [ ] **Step 5: Fix visible issues**

Any overlap, clipped text, inert control, unreadable table, broken mobile layout, or mismatch with the accepted dashboard concept blocks completion.

---

### Task 12: Submission Readiness

**Files:**
- Modify: `README.md`
- Modify: `docs/demo-script.md`

- [ ] **Step 1: Confirm Devpost requirements**

Checklist:

- hosted app URL;
- public source repo URL;
- visible open-source license;
- Fivetran track selected;
- three-minute demo video;
- submission form complete.

- [ ] **Step 2: Record final evidence**

Capture:

- local or hosted URL;
- test command outputs;
- screenshot path;
- demo-mode note;
- live Fivetran setup note.

- [ ] **Step 3: Final commit**

Run:

```bash
git add .
git commit -m "feat: build SurgePilot hackathon agent"
```

Expected: one commit containing app, tests, docs, and license.

---

## Self-Review

- Spec coverage: The plan covers the Fivetran MCP adapter, data freshness checks, agent mission loop, manager approvals, forecasting, dashboard, testing, Google Cloud documentation, and submission assets.
- Marker scan: No unresolved markers are intentionally included. Demo mode is a defined implementation, not a missing live integration.
- Type consistency: Connector, forecast, approval, mission, and audit terms are consistent across server, frontend, tests, and docs.
- Hackathon fit: The plan keeps the Fivetran integration visible in the core demo path and preserves human oversight for actions.
