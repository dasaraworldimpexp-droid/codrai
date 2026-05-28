import { FileSearch, KeyRound, Lock, ShieldCheck, Siren, UserCog } from "lucide-react";

const controls = [
  ["Sandbox", Lock],
  ["RBAC", UserCog],
  ["API key vault", KeyRound],
  ["Audit logs", FileSearch],
  ["Abuse protection", Siren],
  ["Isolation", ShieldCheck],
];

export default function TrustLayerPanel() {
  return (
    <section className="glass-card rounded-lg p-5">
      <h2 className="text-xl font-black text-white">Security + Trust Layer</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {controls.map(([name, Icon]) => (
          <div key={name} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <Icon className="h-5 w-5 text-codrai-mint" />
            <p className="mt-3 text-sm font-bold text-white">{name}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
