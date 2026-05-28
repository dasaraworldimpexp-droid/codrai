import { BrainCircuit, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { selfImprovementApi } from "../selfImprovementApi.js";

const workspaceId = () => localStorage.getItem("codrai_workspace_id") || "local-workspace";
const userId = () => localStorage.getItem("codrai_user_id") || "local-user";

export default function SelfImprovementPanel() {
  const [runs, setRuns] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    setError("");
    try {
      const [runData, proposalData] = await Promise.all([
        selfImprovementApi.listRuns({ workspaceId: workspaceId() }),
        selfImprovementApi.listProposals({ workspaceId: workspaceId() }),
      ]);
      setRuns(runData.runs || []);
      setProposals(proposalData.proposals || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function analyze() {
    setBusy("Analyzing execution history");
    setError("");
    try {
      await selfImprovementApi.analyze({ workspaceId: workspaceId(), userId: userId(), scope: { window: "latest" } });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <section className="glass-card rounded-lg p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">Self Improvement</p>
          <h2 className="mt-2 text-xl font-black text-white">Learning loop</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">Scores real orchestrator, tool, and model usage data, then stores optimization proposals.</p>
        </div>
        <div className="flex gap-2">
          <button className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.06]" type="button" onClick={refresh} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-black text-slate-950" type="button" onClick={analyze} disabled={Boolean(busy)}>
            <Sparkles className="h-4 w-4" />
            Analyze
          </button>
        </div>
      </div>

      {busy && <p className="mb-3 text-sm text-codrai-cyan">{busy}</p>}
      {error && <p className="mb-3 text-sm text-red-200">{error}</p>}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold text-white/70"><BrainCircuit className="h-4 w-4 text-codrai-cyan" /> Recent runs</p>
          <div className="space-y-2">
            {runs.slice(0, 4).map((run) => (
              <article key={run.id} className="rounded-lg bg-white/[0.04] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white">{run.status}</span>
                  <span className="text-xs text-white/40">{new Date(run.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-xs text-white/45">{run.recommendations?.length || 0} recommendations</p>
              </article>
            ))}
            {runs.length === 0 && <p className="text-sm text-white/45">No learning runs yet.</p>}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <p className="mb-3 text-sm font-bold text-white/70">Optimization proposals</p>
          <div className="space-y-2">
            {proposals.slice(0, 4).map((proposal) => (
              <article key={proposal.id} className="rounded-lg bg-white/[0.04] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-white">{proposal.title}</p>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/50">{proposal.risk_level}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-white/45">{proposal.proposal?.reason || proposal.proposal?.expectedImpact}</p>
              </article>
            ))}
            {proposals.length === 0 && <p className="text-sm text-white/45">No proposals stored yet.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
