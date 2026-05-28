import { PauseCircle, PlayCircle, ShieldCheck, TimerReset } from "lucide-react";

export default function ToolExecutionPanel({ executions = [] }) {
  return (
    <section className="glass-card rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-mint">Tool Runtime</p>
          <h2 className="mt-2 text-xl font-black text-white">Execution tracking</h2>
        </div>
        <ShieldCheck className="h-6 w-6 text-codrai-mint" />
      </div>

      {executions.length === 0 ? (
        <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-white/62">
          Tool executions stream here with status, queue progress, approvals, retry attempts, and cancellation controls.
        </p>
      ) : (
        <div className="space-y-3">
          {executions.map((execution) => (
            <article key={execution.id} className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">{execution.toolName}</h3>
                  <p className="mt-1 text-xs text-white/50">{execution.status}</p>
                </div>
                <div className="flex gap-2 text-white/60">
                  <PlayCircle className="h-5 w-5" />
                  <PauseCircle className="h-5 w-5" />
                  <TimerReset className="h-5 w-5" />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
