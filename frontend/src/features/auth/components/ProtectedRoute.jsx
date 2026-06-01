import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../authStore.js";

export default function ProtectedRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  const loading = useAuthStore((state) => state.loading);
  const bootstrapped = useAuthStore((state) => state.bootstrapped);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const location = useLocation();

  useEffect(() => {
    if (!bootstrapped) bootstrap();
  }, [bootstrapped, bootstrap]);

  if (!bootstrapped || loading) {
    return (
      <div className="codrai-os-bg grid min-h-screen place-items-center bg-codrai-ink p-8 text-sm font-bold text-white/70">
        Restoring secure CODRAI session...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  return children;
}
