import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import CodraiBrandMark from "./components/CodraiBrandMark.jsx";
import ProtectedRoute from "./features/auth/components/ProtectedRoute.jsx";
import { ThemeProvider } from "./features/theme/ThemeProvider.jsx";

const LandingPage = lazy(() => import("./pages/LandingPage.jsx"));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const SignInPage = lazy(() => import("./pages/SignInPage.jsx"));
const SignUpPage = lazy(() => import("./pages/SignUpPage.jsx"));
const GoogleOAuthCallbackPage = lazy(() => import("./pages/GoogleOAuthCallbackPage.jsx"));
const ProviderSettingsPage = lazy(() => import("./pages/ProviderSettingsPage.jsx"));
const GoogleOAuthSettingsPage = lazy(() => import("./pages/GoogleOAuthSettingsPage.jsx"));
const EnterpriseCloudPage = lazy(() => import("./pages/EnterpriseCloudPage.jsx"));
const GlobalControlCenterPage = lazy(() => import("./pages/GlobalControlCenterPage.jsx"));
const AiStudioPage = lazy(() => import("./pages/AiStudioPage.jsx"));
const developerPages = () => import("./pages/DeveloperPage.jsx");
const DeveloperOverviewPage = lazy(() => developerPages().then((module) => ({ default: module.DeveloperOverviewPage })));
const DeveloperApiKeysPage = lazy(() => developerPages().then((module) => ({ default: module.DeveloperApiKeysPage })));
const DeveloperUsagePage = lazy(() => developerPages().then((module) => ({ default: module.DeveloperUsagePage })));
const DeveloperLogsPage = lazy(() => developerPages().then((module) => ({ default: module.DeveloperLogsPage })));
const DeveloperDocsPage = lazy(() => developerPages().then((module) => ({ default: module.DeveloperDocsPage })));

export default function App() {
  return (
    <ThemeProvider>
      <Suspense fallback={<div className="codrai-os-bg grid min-h-screen place-items-center bg-codrai-ink p-8 text-sm font-bold text-white/70"><div className="codrai-splash-loader"><CodraiBrandMark to={null} /><span>Loading CODRAI...</span></div></div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/auth/google/callback" element={<GoogleOAuthCallbackPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/settings/providers" element={<ProtectedRoute><ProviderSettingsPage /></ProtectedRoute>} />
          <Route path="/settings/google-oauth" element={<ProtectedRoute><GoogleOAuthSettingsPage /></ProtectedRoute>} />
          <Route path="/developer" element={<ProtectedRoute><DeveloperOverviewPage /></ProtectedRoute>} />
          <Route path="/developer/api-keys" element={<ProtectedRoute><DeveloperApiKeysPage /></ProtectedRoute>} />
          <Route path="/developer/usage" element={<ProtectedRoute><DeveloperUsagePage /></ProtectedRoute>} />
          <Route path="/developer/logs" element={<ProtectedRoute><DeveloperLogsPage /></ProtectedRoute>} />
          <Route path="/developer/docs" element={<ProtectedRoute><DeveloperDocsPage /></ProtectedRoute>} />
          <Route path="/enterprise-cloud" element={<ProtectedRoute><EnterpriseCloudPage /></ProtectedRoute>} />
          <Route path="/global-control-center" element={<ProtectedRoute><GlobalControlCenterPage /></ProtectedRoute>} />
          <Route path="/ai-studio" element={<ProtectedRoute><AiStudioPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ThemeProvider>
  );
}
