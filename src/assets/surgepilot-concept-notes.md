# SurgePilot Visual Concept Notes

Generated concept direction: a dense, light operations dashboard for a cafe manager preparing for a World Cup match-day surge. The screen is the product surface, not a landing page.

## Palette

- Page background: `#f6f7f4`
- Surface: `#ffffff`
- Text: `#17201b`
- Muted text: `#607066`
- Border: `#dfe6df`
- Fivetran/action green: `#168a52`
- Agent blue: `#2f6fbd`
- Warning amber: `#b66b12`
- Danger red: `#b93f35`

## Layout

- Top bar with product name, demo/live mode, and compact status.
- Three-column desktop console:
  - left: mission composer and agent timeline;
  - center: forecast summary and action pack;
  - right: Fivetran MCP connector freshness and approval queue.
- Tablet/mobile collapses to one column with the mission composer first, then approvals, then details.

## Components

- Panels are single-level surfaces with 8px radius, thin borders, and no nested cards.
- Connector rows use status color strips and compact metadata.
- Tables are dense but readable with fixed columns and no layout shift.
- Approval controls use stable-width icon buttons plus concise labels.
- Timeline entries show tool name, human-readable event, and timestamp.

## Typography

- Product title: 20px, 700.
- Section headings: 15px, 700.
- Body text: 14px, 400-500.
- Labels and table text: 12-13px, 600 where needed.
- No viewport-based font scaling and no negative letter spacing.

## Required Visible Labels

- `SurgePilot`
- `Fivetran MCP`
- `Prepare us for tomorrow's match-day surge with a $2,000 budget.`
- `Trigger Fivetran inventory sync`
- `POS`, `Inventory`, `Staffing`
- `Action pack`
- `Approval queue`
