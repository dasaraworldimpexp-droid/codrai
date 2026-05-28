import { Activity, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { analyticsApi } from "../analyticsApi.js";

const workspaceId = () => localStorage.getItem("codrai_workspace_id") || "local-workspace";

export default function ExecutionAnalyticsPanel() {
  const [data, setData] = useState({ usage: [], tools: [] });
  const [error, setError] = useState("");

  async function refresh() {
    try {
      setData(await analyticsApi.usage({ workspaceId: workspaceId() }));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <section className="glass-card rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">Execution Analytics</p>
          <h2 className="mt-2 text-xl font-black text-white">Usage, tools, cost signals</h2>
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.06]" type="button" onClick={refresh}>
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="mb-3 text-sm text-red-200">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <Activity className="h-5 w-5 text-codrai-mint" />
          <p className="mt-3 text-sm font-bold text-white">Model requests</p>
          <p className="mt-1 text-2xl font-black text-white">{data.usage.reduce((sum, item) => sum + item.requests, 0)}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <Activity className="h-5 w-5 text-codrai-cyan" />
          <p className="mt-3 text-sm font-bold text-white">Tool executions</p>
          <p className="mt-1 text-2xl font-black text-white">{data.tools.reduce((sum, item) => sum + item.count, 0)}</p>
        </div>
      </div>
    </section>
  );
}
