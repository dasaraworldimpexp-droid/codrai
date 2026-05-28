import { GitBranch, MessageSquareText, ShieldAlert, Sparkles } from "lucide-react";

const eventIcons = {
  planning: GitBranch,
  delegation: MessageSquareText,
  approval: ShieldAlert,
  synthesis: Sparkles,
};

export default function MultiAgentTimeline({ events = [] }) {
  return (
    <div className="glass-card rounded-lg p-5">
      <h3 className="text-lg font-bold text-white">Realtime Thinking Timeline</h3>

      {events.length === 0 ? (
        <p className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-white/62">
          Start an autonomous agent run to stream planning, delegation, approval, and synthesis events here.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {events.map((event, index) => {
            const Icon = event.icon || eventIcons[event.kind] || Sparkles;
            return (
              <div key={event.id || `${event.type}-${index}`} className="flex gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-codrai-cyan">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{event.type}</p>
                  <p className="mt-1 text-sm leading-6 text-white/62">{event.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
