import { AppWindow, Bot, BriefcaseBusiness, FileText, Gamepad2, Globe2, Image, Mic2, Presentation, ShoppingCart, Video, Workflow } from "lucide-react";

const engineIcons = {
  app_builder: AppWindow,
  website_builder: Globe2,
  game_builder: Gamepad2,
  image_generation: Image,
  video_generation: Video,
  voice_audio: Mic2,
  document_generation: FileText,
  presentation_generation: Presentation,
  business_automation: BriefcaseBusiness,
  agent_factory: Bot,
  workflow_builder: Workflow,
  ecommerce_builder: ShoppingCart,
  chatbot_builder: Bot,
};

export default function CreationEngineDashboard({ engines = [], onStart }) {
  return (
    <section className="glass-card rounded-lg p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">Creation Engines</p>
          <h2 className="mt-2 text-2xl font-black text-white">Build anything from one workspace</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-bold text-white/60">
          {engines.length} engines registered
        </span>
      </div>

      {engines.length === 0 ? (
        <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-white/62">
          Creation engines appear here after the backend registry is connected to this workspace.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {engines.map((engine) => {
            const Icon = engineIcons[engine.type] || Workflow;
            return (
              <article key={engine.type} className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-cyan-300/10 text-codrai-cyan">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-white">{engine.name}</h3>
                <p className="mt-2 min-h-20 text-sm leading-6 text-white/62">{engine.description}</p>
                <button
                  className="mt-4 h-10 w-full rounded-lg bg-white px-4 text-sm font-black text-slate-950"
                  type="button"
                  onClick={() => onStart?.(engine)}
                >
                  Start engine
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
