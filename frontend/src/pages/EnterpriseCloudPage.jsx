import { Activity, BarChart3, Bell, Blocks, Bot, Building2, CalendarClock, Cloud, Code2, CreditCard, Database, Gauge, Globe2, Lock, Network, Rocket, Server, ShieldCheck, Sparkles, Store, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { enterpriseCloudApi } from "../features/enterprise-cloud/enterpriseCloudApi.js";
import { marketplaceApi } from "../features/marketplace/marketplaceApi.js";
import { teamApi } from "../features/teams/teamApi.js";

const workspaceId = () => localStorage.getItem("codrai_workspace_id") || "local-workspace";
const userId = () => localStorage.getItem("codrai_user_id") || "local-user";
const safe = (promise, fallback) => promise.catch(() => fallback);

export default function EnterpriseCloudPage() {
  const [overview, setOverview] = useState(null);
  const [billing, setBilling] = useState(null);
  const [models, setModels] = useState([]);
  const [observability, setObservability] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [globalAiOs, setGlobalAiOs] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [teams, setTeams] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [adminDiagnostics, setAdminDiagnostics] = useState(null);
  const [controlCenter, setControlCenter] = useState(null);
  const [orgName, setOrgName] = useState("CODRAI Enterprise Org");
  const [workspaceDraft, setWorkspaceDraft] = useState(workspaceId());
  const [teamName, setTeamName] = useState("Autonomous Cloud Team");
  const [teamMission, setTeamMission] = useState("Coordinate marketplace agents, workflow automations, and production runtime monitoring.");
  const [credits, setCredits] = useState("25");
  const [seats, setSeats] = useState("1");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [overviewData, billingData, modelData, observabilityData, policyData, globalData, paymentData, teamsData, extensionsData, adminData, controlData] = await Promise.all([
      safe(enterpriseCloudApi.overview(), {}),
      safe(enterpriseCloudApi.billing(), {}),
      safe(enterpriseCloudApi.models(), { models: [] }),
      safe(enterpriseCloudApi.observability(), {}),
      safe(enterpriseCloudApi.gatewayPolicy(), {}),
      safe(enterpriseCloudApi.globalAiOs(), {}),
      safe(enterpriseCloudApi.billingStatus(), {}),
      safe(teamApi.list({ workspaceId: workspaceId(), limit: 12 }), { teams: [] }),
      safe(marketplaceApi.extensions({ workspaceId: workspaceId(), limit: 12 }), { extensions: [] }),
      safe(enterpriseCloudApi.adminDiagnostics(), {}),
      safe(enterpriseCloudApi.controlCenter(), {}),
    ]);
    setOverview(overviewData);
    setBilling(billingData);
    setModels(modelData.models || []);
    setObservability(observabilityData);
    setPolicy(policyData);
    setGlobalAiOs(globalData);
    setPaymentStatus(paymentData);
    setTeams(teamsData.teams || []);
    setExtensions(extensionsData.extensions || []);
    setAdminDiagnostics(adminData);
    setControlCenter(controlData);
  }

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  const activePlan = billing?.subscription?.plan || "free";
  const modelCount = models.length;
  const usage = observability?.usage?.summary || overview?.usage?.summary || {};
  const providerHealth = useMemo(() => models.filter((model) => model.providerScore?.score >= 70).length, [models]);

  async function runAction(action, label) {
    setError("");
    setStatus("");
    try {
      await action();
      await load();
      setStatus(label);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function startStripeCheckout(plan) {
    await runAction(async () => {
      const checkout = await enterpriseCloudApi.stripeCheckout(plan);
      if (checkout.url) {
        window.location.assign(checkout.url);
        return;
      }
      return checkout;
    }, "Stripe checkout session created.");
  }

  async function createRazorpayOrder(plan) {
    await runAction(async () => enterpriseCloudApi.razorpayOrder({ plan }), "Razorpay order created and recorded.");
  }

  async function switchWorkspace() {
    const next = workspaceDraft.trim() || "local-workspace";
    localStorage.setItem("codrai_workspace_id", next);
    await runAction(load, `Workspace switched to ${next}.`);
  }

  async function createCloudTeam() {
    await runAction(async () => teamApi.create({
      workspaceId: workspaceId(),
      userId: userId(),
      name: teamName,
      mission: teamMission,
      members: [
        { role: "planner", hierarchyRank: 10 },
        { role: "operator", hierarchyRank: 30 },
        { role: "monitor", hierarchyRank: 50 },
      ],
    }), "AI cloud team created.");
  }

  async function installExtension(extensionId) {
    await runAction(() => marketplaceApi.install({ workspaceId: workspaceId(), userId: userId(), extensionId }), "Marketplace extension installed.");
  }

  return (
    <main className="min-h-screen bg-codrai-ink px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link className="mb-4 inline-block text-sm font-bold text-white/55 hover:text-white" to="/dashboard">Back to dashboard</Link>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">Enterprise AI Cloud</p>
            <h1 className="mt-2 text-3xl font-black">CODRAI Enterprise Cloud Platform</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">Billing, organizations, API gateway policy, model marketplace, observability, and cloud deployment readiness on top of the live CODRAI runtime.</p>
          </div>
          <Link className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-slate-950" to="/developer">Developer Console</Link>
        </header>

        {(status || error) && <div className={`mb-5 rounded-lg border p-3 text-sm ${error ? "border-red-300/20 bg-red-400/10 text-red-100" : "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"}`}>{error || status}</div>}

        <section className="grid gap-4 md:grid-cols-4">
          <Metric icon={CreditCard} label="Plan" value={activePlan} />
          <Metric icon={Activity} label="API requests" value={usage.requests ?? "-"} />
          <Metric icon={BarChart3} label="Tokens" value={usage.tokens ?? "-"} />
          <Metric icon={Sparkles} label="Models" value={modelCount} />
        </section>

        <section className="codrai-cloud-expansion mt-5">
          <div className="codrai-cloud-expansion__hero">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-codrai-cyan">Phase 17 Autonomous AI Cloud</p>
              <h2>Workspace, marketplace, automation, billing, and admin command surfaces.</h2>
              <p>All controls below use existing CODRAI enterprise APIs and report real runtime/backend states.</p>
            </div>
            <div className="codrai-cloud-expansion__actions">
              <Link to="/dashboard#cloud-os-runtime">Open automation cloud</Link>
              <Link to="/developer">API console</Link>
            </div>
          </div>

          <div className="codrai-cloud-grid">
            <article className="codrai-cloud-card is-wide">
              <div className="codrai-cloud-card__header">
                <Users className="h-5 w-5 text-codrai-cyan" />
                <div>
                  <p>Multi-workspace SaaS</p>
                  <h3>Workspace switcher and organization isolation</h3>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <input className="h-11 rounded-lg border border-white/10 bg-black/25 px-3 text-sm outline-none" value={workspaceDraft} onChange={(event) => setWorkspaceDraft(event.target.value)} placeholder="workspace id" />
                <button className="h-11 rounded-lg bg-white px-4 text-sm font-black text-slate-950" type="button" onClick={switchWorkspace}>Switch workspace</button>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                {["owner", "admin", "developer", "operator", "viewer"].map((role) => <span key={role} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-center text-xs font-black uppercase tracking-[0.12em] text-white/55">{role}</span>)}
              </div>
            </article>

            <article className="codrai-cloud-card">
              <div className="codrai-cloud-card__header">
                <Bell className="h-5 w-5 text-codrai-cyan" />
                <div>
                  <p>Realtime command center</p>
                  <h3>{controlCenter?.status || adminDiagnostics?.status || "Live diagnostics"}</h3>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                <Mini label="Runtime alerts" value={controlCenter?.alerts?.length ?? adminDiagnostics?.alerts?.length ?? 0} />
                <Mini label="Audit signals" value={adminDiagnostics?.audit?.events ?? adminDiagnostics?.auditLogs?.length ?? 0} />
                <Mini label="Queue state" value={controlCenter?.queues?.status || "backend reported"} />
              </div>
            </article>

            <article className="codrai-cloud-card">
              <div className="codrai-cloud-card__header">
                <CalendarClock className="h-5 w-5 text-codrai-cyan" />
                <div>
                  <p>Automation scheduler</p>
                  <h3>{globalAiOs?.agentPlatform?.scheduledAgents ?? 0} scheduled agents</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/55">Recurring workflow controls remain in Cloud OS and use the existing distributed execution queues.</p>
              <Link className="mt-4 inline-flex h-10 items-center rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-black text-white" to="/dashboard#cloud-os-runtime">Open scheduler</Link>
            </article>

            <article className="codrai-cloud-card">
              <div className="codrai-cloud-card__header">
                <Rocket className="h-5 w-5 text-codrai-cyan" />
                <div>
                  <p>Deployment cloud</p>
                  <h3>{globalAiOs?.deployment?.targets?.length ?? 0} deployment targets</h3>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                <Mini label="Release plans" value={globalAiOs?.deployment?.recentPlans?.length ?? 0} />
                <Mini label="Health probes" value={adminDiagnostics?.health?.status || "runtime API"} />
                <Mini label="Failover mode" value={globalAiOs?.deployment?.failover || "safe"} />
              </div>
            </article>

            <article className="codrai-cloud-card">
              <div className="codrai-cloud-card__header">
                <Lock className="h-5 w-5 text-codrai-cyan" />
                <div>
                  <p>Runtime secrets</p>
                  <h3>Masked, audit-safe environment controls</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/55">Provider keys and API credentials stay behind existing vault-backed backend services. UI surfaces never reveal full secret values.</p>
              <div className="mt-4 grid gap-2">
                <Mini label="API keys" value={adminDiagnostics?.apiKeys?.active ?? globalAiOs?.adminCloud?.apiKeys?.length ?? 0} />
                <Mini label="Audit logging" value={adminDiagnostics?.audit ? "active" : "reported"} />
              </div>
            </article>

            <article className="codrai-cloud-card is-wide">
              <div className="codrai-cloud-card__header">
                <Bot className="h-5 w-5 text-codrai-cyan" />
                <div>
                  <p>Team collaboration</p>
                  <h3>AI teams backed by PostgreSQL and realtime events</h3>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                <input className="h-11 rounded-lg border border-white/10 bg-black/25 px-3 text-sm outline-none" value={teamName} onChange={(event) => setTeamName(event.target.value)} />
                <textarea className="min-h-24 rounded-lg border border-white/10 bg-black/25 p-3 text-sm outline-none" value={teamMission} onChange={(event) => setTeamMission(event.target.value)} />
                <button className="h-11 rounded-lg bg-white px-4 text-sm font-black text-slate-950" type="button" onClick={createCloudTeam}>Create AI team</button>
              </div>
              <div className="mt-4 grid gap-2">
                {teams.slice(0, 4).map((team) => <div key={team.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm"><strong>{team.name}</strong><p className="mt-1 text-xs text-white/45">{team.mission}</p></div>)}
                {teams.length === 0 && <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-white/45">No AI teams yet for this workspace.</p>}
              </div>
            </article>

            <article className="codrai-cloud-card is-wide">
              <div className="codrai-cloud-card__header">
                <Store className="h-5 w-5 text-codrai-cyan" />
                <div>
                  <p>AI agent marketplace</p>
                  <h3>Installable agents, prompt packs, plugins, and workflows</h3>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {extensions.slice(0, 4).map((extension) => (
                  <div key={extension.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black">{extension.name}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-white/50">{extension.description}</p>
                      </div>
                      <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/55">{Number(extension.rating || 0).toFixed(1)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(extension.categories || extension.permissions || ["agent"]).slice(0, 3).map((item) => <span key={item} className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/45">{item}</span>)}
                    </div>
                    <button className="mt-3 h-9 rounded-lg bg-white px-3 text-xs font-black text-slate-950" type="button" onClick={() => installExtension(extension.id)}>Install</button>
                  </div>
                ))}
                {extensions.length === 0 && <p className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-white/45">Marketplace API returned no extensions.</p>}
              </div>
            </article>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-2">
          <Panel title="Billing and credits" icon={CreditCard}>
            <div className="grid gap-3 sm:grid-cols-2">
              {(billing?.plans || []).map((plan) => (
                <button key={plan.tier} type="button" className={`rounded-lg border p-4 text-left transition ${activePlan === plan.tier ? "border-cyan-300/40 bg-cyan-300/10" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"}`} onClick={() => runAction(() => enterpriseCloudApi.setPlan(plan.tier), `Plan set to ${plan.tier}.`)}>
                  <p className="font-black">{plan.name}</p>
                  <p className="mt-1 text-sm text-white/55">${(plan.monthly_price_cents / 100).toFixed(0)} / month</p>
                  <p className="mt-2 text-xs text-white/45">{plan.included_requests} requests - {plan.included_tokens} tokens</p>
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input className="h-10 flex-1 rounded-lg border border-white/10 bg-black/25 px-3 text-sm outline-none" value={credits} onChange={(event) => setCredits(event.target.value)} />
              <button className="h-10 rounded-lg bg-white px-4 text-sm font-black text-slate-950" type="button" onClick={() => runAction(() => enterpriseCloudApi.addCredits(Number(credits)), "Credits added.")}>Add credits</button>
            </div>
            <p className="mt-3 text-sm text-white/55">Wallet: {billing?.wallet?.balance ?? 0} credits</p>
          </Panel>

          <Panel title="Payment gateway activation" icon={CreditCard}>
            <div className="grid gap-3 sm:grid-cols-2">
              <GatewayCard
                name="Stripe"
                configured={paymentStatus?.providers?.stripe?.configured}
                webhook={paymentStatus?.providers?.stripe?.webhookConfigured}
                reason={paymentStatus?.providers?.stripe?.blockedReason}
                actionLabel="Start Pro checkout"
                onAction={() => startStripeCheckout("pro")}
              />
              <GatewayCard
                name="Razorpay"
                configured={paymentStatus?.providers?.razorpay?.configured}
                webhook={paymentStatus?.providers?.razorpay?.webhookConfigured}
                reason={paymentStatus?.providers?.razorpay?.blockedReason}
                actionLabel="Create Pro order"
                onAction={() => createRazorpayOrder("pro")}
              />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <input className="h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm outline-none" value={seats} onChange={(event) => setSeats(event.target.value)} placeholder="Seats" />
              <button className="h-10 rounded-lg bg-white px-4 text-sm font-black text-slate-950" type="button" onClick={() => runAction(() => enterpriseCloudApi.updateSeats(Number(seats)), "Seat allocation updated.")}>Update seats</button>
              <button className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-white" type="button" onClick={() => runAction(() => enterpriseCloudApi.generateUsageInvoice(), "Usage invoice generated.")}>Generate invoice</button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <Mini label="API requests" value={paymentStatus?.usage?.developer?.requests ?? 0} />
              <Mini label="Tokens" value={paymentStatus?.usage?.developer?.tokens ?? 0} />
              <Mini label="OCR runs" value={paymentStatus?.usage?.ocr?.extractions ?? 0} />
              <Mini label="Browser sessions" value={paymentStatus?.usage?.browserAutomation?.sessions ?? 0} />
            </div>
          </Panel>

          <Panel title="Organization governance" icon={Building2}>
            <p className="text-sm text-white/55">Current org: {overview?.organization?.current?.name || "No organization linked"}</p>
            <div className="mt-4 flex gap-2">
              <input className="h-10 flex-1 rounded-lg border border-white/10 bg-black/25 px-3 text-sm outline-none" value={orgName} onChange={(event) => setOrgName(event.target.value)} />
              <button className="h-10 rounded-lg bg-white px-4 text-sm font-black text-slate-950" type="button" onClick={() => runAction(() => enterpriseCloudApi.createOrganization(orgName), "Organization created and linked.")}>Create</button>
            </div>
            <div className="mt-4 space-y-2">
              {(overview?.organization?.workspaces || []).map((workspace) => <div key={workspace.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">{workspace.name} - {workspace.plan}</div>)}
            </div>
          </Panel>

          <Panel title="API gateway policy" icon={ShieldCheck}>
            <div className="grid gap-3">
              <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">
                Require signed enterprise requests
                <input type="checkbox" checked={Boolean(policy?.require_signed_requests)} onChange={(event) => setPolicy((current) => ({ ...current, require_signed_requests: event.target.checked }))} />
              </label>
              <input className="h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm outline-none" value={(policy?.allowed_ips || []).join(",")} placeholder="Allowed IPs, comma separated" onChange={(event) => setPolicy((current) => ({ ...current, allowed_ips: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} />
              <input className="h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm outline-none" value={(policy?.blocked_ips || []).join(",")} placeholder="Blocked IPs, comma separated" onChange={(event) => setPolicy((current) => ({ ...current, blocked_ips: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} />
              <button className="h-10 rounded-lg bg-white px-4 text-sm font-black text-slate-950" type="button" onClick={() => runAction(() => enterpriseCloudApi.updateGatewayPolicy({
                allowedIps: policy?.allowed_ips || [],
                blockedIps: policy?.blocked_ips || [],
                requireSignedRequests: Boolean(policy?.require_signed_requests),
                regionalRouting: policy?.regional_routing || "auto",
                abuseThreshold: policy?.abuse_threshold || 100,
              }), "Gateway policy updated.")}>Save policy</button>
            </div>
          </Panel>

          <Panel title="Enterprise observability" icon={Gauge}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini label="Errors" value={usage.errors ?? 0} />
              <Mini label="Avg latency" value={usage.avg_latency_ms ? `${Math.round(Number(usage.avg_latency_ms))} ms` : "-"} />
              <Mini label="Healthy model routes" value={`${providerHealth}/${modelCount}`} />
            </div>
            <div className="mt-4 space-y-2">
              {(observability?.errors || []).map((item) => <div key={item.error_code || "unknown"} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">{item.error_code || "unknown"} - {item.count}</div>)}
            </div>
          </Panel>
        </section>

        <section className="mt-5">
          <Panel title="Model marketplace" icon={Database}>
            <div className="grid gap-3 lg:grid-cols-3">
              {models.map((model) => (
                <article key={model.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-black">{model.display_name}</p>
                  <p className="mt-1 text-sm text-white/50">{model.provider} / {model.model}</p>
                  <p className="mt-2 text-xs text-white/45">Score {model.providerScore?.score ?? "-"} - Streaming {model.supports_streaming ? "yes" : "no"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">{(model.capabilities || []).map((capability) => <span key={capability} className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/55">{capability}</span>)}</div>
                </article>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-2">
          <Panel title="Multi-model orchestration" icon={Network}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini label="Routing mode" value={globalAiOs?.orchestration?.routingMode || "-"} />
              <Mini label="Providers" value={globalAiOs?.orchestration?.providers?.length ?? "-"} />
              <Mini label="Fallback chain" value={globalAiOs?.orchestration?.fallbackChain?.length ?? "-"} />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {(globalAiOs?.orchestration?.providers || []).slice(0, 8).map((provider) => (
                <div key={provider.name} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold capitalize">{provider.name}</span>
                    <span className="text-xs text-white/50">score {provider.score?.score ?? "-"}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/45">{provider.type} - streaming {provider.supportsStreaming ? "on" : "fallback"}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Agent execution platform" icon={Bot}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini label="Templates" value={globalAiOs?.agentPlatform?.templates?.length ?? "-"} />
              <Mini label="Scheduled" value={globalAiOs?.agentPlatform?.scheduledAgents ?? "-"} />
              <Mini label="Run states" value={globalAiOs?.agentPlatform?.runs?.length ?? 0} />
            </div>
            <div className="mt-4 grid gap-2">
              {(globalAiOs?.agentPlatform?.templates || []).map((template) => (
                <div key={template.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-sm font-bold">{template.name}</p>
                  <p className="mt-1 text-xs text-white/50">{template.description}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="AI app builder" icon={Code2}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini label="Blueprints" value={globalAiOs?.appBuilder?.blueprints?.length ?? "-"} />
              <Mini label="Runs" value={globalAiOs?.appBuilder?.runs?.length ?? 0} />
              <Mini label="Stacks" value={globalAiOs?.appBuilder?.supportedStacks?.length ?? "-"} />
            </div>
            <div className="mt-4 grid gap-2">
              {(globalAiOs?.appBuilder?.blueprints || []).slice(0, 4).map((blueprint) => (
                <div key={blueprint.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-sm font-bold">{blueprint.name}</p>
                  <p className="mt-1 text-xs text-white/50">{blueprint.stack} - {(blueprint.capabilities || []).slice(0, 4).join(", ")}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Global deployment infrastructure" icon={Rocket}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini label="Targets" value={globalAiOs?.deployment?.targets?.length ?? "-"} />
              <Mini label="Plans" value={globalAiOs?.deployment?.recentPlans?.length ?? 0} />
              <Mini label="Cloud stack" value={globalAiOs?.deployment?.cloudStack?.length ?? "-"} />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {(globalAiOs?.deployment?.targets || []).map((target) => (
                <div key={target.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">
                  <p className="font-bold capitalize">{target.provider}</p>
                  <p className="mt-1 text-xs text-white/50">{target.target_type} - {target.region}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Marketplace ecosystem" icon={Blocks}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini label="Model providers" value={globalAiOs?.marketplace?.models?.length ?? "-"} />
              <Mini label="Blueprint stacks" value={globalAiOs?.marketplace?.blueprints?.length ?? "-"} />
              <Mini label="Workflow templates" value={globalAiOs?.marketplace?.workflowTemplates ?? 0} />
            </div>
            <Readiness items={globalAiOs?.marketplace?.ecosystems || []} />
          </Panel>

          <Panel title="Admin cloud and compliance" icon={Globe2}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini label="Users" value={globalAiOs?.adminCloud?.users ?? "-"} />
              <Mini label="Workspaces" value={globalAiOs?.adminCloud?.workspaces ?? "-"} />
              <Mini label="API key states" value={globalAiOs?.adminCloud?.apiKeys?.length ?? 0} />
            </div>
            <Readiness items={globalAiOs?.adminCloud?.centers || []} />
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-3">
          <Panel title="Cloud readiness" icon={Cloud}><Readiness items={["Kubernetes manifests", "ECS/Fargate task definition", "Nginx edge config", "Autoscaling worker guidance"]} /></Panel>
          <Panel title="Security posture" icon={Lock}><Readiness items={["RBAC workspace controls", "Audit trails", "API key hashing", "Signed request policy"]} /></Panel>
          <Panel title="Runtime systems" icon={Server}><Readiness items={["Redis queues", "PostgreSQL pgvector-ready", "WebSocket telemetry", "Provider routing"]} /></Panel>
        </section>
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value }) {
  return <div className="glass-card rounded-lg p-5"><Icon className="h-5 w-5 text-codrai-cyan" /><p className="mt-4 text-sm text-white/55">{label}</p><p className="mt-2 text-2xl font-black capitalize">{value}</p></div>;
}

function Panel({ title, icon: Icon, children }) {
  return <article className="glass-card rounded-lg p-5"><div className="mb-4 flex items-center gap-2"><Icon className="h-5 w-5 text-codrai-cyan" /><h2 className="font-black">{title}</h2></div>{children}</article>;
}

function Mini({ label, value }) {
  return <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3"><p className="text-xs text-white/45">{label}</p><p className="mt-1 font-black">{value}</p></div>;
}

function GatewayCard({ name, configured, webhook, reason, actionLabel, onAction }) {
  return (
    <article className={`rounded-lg border p-4 ${configured ? "border-emerald-300/25 bg-emerald-300/10" : "border-amber-300/20 bg-amber-300/10"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black">{name}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">{configured ? "Configured" : "Blocked"}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-black ${webhook ? "bg-emerald-300/15 text-emerald-100" : "bg-white/10 text-white/55"}`}>{webhook ? "Webhook ready" : "Webhook pending"}</span>
      </div>
      <p className="mt-3 min-h-[38px] text-xs leading-5 text-white/55">{reason || "Gateway is available for live checkout/order creation."}</p>
      <button className="mt-3 h-10 w-full rounded-lg bg-white px-4 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={!configured} onClick={onAction}>
        {actionLabel}
      </button>
    </article>
  );
}

function Readiness({ items }) {
  return <ul className="space-y-2 text-sm text-white/60">{items.map((item) => <li key={item} className="rounded-lg border border-white/10 bg-white/[0.04] p-2">{item}</li>)}</ul>;
}
