import { Activity, ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Save, Trash2, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { providerApi } from "../features/providers/providerApi.js";

function badge(provider, health) {
  const healthCheck = health?.checks?.find((check) => check.provider === provider.name);
  if (healthCheck?.status === "ok") return { label: "ACTIVE", className: "border-emerald-300/25 bg-emerald-400/10 text-emerald-100", icon: CheckCircle2 };
  if (provider.configured) return { label: "SAVED", className: "border-cyan-300/25 bg-cyan-400/10 text-cyan-100", icon: CheckCircle2 };
  return { label: "MISSING", className: "border-amber-300/25 bg-amber-400/10 text-amber-100", icon: TriangleAlert };
}

export default function ProviderSettingsPage() {
  const [providers, setProviders] = useState([]);
  const [health, setHealth] = useState(null);
  const [values, setValues] = useState({});
  const [visible, setVisible] = useState({});
  const [saving, setSaving] = useState("");
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const activeCount = useMemo(() => (health?.checks || []).filter((check) => check.status === "ok").length, [health]);

  async function load() {
    setError("");
    const [settings, validation] = await Promise.all([
      providerApi.settings(),
      providerApi.validate(),
    ]);
    setProviders(settings.providers || []);
    setHealth(validation);
  }

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  async function save(providerName) {
    setSaving(providerName);
    setError("");
    setToast("");
    try {
      await providerApi.save(providerName, values[providerName]);
      setValues((current) => ({ ...current, [providerName]: "" }));
      await load();
      setToast(`${providerName} key saved securely.`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving("");
    }
  }

  async function remove(providerName) {
    setSaving(providerName);
    setError("");
    setToast("");
    try {
      await providerApi.remove(providerName);
      await load();
      setToast(`${providerName} key removed.`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving("");
    }
  }

  async function testConnections() {
    setTesting(true);
    setError("");
    try {
      setHealth(await providerApi.validate());
      setToast("Provider health check completed.");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <main className="min-h-screen bg-codrai-ink px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-white/62 hover:text-white" to="/dashboard"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">Provider Settings</p>
            <h1 className="mt-2 text-3xl font-black">Encrypted AI provider configuration</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Keys are stored encrypted in PostgreSQL and resolved at runtime for chat, image, video, and voice providers.</p>
          </div>
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950 disabled:opacity-60" type="button" onClick={testConnections} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
            Test all providers
          </button>
        </header>

        {(toast || error) && (
          <div className={`mb-5 rounded-lg border p-3 text-sm ${error ? "border-red-300/20 bg-red-400/10 text-red-100" : "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"}`}>
            {error || toast}
          </div>
        )}

        <section className="mb-5 grid gap-4 md:grid-cols-3">
          <div className="glass-card rounded-lg p-5">
            <p className="text-sm text-white/55">Active providers</p>
            <p className="mt-2 text-3xl font-black">{activeCount}/{providers.length || 6}</p>
          </div>
          <div className="glass-card rounded-lg p-5">
            <p className="text-sm text-white/55">Total validation latency</p>
            <p className="mt-2 text-3xl font-black">{health?.totalLatencyMs ?? "-"} ms</p>
          </div>
          <div className="glass-card rounded-lg p-5">
            <p className="text-sm text-white/55">Runtime status</p>
            <p className="mt-2 text-3xl font-black capitalize">{health?.status || "unknown"}</p>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          {providers.map((provider) => {
            const state = badge(provider, health);
            const Icon = state.icon;
            const healthCheck = health?.checks?.find((check) => check.provider === provider.name);
            const inputType = visible[provider.name] ? "text" : "password";
            return (
              <article key={provider.name} className="glass-card rounded-lg p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">{provider.label}</h2>
                    <p className="mt-1 text-sm text-white/50">{provider.envName} {provider.keyLast4 ? `- ${provider.keyLast4}` : ""}</p>
                  </div>
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${state.className}`}>
                    <Icon className="h-4 w-4" /> {state.label}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(provider.capabilities || []).map((capability) => (
                    <span key={capability} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/60">{capability}</span>
                  ))}
                </div>
                <div className="mt-4 grid gap-2 text-xs text-white/55 sm:grid-cols-3">
                  <span>Streaming: {provider.supportsStreaming ? "yes" : "no"}</span>
                  <span>Max tokens: {provider.maxTokens || "-"}</span>
                  <span>Score: {healthCheck?.score?.score ?? "-"}</span>
                </div>
                <div className="mt-5 flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-white/35" />
                    <input
                      className="h-11 w-full rounded-lg border border-white/10 bg-black/25 pl-9 pr-11 text-sm outline-none focus:border-cyan-300/50"
                      type={inputType}
                      value={values[provider.name] || ""}
                      placeholder={provider.configured ? "Enter a new key to rotate" : `Paste ${provider.envName}`}
                      onChange={(event) => setValues((current) => ({ ...current, [provider.name]: event.target.value }))}
                    />
                    <button className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded text-white/50 hover:bg-white/10 hover:text-white" type="button" onClick={() => setVisible((current) => ({ ...current, [provider.name]: !current[provider.name] }))}>
                      {visible[provider.name] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <button className="grid h-11 w-11 place-items-center rounded-lg bg-white text-slate-950 disabled:opacity-60" type="button" title="Save" onClick={() => save(provider.name)} disabled={saving === provider.name || !values[provider.name]}>
                    {saving === provider.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </button>
                  <button className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-white/70 hover:text-white" type="button" title="Remove stored key" onClick={() => remove(provider.name)} disabled={saving === provider.name || !provider.configuredInDatabase}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {healthCheck?.error && <p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">{healthCheck.error}</p>}
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
