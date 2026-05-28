import { BarChart3, Boxes, Brain, Cloud, Code2, Command, CreditCard, Gauge, GitBranch, HardDrive, KeyRound, LayoutDashboard, LogOut, Menu, MessageSquare, Network, Radio, Search, Server, ShieldCheck, Sparkles, UserRound, Workflow, X, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AgentDashboard from "../features/agents/components/AgentDashboard.jsx";
import AgentExecutionPanel from "../features/agents/components/AgentExecutionPanel.jsx";
import ExecutionAnalyticsPanel from "../features/analytics/components/ExecutionAnalyticsPanel.jsx";
import MultiAgentTimeline from "../features/agents/components/MultiAgentTimeline.jsx";
import AuthPanel from "../features/auth/components/AuthPanel.jsx";
import AutonomousCyclePanel from "../features/autonomy/components/AutonomousCyclePanel.jsx";
import AppFactoryPanel from "../features/builder/components/AppFactoryPanel.jsx";
import StreamingChatWorkspace from "../features/chat/components/StreamingChatWorkspace.jsx";
import CloudOsControlCenter from "../features/cloud-os/components/CloudOsControlCenter.jsx";
import ComputerUsePanel from "../features/computer-use/components/ComputerUsePanel.jsx";
import CreationEngineDashboard from "../features/creation/components/CreationEngineDashboard.jsx";
import AiEmployeePanel from "../features/employees/components/AiEmployeePanel.jsx";
import { enterpriseCloudApi } from "../features/enterprise-cloud/enterpriseCloudApi.js";
import EnterpriseOsPanel from "../features/enterprise/components/EnterpriseOsPanel.jsx";
import SelfImprovementPanel from "../features/learning/components/SelfImprovementPanel.jsx";
import AppStorePanel from "../features/marketplace/components/AppStorePanel.jsx";
import MasterBrainPanel from "../features/master-brain/components/MasterBrainPanel.jsx";
import MemoryVisualization from "../features/memory/components/MemoryVisualization.jsx";
import MultimodalPipelinePanel from "../features/multimodal/components/MultimodalPipelinePanel.jsx";
import OrchestratorControlPanel from "../features/orchestrator/components/OrchestratorControlPanel.jsx";
import ProviderStatusPanel from "../features/providers/components/ProviderStatusPanel.jsx";
import { providerApi } from "../features/providers/providerApi.js";
import LiveActivityPanel from "../features/realtime/LiveActivityPanel.jsx";
import EnterpriseTelemetryRibbon from "../features/runtime/components/EnterpriseTelemetryRibbon.jsx";
import TrustLayerPanel from "../features/security/components/TrustLayerPanel.jsx";
import ToolExecutionPanel from "../features/tools/components/ToolExecutionPanel.jsx";
import ToolConsole from "../features/tools/components/ToolConsole.jsx";
import UniversalWorkspace from "../features/workspace/components/UniversalWorkspace.jsx";
import VisualWorkflowBuilder from "../features/workflows/components/VisualWorkflowBuilder.jsx";
import { useAuthStore } from "../features/auth/authStore.js";
import { useRealtimeStore } from "../features/realtime/realtimeStore.js";
import { api } from "../services/api.js";
import CodraiBrandMark from "../components/CodraiBrandMark.jsx";

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const realtimeConnected = useRealtimeStore((state) => state.connected);
  const realtimeEvents = useRealtimeStore((state) => state.events);
  const connectRealtime = useRealtimeStore((state) => state.connect);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const [recentCommand, setRecentCommand] = useState(localStorage.getItem("codrai_recent_command") || "AI Studio");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [providerSnapshot, setProviderSnapshot] = useState({ loading: true, configured: 0, total: 0, latency: null, error: "" });
  const [runtimeHealth, setRuntimeHealth] = useState({ loading: true, status: "checking", latency: null, error: "" });
  const [runtimeOps, setRuntimeOps] = useState({ loading: true, diagnostics: null, workers: null, queues: null, containers: null, errors: [] });
  const [operatingSystem, setOperatingSystem] = useState({ loading: true, data: null, error: "" });
  const [autonomousOs, setAutonomousOs] = useState({ loading: true, data: null, error: "" });
  const [activityFeed, setActivityFeed] = useState([
    { id: "boot", label: "Enterprise shell mounted", detail: "Frontend runtime active", tone: "cyan" },
    { id: "dock", label: "AI quick dock armed", detail: "Studio, providers, and command actions available", tone: "purple" },
  ]);
  const sidebarItems = useMemo(() => ([
    { label: "Overview", href: "#dashboard-top", icon: LayoutDashboard },
    { label: "AI Chat", href: "#ai-chat", icon: MessageSquare },
    { label: "Billing", href: "/enterprise-cloud", icon: CreditCard },
    { label: "Profile", href: "#account-profile", icon: UserRound },
  ]), []);
  const commandItems = useMemo(() => ([
    { label: "AI Chat", description: "Open the live streaming workspace", href: "#ai-chat", icon: MessageSquare },
    { label: "Agent Runtime", description: "Jump to autonomous execution panels", href: "#agent-runtime", icon: Brain },
    { label: "Workflow Builder", description: "Open visual orchestration canvas", href: "#workflow-builder", icon: Workflow },
    { label: "Cloud OS Runtime", description: "Inspect distributed infrastructure panels", href: "#cloud-os-runtime", icon: Network },
    { label: "Provider Settings", description: "Configure real AI providers", href: "/settings/providers", icon: KeyRound },
    { label: "AI Studio", description: "Generate image, video, and voice jobs", href: "/ai-studio", icon: Sparkles },
    { label: "Developer Platform", description: "Manage API keys and usage", href: "/developer", icon: Code2 },
    { label: "Enterprise Cloud", description: "Billing, organizations, and cloud readiness", href: "/enterprise-cloud", icon: Cloud },
    { label: "Global Control Center", description: "Monitor orchestration and telemetry", href: "/global-control-center", icon: Gauge },
  ]), []);
  const filteredCommands = commandItems.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(commandSearch.toLowerCase()));
  const workspaceMemory = useMemo(() => ([
    { label: "Recent command", value: recentCommand },
    { label: "Workspace", value: localStorage.getItem("codrai_workspace_id") ? "Persisted session" : "Local session" },
    { label: "Last route", value: localStorage.getItem("codrai_last_workspace_route") || "/dashboard" },
  ]), [recentCommand]);

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (event.key === "Escape") setCommandOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    connectRealtime("workspace:dashboard");
  }, [connectRealtime]);

  useEffect(() => {
    localStorage.setItem("codrai_last_workspace_route", "/dashboard");
    localStorage.setItem("codrai_last_dashboard_visit", new Date().toISOString());

    let mounted = true;
    const startedAt = performance.now();
    providerApi.validate()
      .then((result) => {
        if (!mounted) return;
        const providers = result.providers || result.results || [];
        const configured = providers.filter((provider) => provider.ok || provider.status === "active" || provider.configured).length;
        const latency = Math.max(1, Math.round(performance.now() - startedAt));
        setProviderSnapshot({ loading: false, configured, total: providers.length, latency, error: "" });
        setActivityFeed((items) => [
          { id: `providers-${Date.now()}`, label: "Provider mesh checked", detail: `${configured}/${providers.length || 0} providers configured`, tone: configured ? "cyan" : "amber" },
          ...items,
        ].slice(0, 5));
      })
      .catch((error) => {
        if (!mounted) return;
        setProviderSnapshot({ loading: false, configured: 0, total: 0, latency: null, error: error.response?.data?.message || error.message || "Provider validation unavailable" });
        setActivityFeed((items) => [
          { id: `providers-error-${Date.now()}`, label: "Provider telemetry blocked", detail: "Open Provider Settings to validate keys", tone: "amber" },
          ...items,
        ].slice(0, 5));
      });

    const healthStartedAt = performance.now();
    api.get("/health")
      .then((response) => {
        if (!mounted) return;
        setRuntimeHealth({
          loading: false,
          status: response.data?.status || "ok",
          latency: Math.max(1, Math.round(performance.now() - healthStartedAt)),
          error: "",
        });
      })
      .catch((error) => {
        if (!mounted) return;
        setRuntimeHealth({
          loading: false,
          status: "unavailable",
          latency: null,
          error: error.response?.data?.message || error.message || "Backend health unavailable",
        });
      });

    const workspaceId = localStorage.getItem("codrai_workspace_id") || "local-workspace";
    Promise.allSettled([
      api.get("/runtime/diagnostics", { params: { workspaceId } }),
      api.get("/runtime/workers", { params: { workspaceId } }),
      api.get("/runtime/queues", { params: { workspaceId } }),
      api.get("/runtime/containers", { params: { workspaceId } }),
    ]).then((results) => {
      if (!mounted) return;
      const [diagnostics, workers, queues, containers] = results;
      setRuntimeOps({
        loading: false,
        diagnostics: diagnostics.status === "fulfilled" ? diagnostics.value.data : null,
        workers: workers.status === "fulfilled" ? workers.value.data : null,
        queues: queues.status === "fulfilled" ? queues.value.data : null,
        containers: containers.status === "fulfilled" ? containers.value.data : null,
        errors: results.filter((result) => result.status === "rejected").map((result) => result.reason?.response?.data?.message || result.reason?.message || "Runtime endpoint unavailable"),
      });
    });

    enterpriseCloudApi.operatingSystem()
      .then((data) => {
        if (!mounted) return;
        setOperatingSystem({ loading: false, data, error: "" });
      })
      .catch((error) => {
        if (!mounted) return;
        setOperatingSystem({ loading: false, data: null, error: error.response?.data?.message || error.message || "Enterprise OS aggregation unavailable" });
      });

    enterpriseCloudApi.autonomousOs()
      .then((data) => {
        if (!mounted) return;
        setAutonomousOs({ loading: false, data, error: "" });
      })
      .catch((error) => {
        if (!mounted) return;
        setAutonomousOs({ loading: false, data: null, error: error.response?.data?.message || error.message || "Autonomous OS diagnostics unavailable" });
      });

    return () => {
      mounted = false;
    };
  }, []);

  function executeCommand(item) {
    rememberCommand(item.label);
    setSidebarOpen(false);
    if (item.href === "#") return;
    if (item.href.startsWith("#")) {
      requestAnimationFrame(() => document.querySelector(item.href)?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return;
    }
    navigate(item.href);
  }

  function rememberCommand(label) {
    localStorage.setItem("codrai_recent_command", label);
    setRecentCommand(label);
    setCommandOpen(false);
  }

  function rememberNavigation(label) {
    rememberCommand(label);
    setSidebarOpen(false);
  }

  async function signOut() {
    await logout();
    navigate("/signin", { replace: true });
  }

  return (
    <main className="codrai-os-bg codrai-dashboard-shell bg-codrai-ink text-white">
      <button className="codrai-mobile-sidebar-toggle" type="button" aria-label="Open dashboard navigation" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}>
        <Menu className="h-5 w-5" />
      </button>
      {sidebarOpen && <button className="codrai-sidebar-scrim" type="button" aria-label="Close dashboard navigation" onClick={() => setSidebarOpen(false)} />}
      <div className="codrai-dashboard-layout">
        <aside className={`codrai-sidebar border-r border-white/10 p-5 ${sidebarOpen ? "is-open" : ""}`}>
          <button className="codrai-sidebar-close" type="button" aria-label="Close dashboard navigation" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </button>
          <CodraiBrandMark className="mb-8 flex" />
          <nav className="codrai-sidebar-nav space-y-2 text-sm font-semibold text-white/70">
            {sidebarItems.map(({ label, href, icon: Icon }) => href.startsWith("#") ? (
              <button key={label} type="button" onClick={() => executeCommand({ label, href })} className="codrai-nav-item flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-white/10 hover:text-white">
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ) : (
              <Link key={label} to={href} onClick={() => rememberNavigation(label)} className="codrai-nav-item flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-white/10 hover:text-white">
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            <Link to="/settings/providers" onClick={() => rememberNavigation("Provider Settings")} className="codrai-nav-item flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-white/10 hover:text-white">
              <KeyRound className="h-4 w-4" />
              Provider Settings
            </Link>
            <Link to="/developer" onClick={() => rememberNavigation("Developer Platform")} className="codrai-nav-item flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-white/10 hover:text-white">
              <Code2 className="h-4 w-4" />
              Developer Platform
            </Link>
            <Link to="/ai-studio" onClick={() => rememberNavigation("AI Studio")} className="codrai-nav-item flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-white/10 hover:text-white">
              <Sparkles className="h-4 w-4" />
              AI Studio
            </Link>
            <Link to="/enterprise-cloud" onClick={() => rememberNavigation("Enterprise Cloud")} className="codrai-nav-item flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-white/10 hover:text-white">
              <Cloud className="h-4 w-4" />
              Enterprise Cloud
            </Link>
            <Link to="/global-control-center" onClick={() => rememberNavigation("Global Control Center")} className="codrai-nav-item flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-white/10 hover:text-white">
              <Gauge className="h-4 w-4" />
              Global Control Center
            </Link>
          </nav>
          <div className="codrai-user-card mt-8 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-white/62">
            <p className="font-bold text-white">{user?.name || user?.email || "CODRAI user"}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-codrai-cyan">{user?.role || "user"}</p>
            <button className="codrai-ghost-button mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] font-bold text-white" type="button" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </aside>

        <section className="codrai-dashboard-content p-5 sm:p-8" id="dashboard-top">
          <header className="codrai-page-header mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">Control Center</p>
              <h1 className="mt-2 text-3xl font-black">Dashboard</h1>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <button className="codrai-command-trigger" type="button" onClick={() => setCommandOpen(true)}>
                <Search className="h-4 w-4" />
                <span>Search CODRAI command center</span>
                <kbd>Ctrl K</kbd>
              </button>
            </div>
          </header>

          <EnterpriseTelemetryRibbon />

          <section className="codrai-ai-os-grid mb-6" aria-label="Realtime AI operating system">
            <article className="codrai-ai-os-widget codrai-widget-memory">
              <span className="codrai-widget-icon"><Brain className="h-4 w-4" /></span>
              <div>
                <p className="codrai-widget-kicker">Smart Workspace Memory</p>
                <h2>Session context</h2>
                <div className="codrai-memory-list">
                  {workspaceMemory.map((item) => (
                    <span key={item.label}><strong>{item.label}</strong>{item.value}</span>
                  ))}
                </div>
              </div>
            </article>

            <article className="codrai-ai-os-widget codrai-widget-provider">
              <span className="codrai-widget-icon"><Network className="h-4 w-4" /></span>
              <div>
                <p className="codrai-widget-kicker">Multi-provider Orchestration</p>
                <h2>{providerSnapshot.loading ? "Checking provider mesh" : `${providerSnapshot.configured}/${providerSnapshot.total || 0} configured`}</h2>
                <p className="codrai-widget-copy">
                  {providerSnapshot.error || (providerSnapshot.latency ? `Live validation returned in ${providerSnapshot.latency}ms.` : "Real provider health is loaded from the backend validation API.")}
                </p>
              </div>
            </article>

            <article className="codrai-ai-os-widget codrai-widget-activity">
              <span className="codrai-widget-icon"><Radio className="h-4 w-4" /></span>
              <div>
                <p className="codrai-widget-kicker">Live AI Activity Feed</p>
                <h2>Runtime signals</h2>
                <ul>
                  {activityFeed.slice(0, 3).map((item) => (
                    <li key={item.id} className={`is-${item.tone}`}>
                      <span />
                      <div><strong>{item.label}</strong><small>{item.detail}</small></div>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </section>

          <section className="codrai-command-center-grid mb-6" aria-label="Enterprise AI command center">
            <article className="codrai-command-center-card is-wide">
              <div className="codrai-command-card-header">
                <span><GitBranch className="h-4 w-4" /></span>
                <div>
                  <p>AI Orchestration Engine</p>
                  <h2>Provider failover, workflow routing, and execution surfaces</h2>
                </div>
              </div>
              <div className="codrai-execution-graph" aria-label="Task execution graph">
                {["Prompt", "Router", "Provider", "Stream", "Memory"].map((step, index) => (
                  <div key={step} className={index <= 2 && providerSnapshot.configured ? "is-live" : ""}>
                    <span>{index + 1}</span>
                    <strong>{step}</strong>
                  </div>
                ))}
              </div>
              <div className="codrai-command-card-actions">
                <Link to="/settings/providers" onClick={() => rememberCommand("Provider Settings")}>Configure providers</Link>
                <button type="button" onClick={() => executeCommand({ label: "Workflow Builder", href: "#workflow-builder" })}>Open workflow canvas</button>
              </div>
            </article>

            <article className="codrai-command-center-card">
              <div className="codrai-command-card-header">
                <span><Radio className="h-4 w-4" /></span>
                <div>
                  <p>Realtime Infrastructure</p>
                  <h2>{realtimeConnected ? "WebSocket live" : "WebSocket connecting"}</h2>
                </div>
              </div>
              <dl className="codrai-live-metrics">
                <div><dt>Events</dt><dd>{realtimeEvents.length}</dd></div>
                <div><dt>Backend</dt><dd>{runtimeHealth.loading ? "checking" : runtimeHealth.status}</dd></div>
                <div><dt>Health latency</dt><dd>{runtimeHealth.latency ? `${runtimeHealth.latency}ms` : "-"}</dd></div>
              </dl>
            </article>

            <article className="codrai-command-center-card">
              <div className="codrai-command-card-header">
                <span><ShieldCheck className="h-4 w-4" /></span>
                <div>
                  <p>Production Guardrails</p>
                  <h2>Protected runtime boundaries</h2>
                </div>
              </div>
              <div className="codrai-guardrail-list">
                {["JWT protected UI", "Provider keys masked", "Reduced-motion safe", "No backend mutation"].map((item) => <span key={item}>{item}</span>)}
              </div>
            </article>
          </section>

          <section className="codrai-enterprise-grid mb-6" aria-label="Enterprise runtime observability">
            <article className="codrai-enterprise-panel is-analytics">
              <div className="codrai-command-card-header">
                <span><BarChart3 className="h-4 w-4" /></span>
                <div>
                  <p>AI Observability</p>
                  <h2>Runtime diagnostics from live backend endpoints</h2>
                </div>
              </div>
              <dl className="codrai-live-metrics">
                <div><dt>Diagnostics</dt><dd>{runtimeOps.loading ? "checking" : runtimeOps.diagnostics?.status || "unavailable"}</dd></div>
                <div><dt>Providers tracked</dt><dd>{runtimeOps.diagnostics?.providers?.length ?? providerSnapshot.total ?? 0}</dd></div>
                <div><dt>Realtime events</dt><dd>{runtimeOps.diagnostics?.realtime?.eventBus?.recentEvents?.length ?? realtimeEvents.length}</dd></div>
              </dl>
            </article>

            <article className="codrai-enterprise-panel">
              <div className="codrai-command-card-header">
                <span><Server className="h-4 w-4" /></span>
                <div>
                  <p>Background AI Workers</p>
                  <h2>Queue and worker supervision</h2>
                </div>
              </div>
              <div className="codrai-runtime-list">
                <span><strong>Workers</strong>{runtimeCount(runtimeOps.workers, ["workers", "nodes", "data"])}</span>
                <span><strong>Queues</strong>{runtimeCount(runtimeOps.queues, ["queues", "data"])}</span>
                <span><strong>Endpoint errors</strong>{runtimeOps.errors.length}</span>
              </div>
            </article>

            <article className="codrai-enterprise-panel">
              <div className="codrai-command-card-header">
                <span><Boxes className="h-4 w-4" /></span>
                <div>
                  <p>Container Monitor</p>
                  <h2>Docker runtime state via existing API</h2>
                </div>
              </div>
              <div className="codrai-runtime-list">
                <span><strong>Services</strong>{runtimeCount(runtimeOps.containers, ["containers", "services", "data"])}</span>
                <span><strong>Status</strong>{runtimeOps.containers?.status || runtimeOps.containers?.docker?.status || "reported by API"}</span>
                <span><strong>Health</strong>{runtimeOps.errors.length ? "degraded" : runtimeOps.loading ? "checking" : "queried"}</span>
              </div>
            </article>

            <article className="codrai-enterprise-panel">
              <div className="codrai-command-card-header">
                <span><HardDrive className="h-4 w-4" /></span>
                <div>
                  <p>Workflow Persistence</p>
                  <h2>Saved workflow engine and execution history</h2>
                </div>
              </div>
              <div className="codrai-runtime-list">
                <span><strong>Storage</strong>PostgreSQL-backed workflow API</span>
                <span><strong>Execution</strong>Existing workflow engine</span>
                <span><strong>Open</strong><button type="button" onClick={() => executeCommand({ label: "Workflow Builder", href: "#workflow-builder" })}>Workflow canvas</button></span>
              </div>
            </article>

            <article className="codrai-enterprise-panel is-analytics">
              <div className="codrai-command-card-header">
                <span><Cloud className="h-4 w-4" /></span>
                <div>
                  <p>Enterprise OS Aggregate</p>
                  <h2>Real orchestration readiness from backend services</h2>
                </div>
              </div>
              <dl className="codrai-live-metrics">
                <div><dt>Status</dt><dd>{operatingSystem.loading ? "checking" : operatingSystem.data?.status || "unavailable"}</dd></div>
                <div><dt>Systems</dt><dd>{operatingSystem.data?.systems ? Object.keys(operatingSystem.data.systems).length : 0}</dd></div>
                <div><dt>Blocked</dt><dd>{operatingSystem.data?.blocked?.length ?? (operatingSystem.error ? 1 : 0)}</dd></div>
              </dl>
              {operatingSystem.error && <p className="mt-3 text-xs text-amber-100">{operatingSystem.error}</p>}
            </article>

            <article className="codrai-enterprise-panel is-analytics">
              <div className="codrai-command-card-header">
                <span><Brain className="h-4 w-4" /></span>
                <div>
                  <p>Autonomous Multi-agent OS</p>
                  <h2>Providers, agents, memory, workflows, and recovery</h2>
                </div>
              </div>
              <dl className="codrai-live-metrics">
                <div><dt>Status</dt><dd>{autonomousOs.loading ? "checking" : autonomousOs.data?.status || "unavailable"}</dd></div>
                <div><dt>Memory</dt><dd>{autonomousOs.data?.memory?.status || "unknown"}</dd></div>
                <div><dt>Blocked</dt><dd>{autonomousOs.data?.blocked?.length ?? (autonomousOs.error ? 1 : 0)}</dd></div>
              </dl>
              <div className="codrai-runtime-list mt-3">
                <span><strong>Providers</strong>{autonomousOs.data?.providerIntelligence?.capabilities?.length ?? providerSnapshot.total ?? 0}</span>
                <span><strong>Agent bus</strong>{autonomousOs.data?.agents?.communicationBus ? "wired" : "checking"}</span>
                <span><strong>Self-healing</strong>{autonomousOs.data?.selfHealing?.status || "checking"}</span>
              </div>
              {autonomousOs.error && <p className="mt-3 text-xs text-amber-100">{autonomousOs.error}</p>}
            </article>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]" id="ai-chat">
            <StreamingChatWorkspace />

            <section className="grid content-start gap-6" id="account-profile">
              <ProviderStatusPanel />
              <AuthPanel />
            </section>
          </div>

          <div className="codrai-section-stack mt-6" id="orchestration-runtime">
            <MasterBrainPanel />
          </div>

          <div className="codrai-section-stack mt-6">
            <OrchestratorControlPanel />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2" id="agent-runtime">
            <SelfImprovementPanel />
            <AiEmployeePanel />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <AutonomousCyclePanel />
            <AppFactoryPanel />
            <ComputerUsePanel />
          </div>

          <div className="codrai-section-stack mt-6" id="cloud-os-runtime">
            <CloudOsControlCenter />
          </div>

          <div className="codrai-section-stack mt-6" id="workflow-builder">
            <VisualWorkflowBuilder />
          </div>

          <div className="codrai-section-stack mt-6">
            <UniversalWorkspace />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <MultimodalPipelinePanel />
            <EnterpriseOsPanel />
          </div>

          <div className="codrai-section-stack mt-6">
            <CreationEngineDashboard />
          </div>

          <div className="codrai-section-stack mt-6">
            <AgentDashboard />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <AgentExecutionPanel />
            <ToolConsole />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <LiveActivityPanel />
            <ExecutionAnalyticsPanel />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <MultiAgentTimeline />
            <MemoryVisualization />
            <ToolExecutionPanel />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <AppStorePanel />
            <TrustLayerPanel />
          </div>
        </section>
      </div>

      <div className="codrai-action-dock" aria-label="CODRAI quick actions">
        <Link to="/ai-studio" title="AI Studio"><Sparkles className="h-5 w-5" /></Link>
        <Link to="/settings/providers" title="Provider Settings"><KeyRound className="h-5 w-5" /></Link>
        <button type="button" title="Command Palette" onClick={() => setCommandOpen(true)}><Command className="h-5 w-5" /></button>
        <Link to="/global-control-center" title="Global Control Center"><Gauge className="h-5 w-5" /></Link>
      </div>

      <button className="codrai-floating-assistant" type="button" aria-expanded={assistantOpen} aria-label="Open CODRAI floating assistant" onClick={() => setAssistantOpen((open) => !open)}>
        <Sparkles className="h-5 w-5" />
      </button>

      {assistantOpen && (
        <section className="codrai-assistant-panel" aria-label="Floating CODRAI assistant">
          <div className="codrai-assistant-header">
            <span><Zap className="h-4 w-4" /></span>
            <div>
              <strong>CODRAI Assistant</strong>
              <small>Keyboard-first AI OS navigator</small>
            </div>
            <button type="button" aria-label="Close assistant" onClick={() => setAssistantOpen(false)}><X className="h-4 w-4" /></button>
          </div>
          <div className="codrai-assistant-actions">
            <button type="button" onClick={() => { setAssistantOpen(false); setCommandOpen(true); }}>Open command palette</button>
            <Link to="/ai-studio" onClick={() => rememberCommand("AI Studio")}>Launch AI Studio</Link>
            <Link to="/settings/providers" onClick={() => rememberCommand("Provider Settings")}>Validate providers</Link>
            <Link to="/global-control-center" onClick={() => rememberCommand("Global Control Center")}>Open global telemetry</Link>
          </div>
        </section>
      )}

      {commandOpen && (
        <div className="codrai-command-overlay" role="dialog" aria-modal="true" aria-label="CODRAI command palette">
          <button className="codrai-command-backdrop" type="button" aria-label="Close command palette" onClick={() => setCommandOpen(false)} />
          <section className="codrai-command-palette">
            <div className="codrai-command-input-row">
              <Search className="h-5 w-5 text-codrai-cyan" />
              <input autoFocus value={commandSearch} onChange={(event) => setCommandSearch(event.target.value)} placeholder="Search workspaces, providers, studio, agents..." />
              <button type="button" onClick={() => setCommandOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="codrai-command-results">
              {filteredCommands.map((item) => {
                const Icon = item.icon;
                const content = (
                  <>
                    <span className="codrai-command-result-icon"><Icon className="h-4 w-4" /></span>
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                  </>
                );
                return item.href === "#" || item.href.startsWith("#") ? (
                  <button key={item.label} type="button" onClick={() => executeCommand(item)}>{content}</button>
                ) : (
                  <Link key={item.label} to={item.href} onClick={() => rememberCommand(item.label)}>{content}</Link>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function runtimeCount(payload, keys) {
  if (!payload) return 0;
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key].length;
    if (payload[key] && typeof payload[key] === "object") return Object.keys(payload[key]).length;
  }
  if (Array.isArray(payload)) return payload.length;
  return payload.count ?? payload.total ?? 0;
}
