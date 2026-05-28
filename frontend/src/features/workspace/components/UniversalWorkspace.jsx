import { Columns3, FolderKanban, Maximize2, PanelLeft, Plus, RefreshCw } from "lucide-react";

export default function UniversalWorkspace({ session, activeProject }) {
  const tabs = session?.tabs || [];
  const panels = session?.panels || [];

  return (
    <section className="glass-card rounded-lg p-5">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-mint">Universal Workspace</p>
          <h2 className="mt-2 text-2xl font-black text-white">{activeProject?.name || "Project command surface"}</h2>
        </div>
        <div className="flex gap-2">
          {[PanelLeft, Columns3, Maximize2, RefreshCw].map((Icon, index) => (
            <button key={index} className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-white/70 hover:text-white" type="button">
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {tabs.length === 0 && panels.length === 0 ? (
        <div className="grid min-h-56 place-items-center rounded-lg border border-dashed border-white/15 bg-white/[0.025] p-6 text-center">
          <div>
            <FolderKanban className="mx-auto h-9 w-9 text-codrai-cyan" />
            <p className="mt-4 text-base font-bold text-white">No workspace session panels yet</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/60">
              Start a creation run or open a project asset to persist tabs, panels, generation progress, and memory-aware project context here.
            </p>
            <button className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950" type="button">
              <Plus className="h-4 w-4" />
              New panel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {panels.map((panel) => (
            <article key={panel.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <h3 className="text-sm font-bold text-white">{panel.title}</h3>
              <p className="mt-2 text-sm text-white/60">{panel.type}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
