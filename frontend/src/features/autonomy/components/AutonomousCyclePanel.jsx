import { RefreshCw, Repeat2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { autonomousCycleApi } from "../autonomousCycleApi.js";

const workspaceId = () => localStorage.getItem("codrai_workspace_id") || "local-workspace";
const userId = () => localStorage.getItem("codrai_user_id") || "local-user";

export default function AutonomousCyclePanel() {
  const [objective, setObjective] = useState("");
  const [cycles, setCycles] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    setError("");
    try {
      const data = await autonomousCycleApi.list({ workspaceId: workspaceId() });
      setCycles(data.cycles || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function start(event) {
    event.preventDefault();
    if (!objective.trim()) return;
    setStatus("Running autonomous execute -> learn cycle");
    setError("");
    try {
      await autonomousCycleApi.start({ workspaceId: workspaceId(), userId: userId(), objective });
      setObjective("");
      await refresh();
      setStatus("Cycle completed");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setStatus("");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <section className="glass-card rounded-lg p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">Recursive Execution</p>
          <h2 className="mt-2 text-xl font-black text-white">Autonomous cycle engine</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">Runs the orchestrator, snapshots results, scores execution, then triggers self-improvement.</p>
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.06]" type="button" onClick={refresh}>
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <form className="flex gap-2" onSubmit={start}>
        <input className="h-11 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Autonomous goal to execute and improve..." />
        <button className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950" type="submit">
          <Repeat2 className="h-4 w-4" /> Run
        </button>
      </form>
      {status && <p className="mt-3 text-sm text-codrai-cyan">{status}</p>}
      {error && <p className="mt-3 text-sm text-red-200">{error}</p>}
      <div className="mt-5 space-y-2">
        {cycles.slice(0, 4).map((cycle) => (
          <article key={cycle.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="line-clamp-2 text-sm font-bold text-white">{cycle.objective}</p>
              <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/55">{cycle.status}</span>
            </div>
            <p className="mt-2 flex items-center gap-2 text-xs text-white/45"><Sparkles className="h-3 w-3 text-codrai-cyan" /> completion {Math.round((cycle.score?.taskCompletionRate || 0) * 100)}%</p>
          </article>
        ))}
      </div>
    </section>
  );
}
