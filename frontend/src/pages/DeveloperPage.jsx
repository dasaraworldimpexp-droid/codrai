import { Activity, BarChart3, BookOpen, Code2, Copy, KeyRound, Loader2, Plus, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { developerApi } from "../features/developer/developerApi.js";

const DEFAULT_SCOPES = ["chat:write", "stream:write", "models:read", "analytics:read"];

function DeveloperNav() {
  const location = useLocation();
  const links = [
    ["/developer", "Overview"],
    ["/developer/api-keys", "API Keys"],
    ["/developer/usage", "Usage"],
    ["/developer/logs", "Logs"],
    ["/developer/docs", "Docs"],
  ];
  return (
    <aside className="rounded-lg border border-white/10 bg-white/[0.035] p-3 lg:sticky lg:top-5 lg:h-fit">
      <Link className="mb-3 block rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm font-bold text-white/60 hover:text-white" to="/dashboard">Back to dashboard</Link>
      {links.map(([to, label]) => (
        <Link key={to} className={`block rounded-lg px-3 py-2 text-sm font-bold ${location.pathname === to ? "bg-cyan-300/12 text-white" : "text-white/55 hover:bg-white/10 hover:text-white"}`} to={to}>{label}</Link>
      ))}
    </aside>
  );
}

function Shell({ children }) {
  return (
    <main className="min-h-screen bg-codrai-ink px-4 py-6 text-white sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[240px_1fr]">
        <DeveloperNav />
        <section>{children}</section>
      </div>
    </main>
  );
}

export function DeveloperOverviewPage() {
  const [usage, setUsage] = useState(null);
  const [docs, setDocs] = useState(null);
  useEffect(() => {
    Promise.all([developerApi.usage(), developerApi.docs()]).then(([usageData, docsData]) => {
      setUsage(usageData);
      setDocs(docsData);
    });
  }, []);
  return (
    <Shell>
      <header className="mb-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">CODRAI Developer Platform</p>
        <h1 className="mt-2 text-3xl font-black">Public AI API ecosystem</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">Create CODRAI keys, call OpenAI-compatible APIs, monitor usage, and route requests through the production orchestration layer.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric icon={KeyRound} label="Monthly requests" value={usage?.summary?.requests ?? "-"} />
        <Metric icon={BarChart3} label="Monthly tokens" value={usage?.summary?.tokens ?? "-"} />
        <Metric icon={ShieldCheck} label="API base" value={docs?.baseUrl || "/api/v1"} />
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <Panel title="Quick start" icon={Code2}>
          <pre className="overflow-auto rounded-lg bg-black/35 p-4 text-xs text-cyan-50">{`curl http://localhost:5000/api/v1/chat/completions \\
  -H "Authorization: Bearer sk_codrai_..." \\
  -H "Content-Type: application/json" \\
  -d '{"model":"codrai-balanced","messages":[{"role":"user","content":"Hello CODRAI"}]}'`}</pre>
        </Panel>
        <Panel title="Live platform state" icon={Activity}>
          <p className="text-sm leading-6 text-white/60">Usage, request logs, provider status, and key activity are persisted in PostgreSQL. Provider execution requires configured upstream provider keys.</p>
        </Panel>
      </div>
    </Shell>
  );
}

function Metric({ icon: Icon, label, value }) {
  return <div className="glass-card rounded-lg p-5"><Icon className="h-5 w-5 text-codrai-cyan" /><p className="mt-4 text-sm text-white/55">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>;
}

function Panel({ title, icon: Icon, children }) {
  return <article className="glass-card rounded-lg p-5"><div className="mb-4 flex items-center gap-2"><Icon className="h-5 w-5 text-codrai-cyan" /><h2 className="font-black">{title}</h2></div>{children}</article>;
}

export function DeveloperApiKeysPage() {
  const [data, setData] = useState({ keys: [], scopes: [] });
  const [name, setName] = useState("Production API Key");
  const [scopes, setScopes] = useState(DEFAULT_SCOPES);
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setData(await developerApi.keys());
  }

  useEffect(() => { load().catch((err) => setError(err.response?.data?.message || err.message)); }, []);

  async function createKey() {
    setLoading(true);
    setError("");
    try {
      const created = await developerApi.createKey({ name, scopes });
      setSecret(created.key.secretKey);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function action(fn) {
    setLoading(true);
    setError("");
    try {
      const result = await fn();
      if (result?.key?.secretKey) setSecret(result.key.secretKey);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <Header title="API keys" subtitle="Generate, rotate, revoke, and scope CODRAI public API credentials." />
      {error && <Alert text={error} />}
      {secret && <div className="mb-5 rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">Secret key created. Store it now: <code className="break-all">{secret}</code></div>}
      <section className="glass-card mb-5 rounded-lg p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_2fr_auto]">
          <input className="h-11 rounded-lg border border-white/10 bg-black/25 px-3 text-sm outline-none" value={name} onChange={(event) => setName(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            {(data.scopes || DEFAULT_SCOPES).map((scope) => (
              <button key={scope} className={`rounded-full border px-3 py-1 text-xs font-bold ${scopes.includes(scope) ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-white/[0.04] text-white/50"}`} type="button" onClick={() => setScopes((current) => current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope])}>{scope}</button>
            ))}
          </div>
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950 disabled:opacity-60" type="button" onClick={createKey} disabled={loading || scopes.length === 0}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create</button>
        </div>
      </section>
      <section className="space-y-3">
        {(data.keys || []).map((key) => (
          <article key={key.id} className="glass-card rounded-lg p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-black">{key.name}</h2>
                <p className="mt-1 break-all text-sm text-white/50">{key.publicKey} / {key.secretKeyMasked}</p>
                <p className="mt-2 text-xs text-white/40">Status: {key.status} - Used {key.usageCount} times</p>
              </div>
              <div className="flex gap-2">
                <button className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.06]" onClick={() => navigator.clipboard.writeText(key.publicKey)} title="Copy public key" type="button"><Copy className="h-4 w-4" /></button>
                <button className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.06]" onClick={() => action(() => developerApi.rotateKey(key.id))} title="Rotate" type="button"><RotateCcw className="h-4 w-4" /></button>
                <button className="grid h-10 w-10 place-items-center rounded-lg border border-red-300/20 bg-red-400/10 text-red-100" onClick={() => action(() => developerApi.revokeKey(key.id))} title="Revoke" type="button"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">{(key.scopes || []).map((scope) => <span key={scope} className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-xs text-white/55">{scope}</span>)}</div>
          </article>
        ))}
      </section>
    </Shell>
  );
}

