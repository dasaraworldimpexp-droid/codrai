import { Play } from "lucide-react";
import { useState } from "react";
import { toolApi } from "../toolApi.js";

const workspaceId = () => localStorage.getItem("codrai_workspace_id") || "local-workspace";
const userId = () => localStorage.getItem("codrai_user_id") || "local-user";

const presets = {
  "calculator.evaluate": { expression: "12 * (8 + 4)" },
  "browser.search": { query: "latest AI coding tools", limit: 5 },
  "browser.navigate": { url: "https://example.com", screenshot: false },
  "image.generate": { prompt: "A premium dark UI dashboard for an AI operating system" },
  "app.generate": { goal: "A task manager SaaS with auth and dashboard" },
  "api.request": { url: "https://example.com", method: "GET" },
};

export default function ToolConsole() {
  const [toolName, setToolName] = useState("calculator.evaluate");
  const [input, setInput] = useState(JSON.stringify(presets["calculator.evaluate"], null, 2));
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function execute(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    try {
      const data = await toolApi.execute({
        workspaceId: workspaceId(),
        userId: userId(),
        toolName,
        input: JSON.parse(input),
        mode: "sync",
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  function chooseTool(value) {
    setToolName(value);
    setInput(JSON.stringify(presets[value] || {}, null, 2));
  }

  return (
    <section className="glass-card rounded-lg p-5">
      <div className="mb-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-mint">Tool Console</p>
        <h2 className="mt-2 text-xl font-black text-white">Execute real tools</h2>
      </div>
      <form className="space-y-3" onSubmit={execute}>
        <select className="h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" value={toolName} onChange={(event) => chooseTool(event.target.value)}>
          {Object.keys(presets).map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <textarea className="min-h-36 w-full rounded-lg border border-white/10 bg-black/20 p-3 font-mono text-sm outline-none" value={input} onChange={(event) => setInput(event.target.value)} />
        <button className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950" type="submit">
          <Play className="h-4 w-4" />
          Execute
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-200">{error}</p>}
      {result && <pre className="mt-4 max-h-80 overflow-auto rounded-lg bg-black/30 p-4 text-xs text-white/70">{JSON.stringify(result, null, 2)}</pre>}
    </section>
  );
}
