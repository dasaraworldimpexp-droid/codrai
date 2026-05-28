import { Activity, BarChart3, Bot, Building2, Cloud, Coins, Database, Gauge, Lock, Network, Radio, ShieldCheck, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { enterpriseCloudApi } from "../features/enterprise-cloud/enterpriseCloudApi.js";

export default function GlobalControlCenterPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [socketState, setSocketState] = useState("connecting");
  const [liveEvents, setLiveEvents] = useState(0);
  const [routeProbe, setRouteProbe] = useState(null);

  useEffect(() => {
    enterpriseCloudApi.controlCenter().then(setData).catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  useEffect(() => {
    const ws = new WebSocket(`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:5000/ws`);
    ws.addEventListener("open", () => {
      setSocketState("connected");
      ws.send(JSON.stringify({ type: "subscribe", channel: "workspace:control-center" }));
    });
    ws.addEventListener("message", () => setLiveEvents((count) => count + 1));
    ws.addEventListener("close", () => setSocketState("disconnected"));
    ws.addEventListener("error", () => setSocketState("error"));
    return () => ws.close();
  }, []);

  async function runBenchmarks() {
    setError("");
    setStatus("Running provider benchmarks...");
    try {
      const result = await enterpriseCloudApi.runProviderBenchmarks();
      const updated = await enterpriseCloudApi.controlCenter();
      setData(updated);
      setStatus(`Benchmarks completed: ${result.summary.completed}/${result.summary.total} providers configured.`);
    } catch (err) {
      setStatus("");
      setError(err.response?.data?.message || err.message);
    }
  }

  async function recommendRoute() {
    setError("");
    setStatus("Checking router recommendation...");
    try {
      const result = await enterpriseCloudApi.recommendRoute({ taskType: "reasoning", qualityTier: "balanced", latencyTargetMs: 2500 });
      setRouteProbe(result);
      setStatus(result.status === "routable" ? `Router selected ${result.provider}.` : `Router blocked: ${result.error}`);
    } catch (err) {
      setStatus("");
      setError(err.response?.data?.message || err.message);
    }
  }

  const providers = data?.providerHealth?.providers || [];
  const traffic = data?.traffic || {};
  const tokenTotal = useMemo(() => {
    return (traffic.modelUsage || []).reduce((sum, item) => sum + Number(item.tokens || 0), Number(traffic.developerUsage?.summary?.tokens || 0));
  }, [traffic]);

  return (
    <main className="min-h-screen bg-codrai-ink px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link className="mb-4 inline-block text-sm font-bold text-white/55 hover:text-white" to="/dashboard">Back to dashboard</Link>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">Global AI Control Center</p>
            <h1 className="mt-2 text-3xl font-black">CODRAI Operating System Command</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">Realtime AI traffic, routing, tokens, provider health, WebSocket telemetry, deployments, governance, audit, billing, and security policy state from the live CODRAI runtime.</p>
          </div>
          <Link className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-slate-950" to="/enterprise-cloud">Enterprise Cloud</Link>
        </header>

        {error && <div className="mb-5 rounded-lg border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{error}</div>}
        {status && <div className="mb-5 rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">{status}</div>}

        <section className="grid gap-4 md:grid-cols-4">
          <Metric icon={Zap} label="AI requests" value={traffic.developerUsage?.summary?.requests ?? 0} />
          <Metric icon={BarChart3} label="Tokens observed" value={tokenTotal} />
          <Metric icon={Network} label="Providers" value={providers.length || 0} />
          <Metric icon={Radio} label={`WebSocket ${socketState}`} value={(data?.websocketTelemetry?.recentEvents?.length ?? 0) + liveEvents} />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-2">
          <Panel title="Realtime orchestration monitoring" icon={Activity}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini label="Routing" value={data?.providerHealth?.routingMode || "-"} />
              <Mini label="Fallbacks" value={data?.providerHealth?.fallbackChain?.length ?? "-"} />
              <Mini label="Scores" value={data?.benchmarks?.latestScores?.length ?? 0} />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {providers.slice(0, 10).map((provider) => (
                <div key={provider.name} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold capitalize">{provider.name}</span>
                    <span className="text-xs text-white/50">score {provider.score?.score ?? "-"}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/45">{provider.type} - {provider.supportsStreaming ? "streaming" : "sync/queue"}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="h-10 rounded-lg bg-white px-4 text-sm font-black text-slate-950" type="button" onClick={runBenchmarks}>Run provider benchmarks</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-white" type="button" onClick={recommendRoute}>Recommend route</button>
            </div>
            {routeProbe && <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-white/62">Route status: {routeProbe.status} {routeProbe.provider ? `- ${routeProbe.provider}` : ""}{routeProbe.error ? `- ${routeProbe.error}` : ""}</div>}
          </Panel>

          <Panel title="AI traffic and token usage" icon={Gauge}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini label="Conversations" value={traffic.conversations ?? 0} />
              <Mini label="Stream events" value={traffic.streams?.length ?? 0} />
              <Mini label="Errors" value={traffic.developerUsage?.summary?.errors ?? 0} />
            </div>
            <div className="mt-4 space-y-2">
              {(traffic.modelUsage || []).slice(0, 6).map((item) => (
                <div key={`${item.provider}-${item.model}-${item.task_type}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">
                  {item.provider || "unrouted"} / {item.model || "unknown"} - {item.requests} requests - {item.tokens} tokens
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="AI workforce and app ecosystem" icon={Bot}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini label="Agent templates" value={data?.globalAiOs?.agentPlatform?.templates?.length ?? 0} />
              <Mini label="App blueprints" value={data?.globalAiOs?.appBuilder?.blueprints?.length ?? 0} />
              <Mini label="Marketplace" value={data?.globalAiOs?.marketplace?.ecosystems?.length ?? 0} />
            </div>
            <Readiness items={["autonomous_agents", "persistent_runs", "workflow_chaining", "prompt_to_app", "zip_export", "deployment_targets"]} />
          </Panel>

          <Panel title="Deployment and cloud readiness" icon={Cloud}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini label="Targets" value={data?.deployments?.targets?.length ?? 0} />
              <Mini label="Plans" value={data?.deployments?.recentPlans?.length ?? 0} />
              <Mini label="Health states" value={data?.deployments?.health?.length ?? 0} />
            </div>
            <Readiness items={data?.deployments?.cloudStack || []} />
          </Panel>

          <Panel title="Enterprise security and policy" icon={ShieldCheck}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini label="Policies" value={data?.security?.policies?.length ?? 0} />
              <Mini label="Threat rules" value={data?.security?.threats?.length ?? 0} />
              <Mini label="Audit actions" value={data?.auditLogs?.byAction?.length ?? 0} />
            </div>
            <Readiness items={data?.security?.controls || []} />
          </Panel>

          <Panel title="Team governance and monetization" icon={Building2}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini label="Teams" value={data?.governance?.teams ?? 0} />
              <Mini label="Member roles" value={data?.governance?.membersByRole?.length ?? 0} />
              <Mini label="Billing modes" value={data?.monetization?.modes?.length ?? 0} />
            </div>
            <Readiness items={["shared_billing", "subscription_tiers", "credit_wallet", "usage_metering", "creator_revenue_tables", "enterprise_contracts"]} />
          </Panel>

          <Panel title="WebSocket telemetry" icon={Radio}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini label="24h stream events" value={data?.websocketTelemetry?.streamEvents24h ?? 0} />
              <Mini label="Event types" value={data?.websocketTelemetry?.eventTypes?.length ?? 0} />
              <Mini label="Recent" value={data?.websocketTelemetry?.recentEvents?.length ?? 0} />
            </div>
          </Panel>

          <Panel title="Voice and realtime AI" icon={Radio}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini label="Voice provider" value={data?.voice?.provider?.status || "-"} />
              <Mini label="Voice sessions" value={data?.voice?.sessions?.length ?? 0} />
              <Mini label="Voice turns" value={data?.voice?.turns?.count ?? 0} />
            </div>
            <Readiness items={data?.voice?.capabilities || []} />
          </Panel>

          <Panel title="Cloud runtime readiness" icon={Cloud}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini label="Storage configs" value={data?.cloud?.objectStorage?.length ?? 0} />
              <Mini label="OAuth providers" value={data?.cloud?.oauthProviders?.length ?? 0} />
              <Mini label="Cache policies" value={data?.cloud?.edgeCachePolicies?.length ?? 0} />
            </div>
            <Readiness items={data?.cloud?.readiness || []} />
          </Panel>

          <Panel title="Performance telemetry" icon={Gauge}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini label="24h requests" value={data?.performance?.requestSummary?.requests ?? 0} />
              <Mini label="Avg latency" value={data?.performance?.requestSummary?.avg_latency_ms ? `${Math.round(Number(data.performance.requestSummary.avg_latency_ms))} ms` : "-"} />
              <Mini label="P95 latency" value={data?.performance?.requestSummary?.p95_latency_ms ? `${Math.round(Number(data.performance.requestSummary.p95_latency_ms))} ms` : "-"} />
            </div>
            <Readiness items={data?.performance?.optimizations || []} />
          </Panel>

          <Panel title="Admin observability" icon={Database}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini label="Users" value={data?.globalAiOs?.adminCloud?.users ?? 0} />
              <Mini label="Workspaces" value={data?.globalAiOs?.adminCloud?.workspaces ?? 0} />
              <Mini label="API key states" value={data?.globalAiOs?.adminCloud?.apiKeys?.length ?? 0} />
            </div>
          </Panel>

          <Panel title="Zero trust runtime" icon={Lock}>
            <Readiness items={["jwt_sessions", "hmac_public_api", "encrypted_provider_keys", "hashed_secret_keys", "rate_limits", "audit_logs", "policy_engine"]} />
          </Panel>

          <Panel title="Provider benchmarking" icon={Coins}>
            <Readiness items={data?.benchmarks?.scoringInputs || []} />
          </Panel>
        </section>
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value }) {
  return <div className="glass-card rounded-lg p-5"><Icon className="h-5 w-5 text-codrai-cyan" /><p className="mt-4 text-sm text-white/55">{label}</p><p className="mt-2 text-2xl font-black capitalize">{value}</p></div>;
}

function Panel({ title, icon: Icon, children }) {
  return <article className="glass-card rounded-lg p-5"><div className="mb-4 flex items-center gap-2"><Icon className="h-5 w-5 text-codrai-cyan" /><h2 className="font-black">{title}</h2></div>{children}</article>;
}

function Mini({ label, value }) {
  return <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3"><p className="text-xs text-white/45">{label}</p><p className="mt-1 font-black">{value}</p></div>;
}

function Readiness({ items }) {
  return <ul className="mt-4 grid gap-2 text-sm text-white/60 sm:grid-cols-2">{items.map((item) => <li key={item} className="rounded-lg border border-white/10 bg-white/[0.04] p-2">{item}</li>)}</ul>;
}
