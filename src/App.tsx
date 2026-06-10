import { useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { approveAction, getState, rejectAction, resetDemo, startMission } from "./api/client";
import type { AppState } from "./types";

export default function App() {
  const [state, setState] = useState<AppState>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function run(action: () => Promise<AppState>) {
    setBusy(true);
    setError(undefined);
    try {
      setState(await action());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected application error.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void run(getState);
  }, []);

  if (!state) {
    return (
      <main className="app-root loading-state">
        {error ? (
          <>
            <h1>SurgePilot could not start</h1>
            <p>{error}</p>
          </>
        ) : (
          "Loading SurgePilot..."
        )}
      </main>
    );
  }

  return (
    <AppShell
      state={state}
      busy={busy}
      error={error}
      onStartMission={(prompt) => void run(() => startMission(prompt))}
      onApprove={(id) => void run(() => approveAction(id))}
      onReject={(id) => void run(() => rejectAction(id))}
      onReset={() => void run(resetDemo)}
    />
  );
}
