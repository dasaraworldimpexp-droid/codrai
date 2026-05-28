import { BrainCircuit, GitBranch, LockKeyhole, Network, RadioTower, Sparkles } from "lucide-react";

const systems = [
  ["Agents", GitBranch],
  ["Tools", Sparkles],
  ["Memory", BrainCircuit],
  ["Providers", Network],
  ["Realtime", RadioTower],
  ["Trust", LockKeyhole],
];

export default function MasterBrainPanel({ capabilities }) {
  return (
    <section className="glass-card rounded-lg p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">CODRAI Master Brain</p>
          <h2 className="mt-2 text-2xl font-black text-white">Central orchestration brain</h2>
        </div>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-codrai-cyan">
          {capabilities ? "Connected" : "Awaiting runtime"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {systems.map(([label, Icon]) => (
          <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <Icon className="h-5 w-5 text-codrai-mint" />
            <p className="mt-3 text-sm font-bold text-white">{label}</p>
          </div>
        ))}
      </div>

      <p className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-white/62">
        The Master Brain routes user goals across agents, tools, memory, workflows, providers, multimodal engines, realtime systems, marketplace extensions, and enterprise business modules.
      </p>
    </section>
  );
}
