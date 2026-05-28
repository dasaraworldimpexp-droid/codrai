export default function MemoryVisualization({ layers = [] }) {
  return (
    <div className="glass-card rounded-lg p-5">
      <h3 className="text-lg font-bold text-white">Memory Orchestration</h3>

      {layers.length === 0 ? (
        <p className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-white/62">
          Memory relevance appears after the runtime retrieves scoped user, project, conversation, and semantic memories.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {layers.map((layer) => (
            <div key={layer.name}>
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-semibold text-white">{layer.name}</span>
                <span className="text-white/50">{layer.value}% relevance</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-codrai-cyan" style={{ width: `${layer.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
