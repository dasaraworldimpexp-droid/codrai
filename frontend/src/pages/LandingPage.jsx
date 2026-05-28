import { ArrowRight, BarChart3, Boxes, LockKeyhole, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import CodraiBrandMark from "../components/CodraiBrandMark.jsx";

const features = [
  {
    title: "Monetization",
    text: "Turn AI workflows into subscription-ready products with usage tiers and payment flows.",
    icon: BarChart3,
    accent: "text-codrai-gold",
  },
  {
    title: "Marketplace",
    text: "Package prompts, tools, templates, and AI agents into premium customer experiences.",
    icon: Boxes,
    accent: "text-codrai-mint",
  },
  {
    title: "Security",
    text: "Auth, protected routes, encrypted credentials, and verification-ready payment events.",
    icon: ShieldCheck,
    accent: "text-codrai-cyan",
  },
  {
    title: "Scale",
    text: "Dockerized frontend, backend, PostgreSQL, Redis, workers, WebSockets, and AI provider routing.",
    icon: Zap,
    accent: "text-violet-300",
  },
];

const operatingSystemLayers = [
  "Streaming chat workspace",
  "Autonomous agent panels",
  "Runtime observability",
  "Workflow automation",
  "Provider orchestration",
  "Billing-ready SaaS shell",
];

const pricingTiers = [
  {
    name: "Local",
    price: "Self-hosted",
    text: "Run CODRAI on your own Docker stack with CPU-first local AI and honest blocked-state reporting.",
  },
  {
    name: "Team",
    price: "Usage-ready",
    text: "Workspace collaboration, provider setup, API metering foundations, and enterprise observability.",
  },
  {
    name: "Enterprise",
    price: "Custom",
    text: "Governance, deployment controls, audit views, and private infrastructure readiness for serious teams.",
  },
];

const proofPoints = [
  "Docker, PostgreSQL, Redis, WebSocket, and Ollama-aware architecture",
  "Provider cards and AI Studio surfaces remain connected to existing runtime APIs",
  "CPU-first optimization preserves local stability on constrained hardware",
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-codrai-ink text-white">
      <div className="codrai-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute left-1/2 top-[-220px] h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-cyan-400/16 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-260px] right-[-180px] h-[520px] w-[520px] rounded-full bg-emerald-300/12 blur-[120px]" />

      <nav className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <CodraiBrandMark compact />

        <div className="hidden items-center gap-8 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/70 backdrop-blur-xl md:flex">
          <a className="transition hover:text-white" href="#platform">Platform</a>
          <a className="transition hover:text-white" href="#builder">Builder</a>
          <Link className="transition hover:text-white" to="/dashboard">Dashboard</Link>
        </div>

        <Link
          to="/dashboard"
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          <LockKeyhole className="h-4 w-4" />
          Sign in
        </Link>
      </nav>

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-92px)] w-full max-w-7xl items-center gap-12 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="animate-float-up">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
            <Sparkles className="h-4 w-4 text-codrai-cyan" />
            AI SaaS control layer for builders
          </div>

          <h1 className="max-w-4xl text-5xl font-black leading-[0.96] tracking-normal text-white sm:text-6xl lg:text-7xl">
            Transform CODR AI into a premium revenue engine...
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/68">
            Launch a polished AI product with authentication, chat history, provider orchestration, usage telemetry, and a dashboard built for operators who care about speed, trust, and conversion.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#builder"
              className="shine inline-flex h-14 items-center justify-center gap-3 rounded-lg bg-white px-6 text-base font-bold text-slate-950 transition hover:bg-cyan-100"
            >
              Build SaaS Blueprint
              <ArrowRight className="h-5 w-5" />
            </a>
            <Link
              to="/dashboard"
              className="inline-flex h-14 items-center justify-center gap-3 rounded-lg border border-white/15 bg-white/10 px-6 text-base font-bold text-white backdrop-blur-xl transition hover:bg-white/15"
            >
              Open Control Center
              <BarChart3 className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <div id="platform" className="grid gap-4 md:grid-cols-2 lg:pl-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="glass-card animate-float-up rounded-lg p-6"
                style={{ animationDelay: `${140 + index * 90}ms` }}
              >
                <div className={`mb-8 grid h-12 w-12 place-items-center rounded-lg border border-white/10 bg-white/10 ${feature.accent}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="text-xl font800 font-bold text-white">{feature.title}</h2>
                <p className="mt-3 text-sm leading-6 text-white/62">{feature.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="builder" className="relative z-10 border-t border-white/10 bg-white/[0.025] px-5 py-14 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-codrai-mint">Builder</p>
            <h2 className="mt-3 text-3xl font-black text-white">A practical foundation for the full product.</h2>
          </div>
          <div className="grid gap-3 text-sm text-white/68 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">JWT auth and protected dashboard flows.</div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">PostgreSQL persistence for users, plans, chats, workflows, and runtime memory.</div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">Provider settings, Redis queues, and AI runtime modules wired to real backend services.</div>
          </div>
        </div>
      </section>

      <section className="codrai-landing-command relative z-10 px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-codrai-cyan">Operating System</p>
            <h2 className="mt-3 max-w-xl text-4xl font-black leading-tight text-white">An enterprise AI command center with real runtime surfaces.</h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62">
              CODRAI presents chat, agents, providers, queues, memory, deployments, billing, and diagnostics as one coherent operator experience while preserving the backend truth layer.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {proofPoints.map((item) => (
                <span key={item} className="codrai-proof-pill">{item}</span>
              ))}
            </div>
          </div>
          <div className="codrai-landing-console">
            {operatingSystemLayers.map((layer, index) => (
              <div key={layer} className={index < 3 ? "is-live" : ""}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{layer}</strong>
                <small>{index < 3 ? "connected" : "workspace-ready"}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-y border-white/10 bg-white/[0.03] px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-codrai-mint">SaaS Ready</p>
              <h2 className="mt-3 text-3xl font-black text-white">Plans for self-hosted teams and enterprise operators.</h2>
            </div>
            <Link to="/enterprise-cloud" className="inline-flex h-12 items-center justify-center rounded-lg border border-white/15 bg-white/10 px-5 text-sm font-bold text-white transition hover:bg-white/15">
              View enterprise cloud
            </Link>
          </div>
          <div className="codrai-pricing-grid mt-8">
            {pricingTiers.map((tier) => (
              <article key={tier.name} className="codrai-pricing-card">
                <p>{tier.name}</p>
                <h3>{tier.price}</h3>
                <span>{tier.text}</span>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
