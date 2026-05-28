import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../authStore.js";

export default function ProtectedRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  return children;
}
