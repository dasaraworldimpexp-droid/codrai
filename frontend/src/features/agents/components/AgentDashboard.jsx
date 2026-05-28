import { Bot, Brain, CheckCircle2, Clock3, Layers3, LockKeyhole, Network, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { agentApi } from "../services/agentApi.js";

const fallbackAgents = [
  ["Coding", "Builds apps, APIs, tests, and software architecture.", Brain],
  ["Business", "Designs revenue systems, offers, operations, and plans.", Layers3],
  ["Marketing", "Creates campaigns, funnels, positioning, and launch assets.", Network],
  ["Design", "Shapes UX, UI systems, brand direction, and product flows.", Bot],
  ["Video", "Plans scripts, storyboards, and generation pipelines.", Clock3],
  ["Automation", "Coordinates workflows, integrations, and background tasks.", CheckCircle2],
  ["Research", "Finds, validates, compares, and synthesizes knowledge.", ShieldCheck],
  ["Teacher", "Adapts lessons to memory, skill level, and learning style.", Brain],
  ["Voice", "Plans multilingual, emotion-aware voice experiences.", Bot],
  ["Support", "Handles support reasoning, knowledge base, and escalation.", LockKeyhole],
];

const workspaceId = () => localStorage.getItem("codrai_workspace_id") || "local-workspace";

export default function AgentDashboard() {
  const [catalog, setCatalog] = useState([]);
  const [status, setStatus] = useState(null);
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setError("");
    setLoading(true);
    try {
      const [catalogData, statusData, runData] = await Promise.all([
        agentApi.catalog({ workspaceId: workspaceId() }),
        agentApi.status({ workspaceId: workspaceId() }),
        agentApi.listAgentRuns({ workspaceId: workspaceId(), limit: 8 }),
      ]);
      setCatalog(catalogData.agents || []);
      setStatus(statusData);
      setRuns(runData.runs || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const agents = useMemo(() => {
    if (catalog.length > 0) {
      return catalog.map((agent) => [
        agent.name || agent.id || "Agent",
        agent.description || agent.purpose || agent.role || "Runtime agent registered by the backend catalog.",
        Brain,
        agent.status || agent.type || "registered",
      ]);
    }
    return fallbackAgents.map((agent) => [...agent, loading ? "checking" : "catalog fallback"]);
  }, [catalog, loading]);

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div className="glass-card rounded-lg p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">Intelligence Core</p>
            <h2 className="mt-2 text-2xl font-black text-white">Autonomous Agent Network</h2>
          </div>
          <button className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-codrai-mint" type="button" onClick={refresh}>
            <RefreshCw className="h-3.5 w-3.5" />
            {loading ? "Checking" : status?.status || "Runtime"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map(([name, description, Icon, agentStatus]) => (
            <article key={name} className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-cyan-300/10 text-codrai-cyan">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">{name} Agent</h3>
              <p className="mt-2 text-sm leading-6 text-white/62">{description}</p>
              <span className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-white/50">
                {agentStatus}
              </span>
            </article>
          ))}
        </div>
        {error && <p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">{error}</p>}
      </div>

      <aside className="grid gap-5">
        <div className="glass-card rounded-lg p-5">
          <h3 className="text-lg font-bold text-white">Live Coordination</h3>
          <div className="mt-4 space-y-3 text-sm text-white/68">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">Catalog agents: {catalog.length || agents.length}</div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">Recent runs: {runs.length}</div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">Runtime mode: {status?.mode || status?.runtime || "backend reported"}</div>
          </div>
        </div>

        <div className="glass-card rounded-lg p-5">
          <h3 className="text-lg font-bold text-white">Memory Layers</h3>
          <div className="mt-4 grid gap-2 text-sm text-white/68">
            {["Short-term", "Long-term", "User", "Project", "Conversation", "Semantic vector"].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                <span>{item}</span>
                <span className="h-2 w-2 rounded-full bg-codrai-mint" />
              </div>
            ))} 
          </div>
        </div>
      </aside>
    </section>
  );
}
