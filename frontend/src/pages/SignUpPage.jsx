import { ArrowRight, Building2, KeyRound, Mail, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CodraiBrandMark from "../components/CodraiBrandMark.jsx";
import { useAuthStore } from "../features/auth/authStore.js";

export default function SignUpPage() {
  const navigate = useNavigate();
  const signup = useAuthStore((state) => state.signup);
  const loading = useAuthStore((state) => state.loading);
  const [form, setForm] = useState({ name: "", email: "", password: "", rememberMe: true });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const result = await signup(form);
      if (result.emailVerification?.token) {
        setNotice(`Development verification token: ${result.emailVerification.token}`);
      }
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-codrai-ink text-white">
      <div className="codrai-grid absolute inset-0 opacity-40" />
      <section className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_480px]">
        <div>
          <CodraiBrandMark />
          <h1 className="mt-10 max-w-3xl text-5xl font-black leading-tight">Create your production AI workspace.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/62">
            CODRAI stores your sessions, workspaces, audit trail, and provider configuration in PostgreSQL with encrypted provider keys.
          </p>
        </div>

        <form className="glass-card rounded-lg p-6" onSubmit={submit}>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">New workspace</p>
          <h2 className="mt-2 text-2xl font-black">Sign up</h2>
          <div className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-white/70"><UserRound className="h-4 w-4" /> Name</span>
              <input className="h-12 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm outline-none focus:border-cyan-300/50" value={form.name} onChange={(event) => update("name", event.target.value)} required />
            </label>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-white/70"><Mail className="h-4 w-4" /> Email</span>
              <input className="h-12 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm outline-none focus:border-cyan-300/50" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required />
            </label>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-white/70"><KeyRound className="h-4 w-4" /> Password</span>
              <input className="h-12 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm outline-none focus:border-cyan-300/50" type="password" value={form.password} onChange={(event) => update("password", event.target.value)} minLength={8} required />
            </label>
            <label className="flex items-center gap-2 text-sm text-white/62"><input type="checkbox" checked={form.rememberMe} onChange={(event) => update("rememberMe", event.target.checked)} /> Remember this device</label>
          </div>
          {error && <p className="mt-4 rounded-lg border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}
          {notice && <p className="mt-4 rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">{notice}</p>}
          <button className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950 disabled:opacity-60" type="submit" disabled={loading}>
            Create workspace <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-5 text-sm text-white/55">Already have access? <Link className="font-bold text-white" to="/signin">Sign in</Link></p>
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-white/55">
            <Building2 className="h-4 w-4 shrink-0 text-codrai-cyan" />
            First registered user receives admin role automatically.
          </div>
        </form>
      </section>
    </main>
  );
}
