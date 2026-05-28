import { BarChart3, BriefcaseBusiness, Building2, CircleDollarSign, Handshake, LineChart, Megaphone, UsersRound } from "lucide-react";

const modules = [
  ["CRM", Handshake],
  ["ERP", Building2],
  ["Sales", LineChart],
  ["Marketing", Megaphone],
  ["Teams", UsersRound],
  ["Finance", CircleDollarSign],
  ["Analytics", BarChart3],
  ["Company OS", BriefcaseBusiness],
];

export default function EnterpriseOsPanel() {
  return (
    <section className="glass-card rounded-lg p-5">
      <h2 className="text-xl font-black text-white">Enterprise AI Business OS</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {modules.map(([name, Icon]) => (
          <div key={name} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <Icon className="h-5 w-5 text-codrai-mint" />
            <p className="mt-3 text-sm font-bold text-white">{name}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
