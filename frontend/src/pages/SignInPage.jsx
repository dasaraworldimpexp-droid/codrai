import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CodraiBrandMark from "../components/CodraiBrandMark.jsx";
import { authApi } from "../features/auth/authApi.js";
import GoogleAuthButton from "../features/auth/components/GoogleAuthButton.jsx";
import { useAuthStore } from "../features/auth/authStore.js";

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotMode, setForgotMode] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      if (forgotMode) {
        const result = await authApi.forgotPassword({ email });
        setNotice(result.resetToken ? `Reset token generated for development: ${result.resetToken}` : "Password reset instructions were queued.");
        return;
      }
      await login({ email, password, rememberMe });
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  function handleGoogleSuccess() {
    navigate(location.state?.from || "/dashboard", { replace: true });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-codrai-ink text-white">
      <div className="codrai-grid absolute inset-0 opacity-40" />
      <section className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_460px]">
        <div>
          <CodraiBrandMark />
          <h1 className="mt-10 max-w-3xl text-5xl font-black leading-tight">Secure access for your AI operating system.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/62">
            Sign in to unlock persistent conversations, encrypted provider keys, protected workspaces, and live runtime execution.
          </p>
        </div>

        <form className="glass-card rounded-lg p-6" onSubmit={submit}>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">{forgotMode ? "Recovery" : "Welcome back"}</p>
          <h2 className="mt-2 text-2xl font-black">{forgotMode ? "Forgot password" : "Sign in"}</h2>
          <div className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-white/70"><Mail className="h-4 w-4" /> Email</span>
              <input className="h-12 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm outline-none focus:border-cyan-300/50" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            {!forgotMode && (
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-bold text-white/70"><KeyRound className="h-4 w-4" /> Password</span>
                <input className="h-12 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm outline-none focus:border-cyan-300/50" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </label>
            )}
          </div>
          {!forgotMode && (
            <div className="mt-4 flex items-center justify-between text-sm text-white/62">
              <label className="flex items-center gap-2"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /> Remember me</label>
              <button className="font-bold text-codrai-cyan" type="button" onClick={() => setForgotMode(true)}>Forgot password?</button>
            </div>
          )}
          {error && <p className="mt-4 rounded-lg border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}
          {notice && <p className="mt-4 rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">{notice}</p>}
          <button className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950 disabled:opacity-60" type="submit" disabled={loading}>
            {forgotMode ? "Send recovery" : "Sign in"} <ArrowRight className="h-4 w-4" />
          </button>
          {!forgotMode && (
            <>
              <div className="codrai-auth-divider" role="separator" aria-label="or">
                <span />
                <strong>OR</strong>
                <span />
              </div>
              <GoogleAuthButton
                rememberMe={rememberMe}
                onSuccess={handleGoogleSuccess}
                onError={(message) => {
                  setNotice("");
                  setError(message);
                }}
              />
            </>
          )}
          <div className="mt-5 flex justify-between text-sm text-white/55">
            <Link className="font-bold text-white" to="/signup">Create account</Link>
            {forgotMode && <button className="font-bold text-white" type="button" onClick={() => setForgotMode(false)}>Back to sign in</button>}
          </div>
        </form>
      </section>
    </main>
  );
}
