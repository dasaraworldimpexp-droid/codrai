import { LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../authApi.js";
import { useAuthStore } from "../authStore.js";

export default function AuthPanel() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState(localStorage.getItem("codrai_token") ? "Signed in" : "Not signed in");
  const [error, setError] = useState("");
  const storeLogout = useAuthStore((state) => state.logout);

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const result = mode === "signup"
        ? await authApi.signup({ email, password, name })
        : await authApi.login({ email, password });
      localStorage.setItem("codrai_token", result.token);
      if (result.refreshToken) localStorage.setItem("codrai_refresh_token", result.refreshToken);
      if (result.workspaceId) localStorage.setItem("codrai_workspace_id", result.workspaceId);
      if (result.user?.id) localStorage.setItem("codrai_user_id", result.user.id);
      setStatus("Signed in");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function logout() {
    await storeLogout();
    setStatus("Not signed in");
  }

  return (
    <section className="glass-card rounded-lg p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Account</h2>
          <p className="mt-1 text-sm text-white/55">{status}</p>
        </div>
        <button className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-bold text-white" type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Signup" : "Login"}
        </button>
      </div>

      <form className="space-y-3" onSubmit={submit}>
        {mode === "signup" && (
          <input className="h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
        )}
        <input className="h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <input className="h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none" placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        {error && <p className="text-sm text-red-200">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950" type="submit">
            {mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {mode === "login" ? "Login" : "Signup"}
          </button>
          <button className="h-11 rounded-lg border border-white/10 bg-white/[0.06] px-4 text-sm font-bold text-white" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </form>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm">
        <Link className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-bold text-white" to="/signin">Full sign in</Link>
        <Link className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-bold text-white" to="/signup">Create account</Link>
      </div>
    </section>
  );
}
