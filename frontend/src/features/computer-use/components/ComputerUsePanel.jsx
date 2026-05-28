import { Globe2, Play, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { computerUseApi } from "../computerUseApi.js";

const workspaceId = () => localStorage.getItem("codrai_workspace_id") || "local-workspace";
const userId = () => localStorage.getItem("codrai_user_id") || "local-user";

export default function ComputerUsePanel() {
  const [startUrl, setStartUrl] = useState("https://example.com");
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    setError("");
    try {
      const data = await computerUseApi.list({ workspaceId: workspaceId() });
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function run(event) {
    event.preventDefault();
    setStatus("Running Playwright computer-use session");
    setError("");
    try {
      await computerUseApi.run({
        workspaceId: workspaceId(),
        userId: userId(),
        startUrl,
        steps: [{ action: "extract" }],
      });
      await refresh();
      setStatus("Session completed");
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
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">Computer Use</p>
          <h2 className="mt-2 text-xl font-black text-white">Browser execution memory</h2>
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.06]" type="button" onClick={refresh}>
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <form className="flex gap-2" onSubmit={run}>
        <input className="h-11 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={startUrl} onChange={(event) => setStartUrl(event.target.value)} />
        <button className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950" type="submit">
          <Play className="h-4 w-4" /> Run
        </button>
      </form>
      {status && <p className="mt-3 text-sm text-codrai-cyan">{status}</p>}
      {error && <p className="mt-3 text-sm text-red-200">{error}</p>}
      <div className="mt-5 space-y-2">
        {sessions.slice(0, 4).map((session) => (
          <article key={session.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <p className="flex items-center gap-2 text-sm font-bold text-white"><Globe2 className="h-4 w-4 text-codrai-cyan" /> {session.current_url}</p>
            <p className="mt-1 text-xs text-white/45">{session.status} · {(session.navigation_memory || []).length} snapshots</p>
          </article>
        ))}
      </div>
    </section>
  );
}
