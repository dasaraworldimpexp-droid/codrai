import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { authApi } from "../authApi.js";
import { useAuthStore } from "../authStore.js";

const GOOGLE_SCRIPT_ID = "codrai-google-identity-services";

function GoogleLogo() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.1 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.8l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function loadGoogleScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  const existing = document.getElementById(GOOGLE_SCRIPT_ID);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Google authentication script could not be loaded."));
    document.head.appendChild(script);
  });
}

export default function GoogleAuthButton({ onSuccess, onError, rememberMe = true }) {
  const googleLogin = useAuthStore((state) => state.googleLogin);
  const [config, setConfig] = useState({ loading: true, configured: false, clientId: "", status: "checking" });
  const [busy, setBusy] = useState(false);
  const codeClientRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    authApi.googleConfig()
      .then((result) => {
        if (!mounted) return;
        setConfig({
          loading: false,
          configured: Boolean(result.configured && result.clientId),
          clientId: result.clientId || "",
          status: result.status || "missing",
          authorizedRedirect: result.authorizedRedirect || `${window.location.origin}/auth/google/callback`,
        });
      })
      .catch(() => {
        if (mounted) setConfig({ loading: false, configured: false, clientId: "", status: "unreachable" });
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function startGoogleAuth() {
    if (busy) return;
    if (!config.configured || !config.clientId) {
      onError?.(config.status === "unreachable"
        ? "Google sign-in is temporarily unavailable because CODRAI could not reach the authentication service."
        : "Google sign-in is not active for this CODRAI deployment. Configure the Google OAuth client for https://codraios.com and try again.");
      return;
    }
    setBusy(true);
    try {
      await loadGoogleScript();
      const csrfState = crypto.randomUUID?.() || String(Date.now());
      sessionStorage.setItem("codrai_google_oauth_state", csrfState);
      sessionStorage.setItem("codrai_google_oauth_return", window.location.pathname === "/signin" ? "/dashboard" : window.location.pathname);
      const redirectUri = config.authorizedRedirect || `${window.location.origin}/auth/google/callback`;
      codeClientRef.current = window.google.accounts.oauth2.initCodeClient({
        client_id: config.clientId,
        scope: "openid email profile",
        ux_mode: "popup",
        state: csrfState,
        callback: async (response) => {
          try {
            if (response.error) throw new Error(response.error_description || response.error);
            const expectedState = sessionStorage.getItem("codrai_google_oauth_state");
            sessionStorage.removeItem("codrai_google_oauth_state");
            if (response.state && expectedState && response.state !== expectedState) {
              throw new Error("Google security state check failed. Please try again.");
            }
            if (!response.code) throw new Error("Google did not return an authorization code.");
            const result = await googleLogin({ code: response.code, redirectUri: "postmessage", rememberMe });
            sessionStorage.removeItem("codrai_google_oauth_return");
            onSuccess?.(result);
          } catch (error) {
            onError?.(error.response?.data?.message || error.message || "Google sign-in failed.");
          } finally {
            setBusy(false);
          }
        },
        error_callback: (error) => {
          setBusy(false);
          const type = error?.type || "";
          if (type === "popup_closed") {
            sessionStorage.removeItem("codrai_google_oauth_state");
            sessionStorage.removeItem("codrai_google_oauth_return");
            onError?.("Google sign-in was closed before completion.");
            return;
          }
          startRedirectGoogleAuth(csrfState, redirectUri);
        },
      });
      codeClientRef.current.requestCode();
    } catch (error) {
      setBusy(false);
      onError?.(error.message || "Google sign-in could not be started.");
    }
  }

  function startRedirectGoogleAuth(csrfState, redirectUri) {
    try {
      const redirectClient = window.google.accounts.oauth2.initCodeClient({
        client_id: config.clientId,
        scope: "openid email profile",
        ux_mode: "redirect",
        redirect_uri: redirectUri,
        state: csrfState,
      });
      redirectClient.requestCode();
    } catch (error) {
      setBusy(false);
      onError?.(error.message || "Google sign-in redirect could not be started.");
    }
  }

  const disabled = config.loading || busy;
  const label = config.loading
    ? "Checking Google authentication"
    : "Continue with Google";

  return (
    <button
      className="codrai-google-auth-button"
      type="button"
      onClick={startGoogleAuth}
      disabled={disabled}
      title="Continue with Google"
    >
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleLogo />}
      <span>{label}</span>
    </button>
  );
}
