import { Activity, ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Save, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CodraiBrandMark from "../components/CodraiBrandMark.jsx";
import { authApi } from "../features/auth/authApi.js";

const DEFAULT_ORIGIN = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
const DEFAULT_GOOGLE_CALLBACK = `${DEFAULT_ORIGIN}/auth/google/callback`;

export default function GoogleOAuthSettingsPage() {
  const [form, setForm] = useState({
    clientId: "",
    clientSecret: "",
    redirectUri: "postmessage",
    authorizedOrigin: DEFAULT_ORIGIN,
    authorizedRedirect: DEFAULT_GOOGLE_CALLBACK,
  });
  const [status, setStatus] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const ready = useMemo(() => Boolean(status?.configured && status?.status !== "error"), [status]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await authApi.googleSettings();
      setStatus(result);
      setForm({
        clientId: result.clientId || "",
        clientSecret: "",
        redirectUri: result.redirectUri || "postmessage",
        authorizedOrigin: result.authorizedOrigin || DEFAULT_ORIGIN,
        authorizedRedirect: result.authorizedRedirect || DEFAULT_GOOGLE_CALLBACK,
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await authApi.saveGoogleSettings(form);
      setStatus(result);
      setForm((current) => ({ ...current, clientSecret: "" }));
      setMessage("Google OAuth settings saved securely.");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setMessage("");
    setError("");
    try {
      const result = await authApi.testGoogleSettings();
      setTestResult(result);
      await load();
      setMessage(result.status === "pass" ? "Google OAuth connection test passed." : "Google OAuth connection test completed with failures.");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <main className="codrai-os-bg min-h-screen bg-codrai-ink px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-white/62 hover:text-white" to="/dashboard"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
            <CodraiBrandMark className="mb-6" />
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">Enterprise OAuth</p>
            <h1 className="mt-2 text-3xl font-black">Google sign-in activation</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/62">
              Store real Google OAuth credentials securely, validate Google discovery access, and activate the production Continue with Google login flow.
            </p>
          </div>
          <div className={`rounded-2xl border p-4 ${ready ? "border-emerald-300/25 bg-emerald-400/10" : "border-amber-300/25 bg-amber-400/10"}`}>
            <div className="flex items-center gap-3">
              {ready ? <CheckCircle2 className="h-5 w-5 text-emerald-200" /> : <TriangleAlert className="h-5 w-5 text-amber-200" />}
              <div>
                <p className="text-sm font-black">{ready ? "Google OAuth ready" : "Google OAuth needs attention"}</p>
                <p className="mt-1 text-xs text-white/62">Source: {status?.source || "checking"}</p>
              </div>
            </div>
          </div>
        </header>

        {(message || error) && (
          <div className={`mb-5 rounded-xl border p-3 text-sm ${error ? "border-red-300/20 bg-red-400/10 text-red-100" : "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"}`}>
            {error || message}
          </div>
        )}

        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <form className="glass-card rounded-2xl p-5" onSubmit={save}>
            <div className="mb-5 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-codrai-cyan" />
              <div>
                <h2 className="text-xl font-black">Google Cloud credentials</h2>
                <p className="mt-1 text-sm text-white/55">Client Secret is encrypted at rest and never returned to the browser.</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-white/72">Google Client ID</span>
                <input className="codrai-input h-12 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm outline-none" value={form.clientId} onChange={(event) => update("clientId", event.target.value)} placeholder="000000000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com" required />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-white/72">Google Client Secret</span>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-white/35" />
                  <input className="codrai-input h-12 w-full rounded-lg border border-white/10 bg-black/25 pl-9 pr-11 text-sm outline-none" type={showSecret ? "text" : "password"} value={form.clientSecret} onChange={(event) => update("clientSecret", event.target.value)} placeholder={status?.clientSecretConfigured ? "Leave blank to keep existing encrypted secret" : "Paste Google Client Secret"} />
                  <button className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded text-white/55 hover:bg-white/10 hover:text-white" type="button" onClick={() => setShowSecret((visible) => !visible)}>
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-white/72">Redirect URI Mode</span>
                <input className="codrai-input h-12 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm outline-none" value={form.redirectUri} onChange={(event) => update("redirectUri", event.target.value)} placeholder="postmessage" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-white/72">Authorized JavaScript Origin</span>
                <input className="codrai-input h-12 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm outline-none" value={form.authorizedOrigin} onChange={(event) => update("authorizedOrigin", event.target.value)} required />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-white/72">Authorized Redirect URL</span>
                <input className="codrai-input h-12 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm outline-none" value={form.authorizedRedirect} onChange={(event) => update("authorizedRedirect", event.target.value)} required />
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button className="codrai-primary-button inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950 disabled:opacity-60" type="submit" disabled={saving || loading}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Google OAuth
              </button>
              <button className="codrai-ghost-button inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-white disabled:opacity-60" type="button" onClick={testConnection} disabled={testing || loading || !status?.clientSecretConfigured}>
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                Test Google Connection
              </button>
            </div>
          </form>

          <aside className="space-y-5">
            <section className="glass-card rounded-2xl p-5">
              <h2 className="text-xl font-black">Connection status</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-white/55">Configured</dt><dd className="font-bold">{status?.configured ? "Yes" : "No"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-white/55">Secret</dt><dd className="font-bold">{status?.clientSecretConfigured ? "Encrypted" : "Missing"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-white/55">Status</dt><dd className="font-bold capitalize">{status?.status || "unknown"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-white/55">Last check</dt><dd className="font-bold">{status?.lastCheckedAt ? new Date(status.lastCheckedAt).toLocaleString() : "-"}</dd></div>
              </dl>
              {status?.lastError && <p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">{status.lastError}</p>}
            </section>

            {testResult && (
              <section className="glass-card rounded-2xl p-5">
                <h2 className="text-xl font-black">Connection test</h2>
                <div className="mt-4 space-y-3">
                  {(testResult.checks || []).map((check) => (
                    <div key={check.name} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold">{check.name.replaceAll("_", " ")}</span>
                        <span className={check.status === "pass" ? "text-emerald-200" : "text-amber-200"}>{check.status}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-white/55">{check.detail}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
