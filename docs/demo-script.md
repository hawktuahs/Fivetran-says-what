# Three-Minute Demo Script

## 0:00-0:20 Problem

Small businesses near World Cup venues face sudden demand spikes. A cafe manager does not have time to inspect POS data, inventory sheets, staffing calendars, supplier cutoffs, and campaign ideas by hand.

## 0:20-0:50 Mission Start

Open SurgePilot and run:

```text
Prepare us for tomorrow's match-day surge with a $2,000 budget.
```

Show that the interface is an operations console, not a chatbot.
Call out the top status chips: Gemini is either live through the Gemini API or running in explicit fallback mode, while Fivetran uses the MCP demo transport for credential-free judging.

## 0:50-1:30 Fivetran MCP

Point to the Fivetran MCP panel. POS and staffing are fresh, but inventory is stale. SurgePilot pauses and asks for approval before calling the MCP `fivetran.trigger_sync` tool.

Approve `Trigger Fivetran inventory sync` and show the connector becoming fresh.

## 1:30-2:20 Action Pack

Show the forecast summary, Gemini rationale, high-risk SKUs, reorder quantities, staffing coverage, campaign copy, and supplier email. Emphasize that the recommendations are budget-bounded and explainable.

## 2:20-2:50 Approval Trail

Approve selected actions. Show the audit trail recording the manager approvals and Fivetran tool calls.

## 2:50-3:00 Close

SurgePilot turns Gemini reasoning, Google Cloud Agent Builder orchestration, and Fivetran MCP data reliability into a practical match-day operations agent.
