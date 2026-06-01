import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CodraiBrandMark from "../components/CodraiBrandMark.jsx";
import { useAuthStore } from "../features/auth/authStore.js";

function oauthErrorMessage(error, description) {
  if (description) return description;
  if (error === "access_denied") return "Google sign-in was cancelled before CODRAI received permission.";
  if (error) return `Google sign-in failed: ${error}`;
  return "Google sign-in failed. Please try again.";
}

export default function GoogleOAuthCallbackPage() {
  const navigate = useNavigate();
  const googleLogin = useAuthStore((state) => state.googleLogin);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function completeGoogleLogin() {
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get("error");
      const oauthDescription = params.get("error_description");
      const code = params.get("code");
      const state = params.get("state");
      const expectedState = sessionStorage.getItem("codrai_google_oauth_state");
      const returnTo = sessionStorage.getItem("codrai_google_oauth_return") || "/dashboard";

      try {
        if (oauthError) throw new Error(oauthErrorMessage(oauthError, oauthDescription));
        if (!code) throw new Error("Google did not return an authorization code.");
        if (!state || !expectedState || state !== expectedState) {
          throw new Error("Google security state check failed. Please restart sign-in.");
        }

        sessionStorage.removeItem("codrai_google_oauth_state");
        sessionStorage.removeItem("codrai_google_oauth_return");
        await googleLogin({
          code,
          redirectUri: `${window.location.origin}/auth/google/callback`,
          rememberMe: true,
        });
        if (active) navigate(returnTo.startsWith("/") ? returnTo : "/dashboard", { replace: true });
      } catch (err) {
        sessionStorage.removeItem("codrai_google_oauth_state");
        sessionStorage.removeItem("codrai_google_oauth_return");
        if (active) setError(err.response?.data?.message || err.message || "Google sign-in could not be completed.");
      }
    }

    completeGoogleLogin();
    return () => {
      active = false;
    };
  }, [googleLogin, navigate]);

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-codrai-ink px-5 py-10 text-white">
      <div className="codrai-grid absolute inset-0 opacity-35" />
      <section className="glass-card relative w-full max-w-md rounded-lg p-7 text-center">
        <div className="flex justify-center">
          <CodraiBrandMark to={null} />
        </div>
        {!error ? (
          <>
            <Loader2 className="mx-auto mt-8 h-9 w-9 animate-spin text-codrai-cyan" />
            <h1 className="mt-5 text-2xl font-black">Completing Google sign-in</h1>
            <p className="mt-3 text-sm leading-6 text-white/65">CODRAI is validating your Google account and creating a secure session.</p>
          </>
        ) : (
          <>
            <AlertTriangle className="mx-auto mt-8 h-9 w-9 text-red-300" />
            <h1 className="mt-5 text-2xl font-black">Google sign-in failed</h1>
            <p className="mt-3 rounded-lg border border-red-300/20 bg-red-400/10 p-3 text-sm leading-6 text-red-100">{error}</p>
            <Link className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-black text-slate-950" to="/signin" replace>
              Back to sign in
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
