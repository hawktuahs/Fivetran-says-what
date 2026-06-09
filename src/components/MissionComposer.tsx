import { Play, RotateCcw } from "lucide-react";
import { useState } from "react";

interface MissionComposerProps {
  prompt: string;
  budget: number;
  mode: "demo" | "live";
  busy: boolean;
  onStartMission(prompt: string): void;
  onReset(): void;
}

const defaultPrompt = "Prepare us for tomorrow's match-day surge with a $2,000 budget.";

export function MissionComposer({ prompt, budget, mode, busy, onStartMission, onReset }: MissionComposerProps) {
  const [draft, setDraft] = useState(prompt || defaultPrompt);

  return (
    <section className="panel mission-panel" aria-label="Mission composer">
      <div className="panel-heading">
        <div>
          <span className="label">Mission</span>
          <h2>Match-day command</h2>
        </div>
        <span className="mode-dot">{mode}</span>
      </div>
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={4}
        aria-label="Mission prompt"
      />
      <div className="mission-meta">
        <span>Budget ${budget.toLocaleString()}</span>
        <span>Human approvals required</span>
      </div>
      <div className="button-row">
        <button className="primary-button" type="button" disabled={busy} onClick={() => onStartMission(draft)}>
          <Play size={16} />
          Run mission
        </button>
        <button className="icon-text-button" type="button" disabled={busy} onClick={onReset}>
          <RotateCcw size={16} />
          Reset
        </button>
      </div>
    </section>
  );
}
