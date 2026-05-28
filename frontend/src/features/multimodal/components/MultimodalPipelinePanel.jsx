import { Image, Mic2, Music2, Radio, UserRound, Video } from "lucide-react";

const pipelines = [
  ["Text to image", Image],
  ["Image to video", Video],
  ["Text to video", Video],
  ["Voice cloning", Mic2],
  ["AI avatar", UserRound],
  ["AI music", Music2],
  ["Live stream", Radio],
];

export default function MultimodalPipelinePanel() {
  return (
    <section className="glass-card rounded-lg p-5">
      <h2 className="text-xl font-black text-white">Multimodal AI Engine</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {pipelines.map(([name, Icon]) => (
          <div key={name} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <Icon className="h-5 w-5 text-codrai-cyan" />
            <p className="mt-3 text-sm font-bold text-white">{name}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