export function DeveloperUsagePage() {
  const [usage, setUsage] = useState(null);
  useEffect(() => { developerApi.usage().then(setUsage); }, []);
  const providerRows = usage?.byProvider || [];
  return (
    <Shell>
      <Header title="Usage analytics" subtitle="Token, request, latency, cost, and provider usage persisted from public API calls." />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={Activity} label="Requests" value={usage?.summary?.requests ?? "-"} />
        <Metric icon={BarChart3} label="Tokens" value={usage?.summary?.tokens ?? "-"} />
        <Metric icon={ShieldCheck} label="Errors" value={usage?.summary?.errors ?? "-"} />
        <Metric icon={Code2} label="Avg latency" value={usage?.summary?.avg_latency_ms ? `${Math.round(Number(usage.summary.avg_latency_ms))} ms` : "-"} />
      </div>
      <Panel title="Provider usage" icon={BarChart3}>
        <div className="space-y-2">{providerRows.map((row) => <div key={row.provider} className="flex justify-between rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm"><span>{row.provider}</span><span>{row.requests} requests / {row.tokens} tokens</span></div>)}</div>
      </Panel>
    </Shell>
  );
}

export function DeveloperLogsPage() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { developerApi.logs().then((data) => setLogs(data.recent || [])); }, []);
  return (
    <Shell>
      <Header title="Realtime request logs" subtitle="Recent public API events, status codes, correlation IDs, and provider routing outcomes." />
      <div className="space-y-2">{logs.map((log) => <div key={log.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><span>{log.method} {log.route}</span><span>{log.status} - {log.latency_ms} ms - {log.total_tokens} tokens</span></div><p className="mt-1 text-xs text-white/45">{log.correlation_id || "no correlation id"} {log.error_message ? `- ${log.error_message}` : ""}</p></div>)}</div>
    </Shell>
  );
}

export function DeveloperDocsPage() {
  const [docs, setDocs] = useState(null);
  useEffect(() => { developerApi.docs().then(setDocs); }, []);
  const js = `import { Codrai } from "@codrai/sdk";\nconst codrai = new Codrai({ apiKey: process.env.CODRAI_API_KEY });\nconst result = await codrai.chat.completions.create({\n  model: "codrai-balanced",\n  messages: [{ role: "user", content: "Build a launch plan" }]\n});`;
  const py = `from codrai import Codrai\nclient = Codrai(api_key=\"sk_codrai_...\")\nresult = client.chat.completions.create(\n    model=\"codrai-balanced\",\n    messages=[{\"role\":\"user\",\"content\":\"Build a launch plan\"}]\n)`;
  return (
    <Shell>
      <Header title="API documentation" subtitle="OpenAI-compatible CODRAI public API, streaming, signing, and SDK examples." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Endpoints" icon={BookOpen}>
          <ul className="space-y-2 text-sm text-white/65">{(docs?.endpoints || []).map((endpoint) => <li key={endpoint} className="rounded-lg bg-white/[0.04] p-2">{endpoint}</li>)}</ul>
        </Panel>
        <Panel title="JavaScript SDK" icon={Code2}><pre className="overflow-auto rounded-lg bg-black/35 p-4 text-xs">{js}</pre></Panel>
        <Panel title="Python SDK" icon={Code2}><pre className="overflow-auto rounded-lg bg-black/35 p-4 text-xs">{py}</pre></Panel>
        <Panel title="Authentication" icon={ShieldCheck}><p className="text-sm leading-6 text-white/60">{docs?.auth || "Authorization: Bearer sk_codrai_..."}</p><p className="mt-2 text-sm leading-6 text-white/60">{docs?.signing}</p></Panel>
      </div>
    </Shell>
  );
}

function Header({ title, subtitle }) {
  return <header className="mb-5"><p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">Developer Console</p><h1 className="mt-2 text-3xl font-black">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">{subtitle}</p></header>;
}

function Alert({ text }) {
  return <div className="mb-4 rounded-lg border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{text}</div>;
}
