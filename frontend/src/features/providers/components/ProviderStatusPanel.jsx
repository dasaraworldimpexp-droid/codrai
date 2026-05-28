import { Activity, AlertTriangle, CheckCircle2, Gauge } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { providerApi } from "../providerApi.js";

export default function ProviderStatusPanel() {
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setValidation(await providerApi.validate());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const checks = validation?.checks || [];

  return (
    <section className="glass-card codrai-premium-panel rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">Providers</p>
          <h2 className="mt-2 text-xl font-black text-white">Live provider health</h2>
        </div>
        <button
          className="codrai-ghost-button inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white"
          type="button"
          onClick={refresh}
          disabled={loading}
        >
          <Activity className="h-4 w-4" />
          Test
        </button>
        <Link className="codrai-primary-button inline-flex h-10 items-center rounded-lg bg-white px-3 text-sm font-black text-slate-950" to="/settings/providers">
          Configure
        </Link>
      </div>

      {checks.length === 0 ? (
        <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-white/62">
          Provider validation requires the backend runtime to be running. Missing API keys will show as configuration errors.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {checks.map((check) => (
            <div key={check.provider} className={`codrai-provider-card rounded-lg border border-white/10 bg-white/[0.045] p-4 ${check.status === "ok" ? "is-healthy" : "is-warning"}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{check.provider}</span>
                {check.status === "ok" ? (
                  <CheckCircle2 className="codrai-health-icon h-5 w-5 text-codrai-mint" />
                ) : (
                  <AlertTriangle className="codrai-health-icon h-5 w-5 text-codrai-gold" />
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-white/55">
                <Gauge className="h-4 w-4" />
                {check.latencyMs} ms {check.score?.score ? `- score ${check.score.score}` : ""}
              </div>
              <p className="mt-2 text-xs text-white/40">
                Streaming {check.supportsStreaming ? "supported" : "not supported"} {check.maxTokens ? `- ${check.maxTokens} max tokens` : ""}
              </p>
              {check.error && <p className="mt-3 text-xs leading-5 text-white/45">{check.error}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
