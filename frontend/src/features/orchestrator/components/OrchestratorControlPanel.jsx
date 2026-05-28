import { motion } from "framer-motion";
import { Activity, GitBranch, PauseCircle, Play, RefreshCw, Route, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useRealtimeStore } from "../../realtime/realtimeStore.js";
import { orchestratorApi } from "../orchestratorApi.js";

const workspaceId = () => localStorage.getItem("codrai_workspace_id") || "local-workspace";
const userId = () => localStorage.getItem("codrai_user_id") || "local-user";

const statusTone = {
  completed: "bg-emerald-400/15 text-emerald-200",
  running: "bg-cyan-400/15 text-cyan-200",
  planning: "bg-cyan-400/15 text-cyan-200",
  waiting: "bg-amber-300/15 text-amber-100",
  retrying: "bg-amber-300/15 text-amber-100",
  needs_attention: "bg-red-400/15 text-red-100",
  failed: "bg-red-400/15 text-red-100",
  cancelled: "bg-white/10 text-white/50",
};

export default function OrchestratorControlPanel() {
  const [objective, setObjective] = useState("");
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const realtimeEvents = useRealtimeStore((state) => state.events);
  const connect = useRealtimeStore((state) => state.connect);

  const chartData = useMemo(() => {
    const tasks = selectedRun?.tasks || [];
    const grouped = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([status, count]) => ({ status, count }));
  }, [selectedRun]);

  const liveEvents = useMemo(() => {
    return realtimeEvents
      .filter((event) => event.type?.startsWith("orchestrator."))
      .slice(0, 6);
  }, [realtimeEvents]);

  async function refresh() {
    setError("");
    try {
      const data = await orchestratorApi.listRuns({ workspaceId: workspaceId() });
      setRuns(data.runs || []);
      const nextRunId = selectedRun?.run?.id || data.runs?.[0]?.id;
      if (nextRunId) {
        const detail = await orchestratorApi.getRun({ workspaceId: workspaceId(), runId: nextRunId });
        setSelectedRun(detail);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function start(event) {
    event.preventDefault();
    if (!objective.trim()) return;
    setBusy("Starting autonomous run");
    setError("");
    try {
      const result = await orchestratorApi.startRun({
        workspaceId: workspaceId(),
        userId: userId(),
        objective: objective.trim(),
      });
      setObjective("");
      setSelectedRun(result);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy("");
    }
  }

  async function resume() {
    if (!selectedRun?.run?.id) return;
    setBusy("Resuming run");
    setError("");
    try {
      const result = await orchestratorApi.resumeRun({ workspaceId: workspaceId(), userId: userId(), runId: selectedRun.run.id });
      setSelectedRun(result);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy("");
    }
  }

  async function cancel() {
    if (!selectedRun?.run?.id) return;
    setBusy("Cancelling run");
    setError("");
    try {
      const result = await orchestratorApi.cancelRun({ workspaceId: workspaceId(), userId: userId(), runId: selectedRun.run.id });
      setSelectedRun(result);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy("");
    }
  }

  async function selectRun(runId) {
    setError("");
    try {
      setSelectedRun(await orchestratorApi.getRun({ workspaceId: workspaceId(), runId }));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  useEffect(() => {
    connect(`workspace:${workspaceId()}`);
    refresh();
  }, []);

  return (
    <section className="glass-card overflow-hidden rounded-lg">
      <div className="border-b border-white/10 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">Master Orchestrator</p>
            <h2 className="mt-2 text-2xl font-black text-white">Self-planning autonomous execution</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              Runs are persisted in PostgreSQL, planned through the live model router, executed through real tools/providers, and streamed through the realtime event bus.
            </p>
          </div>
          <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white" type="button" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <form className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]" onSubmit={start}>
          <textarea
            className="min-h-24 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white outline-none transition focus:border-codrai-cyan"
            placeholder="Give CODRAI a real autonomous objective: research a market, generate an app, analyze a deployment, debug a workflow..."
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
          />
          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-black text-slate-950 lg:self-end" type="submit" disabled={Boolean(busy)}>
            <Play className="h-4 w-4" />
            Execute
          </button>
        </form>

        {busy && <p className="mt-3 text-sm text-codrai-cyan">{busy}</p>}
        {error && <p className="mt-3 text-sm text-red-200">{error}</p>}
      </div>

      <div className="grid gap-0 xl:grid-cols-[320px_1fr]">
        <aside className="border-b border-white/10 p-4 xl:border-b-0 xl:border-r">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white/70">
            <Route className="h-4 w-4 text-codrai-cyan" />
            Runs
          </div>
          <div className="max-h-[390px] space-y-2 overflow-auto pr-1">
            {runs.map((run) => (
              <button
                key={run.id}
                className={`w-full rounded-lg border p-3 text-left transition ${selectedRun?.run?.id === run.id ? "border-codrai-cyan bg-codrai-cyan/10" : "border-white/10 bg-white/[0.035] hover:bg-white/[0.07]"}`}
                type="button"
                onClick={() => selectRun(run.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="line-clamp-2 text-sm font-bold text-white">{run.objective}</span>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${statusTone[run.status] || "bg-white/10 text-white/60"}`}>{run.status}</span>
                </div>
                <p className="mt-2 text-xs text-white/45">{new Date(run.created_at).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </aside>

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_300px]">
          <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">Selected execution</p>
                <h3 className="mt-1 line-clamp-2 text-lg font-black text-white">{selectedRun?.run?.objective || "No run selected"}</h3>
              </div>
              <div className="flex gap-2">
                <button className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.06]" type="button" onClick={resume} disabled={!selectedRun?.run?.id || Boolean(busy)} title="Resume">
                  <Zap className="h-4 w-4" />
                </button>
                <button className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.06]" type="button" onClick={cancel} disabled={!selectedRun?.run?.id || Boolean(busy)} title="Cancel">
                  <PauseCircle className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {(selectedRun?.tasks || []).map((task) => (
                <motion.article
                  key={task.id}
                  layout
                  className="rounded-lg border border-white/10 bg-black/20 p-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-1 text-xs ${statusTone[task.status] || "bg-white/10 text-white/60"}`}>{task.status}</span>
                        <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/50">{task.agent_type}</span>
                        <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/50">attempts {task.attempts}/{task.max_attempts}</span>
                      </div>
                      <h4 className="mt-3 text-sm font-black text-white">{task.title}</h4>
                      <p className="mt-2 text-sm leading-6 text-white/55">{task.objective}</p>
                    </div>
                    <GitBranch className="h-5 w-5 shrink-0 text-codrai-cyan" />
                  </div>
                  {task.tool_names?.length > 0 && <p className="mt-3 text-xs text-white/40">Tools: {task.tool_names.join(", ")}</p>}
                  {task.error?.message && <p className="mt-3 rounded-lg bg-red-500/10 p-2 text-xs text-red-100">{task.error.message}</p>}
                </motion.article>
              ))}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white/70">
                <Activity className="h-4 w-4 text-codrai-cyan" />
                Task health
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="status" tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#07111f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }} />
                    <Bar dataKey="count" fill="#67e8f9" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="mb-3 text-sm font-bold text-white/70">Live orchestrator events</p>
              <div className="space-y-2">
                {liveEvents.map((event, index) => (
                  <div key={`${event.id || event.type}-${index}`} className="rounded-lg bg-black/20 p-2">
                    <p className="text-xs font-bold text-white">{event.type}</p>
                    <p className="mt-1 text-xs text-white/40">{new Date(event.createdAt || event.created_at || Date.now()).toLocaleTimeString()}</p>
                  </div>
                ))}
                {liveEvents.length === 0 && <p className="text-sm text-white/45">No live orchestrator events yet.</p>}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
