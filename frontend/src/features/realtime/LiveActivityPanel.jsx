import { Radio } from "lucide-react";
import { useEffect } from "react";
import { useRealtimeStore } from "./realtimeStore.js";

const workspaceId = () => localStorage.getItem("codrai_workspace_id") || "local-workspace";

export default function LiveActivityPanel() {
  const { connected, events, connect } = useRealtimeStore();

  useEffect(() => {
    connect(`workspace:${workspaceId()}`);
  }, [connect]);

  return (
    <section className="glass-card rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-mint">Realtime OS</p>
          <h2 className="mt-2 text-xl font-black text-white">Live activity stream</h2>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${connected ? "bg-emerald-300/10 text-codrai-mint" : "bg-white/10 text-white/50"}`}>
          <Radio className="h-3.5 w-3.5" />
          {connected ? "Live" : "Offline"}
        </span>
      </div>
      {events.length === 0 ? (
        <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-white/62">Runtime events appear here as agents, tools, workflows, and providers execute.</p>
      ) : (
        <div className="max-h-72 space-y-2 overflow-auto">
          {events.map((event, index) => (
            <div key={event.id || `${event.type}-${event.createdAt || event.created_at || index}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <p className="text-sm font-bold text-white">{event.type}</p>
              <p className="mt-1 text-xs text-white/50">{new Date(event.createdAt).toLocaleTimeString()}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
