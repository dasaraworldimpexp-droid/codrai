import { Play, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { agentApi } from "../services/agentApi.js";

const workspaceId = () => localStorage.getItem("codrai_workspace_id") || "local-workspace";
const userId = () => localStorage.getItem("codrai_user_id") || "local-user";

export default function AgentExecutionPanel() {
  const [objective, setObjective] = useState("");
  const [runs, setRuns] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const data = await agentApi.listAgentRuns({ workspaceId: workspaceId() });
      setRuns(data.runs || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function start(event) {
    event.preventDefault();
    if (!objective.trim()) return;
    setStatus("Starting agent run");
    setError("");
    try {
      const result = await agentApi.startAgentRun({
        workspaceId: workspaceId(),
        userId: userId(),
        objective,
      });
      setStatus(`Agent run ${result.runId} completed`);
      setObjective("");
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setStatus("Failed");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <section className="glass-card rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">Autonomous Agents</p>
          <h2 className="mt-2 text-xl font-black text-white">Real agent execution</h2>
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.06]" type="button" onClick={refresh}>
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <form className="flex gap-2" onSubmit={start}>
        <input className="h-11 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" placeholder="Give an autonomous objective..." value={objective} onChange={(event) => setObjective(event.target.value)} />
        <button className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950" type="submit">
          <Play className="h-4 w-4" />
          Run
        </button>
      </form>

      {status && <p className="mt-3 text-sm text-white/55">{status}</p>}
      {error && <p className="mt-3 text-sm text-red-200">{error}</p>}

      <div className="mt-5 space-y-3">
        {runs.map((run) => (
          <article key={run.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="line-clamp-2 text-sm font-bold text-white">{run.objective}</p>
              <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/55">{run.status}</span>
            </div>
            {run.error && <p className="mt-2 text-xs text-red-200">{run.error.message}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
