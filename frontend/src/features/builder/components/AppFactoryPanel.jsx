import { Download, Hammer, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { appFactoryApi } from "../appFactoryApi.js";

const workspaceId = () => localStorage.getItem("codrai_workspace_id") || "local-workspace";
const userId = () => localStorage.getItem("codrai_user_id") || "local-user";
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function AppFactoryPanel() {
  const [goal, setGoal] = useState("");
  const [runs, setRuns] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    setError("");
    try {
      const data = await appFactoryApi.list({ workspaceId: workspaceId() });
      setRuns(data.runs || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function generate(event) {
    event.preventDefault();
    if (!goal.trim()) return;
    setStatus("Generating app through provider runtime");
    setError("");
    try {
      await appFactoryApi.generate({ workspaceId: workspaceId(), userId: userId(), goal });
      setGoal("");
      await refresh();
      setStatus("App generated");
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
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-mint">App Factory</p>
          <h2 className="mt-2 text-xl font-black text-white">Real full-stack app generation</h2>
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.06]" type="button" onClick={refresh}>
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <form className="flex gap-2" onSubmit={generate}>
        <input className="h-11 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Generate a SaaS dashboard, ecommerce app, AI chat app..." />
        <button className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950" type="submit">
          <Hammer className="h-4 w-4" /> Build
        </button>
      </form>
      {status && <p className="mt-3 text-sm text-codrai-cyan">{status}</p>}
      {error && <p className="mt-3 text-sm text-red-200">{error}</p>}
      <div className="mt-5 space-y-2">
        {runs.slice(0, 4).map((run) => (
          <article key={run.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="line-clamp-2 text-sm font-bold text-white">{run.goal}</p>
                <p className="mt-1 text-xs text-white/45">{run.debug_report?.status || run.status}</p>
              </div>
              {run.status === "completed" && (
                <a className="grid h-9 w-9 place-items-center rounded-lg bg-white text-slate-950" href={`${apiBase}${run.result?.exportUrl || `/projects/${run.project_id}/export?workspaceId=${workspaceId()}`}`} title="Download ZIP">
                  <Download className="h-4 w-4" />
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
