# CODRAI Master Development Memory

Last updated: 2026-05-28

This document is the permanent source of truth for CODRAI project state. Future Codex sessions should read this file before proposing architecture changes, rebuilding systems, or starting new phases.

## A. Project Overview

CODRAI is a CPU-first, Dockerized enterprise AI operating system and SaaS platform. It combines a premium React dashboard, protected workspace routes, Node/Express APIs, PostgreSQL persistence, Redis/BullMQ queues, native WebSocket realtime updates, Ollama local AI runtime, provider orchestration, enterprise cloud surfaces, AI Studio surfaces, billing architecture, marketplace architecture, deployment telemetry, and observability reports.

Platform vision:

- A self-hosted and cloud-deployable AI operating system.
- Local-first AI execution through Ollama, with paid providers wired behind honest readiness checks.
- Enterprise SaaS capabilities including workspaces, RBAC surfaces, billing architecture, provider settings, deployment dashboards, runtime telemetry, and developer tooling.
- Premium AGI command-center UX with fixed sidebar dashboard, dark/light theme, animated CODR robot AI brand, and high-contrast enterprise visual system.

Main technologies:

- Frontend: React, Vite, Tailwind CSS, Framer Motion, lucide-react, React Router.
- Backend: Node.js, Express, Helmet, CORS, rate limiting, JWT auth, cookie support, modular route/controllers/services.
- Persistence: PostgreSQL, pgvector-ready memory routes, Redis, BullMQ.
- Runtime: Docker Compose, worker service, Ollama local models, native WebSocket `/ws`.
- Deployment assets: production Docker Compose overlay, NGINX/deployment docs, Kubernetes-ready folders, Netlify/Vercel/Render/Railway configs.

Current production readiness:

- Overall platform readiness: 91/100, from `FULL_APP_STABILIZATION_REPORT.md`.
- Frontend visual/readability readiness: 96/100, from `GLOBAL_UI_REFACTOR_REPORT.md`.
- Deployment readiness endpoint previously reported `production_ready_with_blockers` at 83 percent in `PHASE_29_ENTERPRISE_COMMERCIALIZATION_REPORT.md`.

## Current Verified Runtime State

Verified by recent reports and scans:

- Docker Compose stack is operational.
- Backend container reports healthy.
- Frontend container is running.
- PostgreSQL is healthy.
- Redis is healthy.
- Worker service is running.
- Ollama is running.
- Native WebSocket `/ws` subscribes successfully.
- Auth signup, login, logout, protected routes, and `/api/auth/me` were validated.
- Dashboard fixed-sidebar architecture is validated.
- Frontend route smoke tests passed for landing, auth, dashboard, provider settings, developer pages, enterprise cloud, global control center, and AI Studio.
- Production frontend build passed during stabilization and UI validation passes.
- Browser QA reported zero console errors and no failed requests during the latest route smoke.

Installed local Ollama models previously detected:

- `tinyllama:latest`
- `llama3.1:latest`
- `deepseek-coder:latest`
- `qwen2.5-coder:latest`

Hardware policy:

- CPU-first is the permanent safe default.
- Intel UHD-only hardware means NVIDIA/CUDA/GPU acceleration is a non-goal unless the hardware changes and is explicitly revalidated.
- Do not pull giant models or install GPU stacks on the current machine.

## B. Completed Systems

### Frontend Routing Shell

Status: Completed and route-smoke validated.

What was built:

- React Router application with public landing/auth routes and protected workspace routes.
- Route coverage includes `/`, `/signin`, `/signup`, `/dashboard`, `/settings/providers`, `/developer`, `/developer/api-keys`, `/developer/usage`, `/developer/logs`, `/developer/docs`, `/enterprise-cloud`, `/global-control-center`, and `/ai-studio`.
- Catch-all route falls back to protected dashboard.

Important files:

- `frontend/src/App.jsx`
- `frontend/src/main.jsx`
- `frontend/src/features/auth/components/ProtectedRoute.jsx`

Validation status:

- Browser route smoke passed in `FULL_APP_STABILIZATION_REPORT.md`.

Known limitations:

- Not every individual nested button on every large dashboard surface has been clicked manually.

### Global Error Boundary

Status: Completed.

What was built:

- Branded React error boundary to prevent blank-screen crashes.

Important files:

- `frontend/src/components/AppErrorBoundary.jsx`
- `frontend/src/main.jsx`

Validation status:

- Error boundary was mounted and not visible during normal route QA.

### Premium Theme And Visual System

Status: Completed for global readability and visual baseline.

What was built:

- Premium light/dark semantic token layer.
- High-contrast typography layer.
- Global button/card compatibility polish for legacy low-opacity utilities.
- Floating theme toggle and persistent theme support from earlier phases.
- Removed the `Command layer online / Ctrl+K` popup and ghost command artifacts.

Important files:

- `frontend/src/index.css`
- `frontend/tailwind.config.js`
- `frontend/src/pages/DashboardPage.jsx`

Validation status:

- `npm run build --prefix frontend` passed.
- Browser QA passed with zero console errors.
- Dark and light body contrast were validated above 18:1 in `GLOBAL_UI_REFACTOR_REPORT.md`.

Known limitations:

- Individual page screenshots can still be used for fine polish, but global contrast and card/button readability rules are active.

### CODRAI Branding System

Status: Completed and preserved.

What was built:

- Current CODRAI brand identity uses the premium legacy logo plus CODR + animated robot + AI structure.
- Animated robot must remain between CODR and AI.

Important files:

- `frontend/src/components/CodraiBrandMark.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/index.css`

Validation status:

- Legacy logo and animated robot were visible in frontend QA.

### Fixed Sidebar Dashboard Architecture

Status: Completed and validated.

What was built:

- Desktop fixed sidebar with `100dvh` behavior.
- Main content is the only vertical scroller.
- Body/page double scrolling eliminated.
- Mobile/tablet drawer behavior added.
- High-contrast dashboard/sidebar typography.

Important files:

- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/index.css`

Validation status:

- Sidebar position remained fixed during content scroll.
- `window.scrollY` stayed `0`.
- Horizontal overflow was false.
- Mobile drawer opened correctly.

### Command Palette

Status: Completed and preserved.

What was built:

- Ctrl+K command palette remains functional.
- Command popup notification was removed.
- Command trigger styling was improved as part of the UI refactor.

Important files:

- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/index.css`

Validation status:

- Ctrl+K opened and filtered commands during browser QA.

### Authentication And Session Flow

Status: Operational and validated locally.

What was built:

- Signup, login, refresh, logout, forgot password, reset password, verify email, and `/me` routes.
- Frontend protected route behavior.
- Access/refresh token persistence.
- Bearer token and httpOnly-cookie-compatible backend support.

Important files:

- `backend/src/routes/auth.routes.js`
- `backend/src/controllers/auth.controller.js`
- `backend/src/middleware/auth.middleware.js`
- `frontend/src/features/auth`

Validation status:

- Signup redirected to dashboard.
- `/api/auth/me` returned HTTP 200 with token.
- Logout cleared auth state and returned to sign-in.

Known limitations:

- Production should prefer httpOnly-cookie-first auth and add CSRF protection if cookie-only auth becomes primary.

### Backend API Gateway And Route Surface

Status: Operational.

What was built:

- Modular Express route surface for runtime, activity, auth, AI Studio, analytics, billing, conversations, deployment, developer, distributed execution, workflows, providers, enterprise, marketplace, memory, multimodal, teams, orchestrator, open-source runtime, security, telemetry, and many AI OS surfaces.

Important files:

- `backend/src/app.js`
- `backend/src/routes/*`
- `backend/src/controllers/*`
- `backend/src/services/*`

Validation status:

- `GET /api/health` returned HTTP 200.
- Dashboard route-triggered API calls returned HTTP 200 or valid 304 responses.
- Major protected surfaces loaded during browser route tests.

Known limitations:

- Some advanced surfaces are architecture-ready or diagnostic-oriented rather than fully live commercial services.

### Docker Runtime

Status: Operational.

What was built:

- Docker Compose stack with backend, frontend, PostgreSQL, Redis, Ollama, and worker services.
- Production and local AI compose overlays exist.

Important files:

- `docker-compose.yml`
- `docker-compose.production.yml`
- `docker-compose.local-ai.yml`
- `docker-compose.gpu.yml` (legacy optional file; GPU is not a goal on current hardware)

Validation status:

- Backend healthy, frontend running, PostgreSQL healthy, Redis healthy, Ollama running, worker running in recent checks.

Known limitations:

- Orphan Ollama containers were reported previously. No destructive cleanup was performed.

### PostgreSQL Persistence

Status: Operational.

What was built:

- PostgreSQL-backed persistence for auth, workspace/runtime features, billing, jobs, reports, memory-ready systems, and enterprise surfaces.

Important files:

- `backend/src/db`
- `backend/src/repositories`
- `backend/src/models`

Validation status:

- PostgreSQL `pg_isready` previously returned accepting connections.

Known limitations:

- pgvector/RAG features are wired or partially implemented depending on route; production RAG should be verified with real documents and retrieval tests before claiming completion.

### Redis And BullMQ Worker Runtime

Status: Operational.

What was built:

- Redis-backed queue/runtime worker architecture.
- Worker service runs in Docker.

Important files:

- `backend/src/workers`
- `backend/src/services`
- `docker-compose.yml`

Validation status:

- Redis `PING` previously returned `PONG`.
- Worker service running in Docker.

Known limitations:

- Distributed multi-node worker mesh remains readiness-oriented unless separate remote nodes are configured.

### Ollama Local Runtime

Status: Operational in CPU-first mode.

What was built:

- Local AI runtime via Ollama.
- Low-resource local model strategy.

Important files:

- `backend/src/providers`
- `backend/src/bootstrap/runtime-bootstrap.js`
- `backend/src/workers/index.js`
- `docker-compose.yml`

Validation status:

- Ollama `/api/tags` returned installed models.
- Prior reports validated TinyLlama, Llama 3.1, DeepSeek Coder, and Qwen 2.5 Coder.

Known limitations:

- No GPU acceleration on current Intel UHD-only hardware.

### Native WebSocket Runtime

Status: Operational.

What was built:

- Native `/ws` subscription path for realtime frontend updates.

Important files:

- `backend/src/realtime`
- `frontend/src/features/realtime/realtimeStore.js`

Validation status:

- Subscribe message returned `{"type":"subscribed","channel":"workspace:dashboard"}`.

Known limitations:

- Socket.IO polling works, but forced Socket.IO websocket-only failed in Node test client. This does not block the current frontend because it uses native `/ws`.

### Provider Settings And Provider Orchestration

Status: Wired and locally operational; paid providers are blocked without real keys.

What was built:

- Provider registry, settings service, encrypted provider key storage, provider validation route, health dashboard, local-first routing, failover chain, latency scoring, retry policy, token/usage persistence.

Important files:

- `backend/src/services/provider-settings.service.js`
- `backend/src/providers`
- `backend/src/routes/provider.routes.js`
- `backend/src/controllers/provider.controller.js`
- `backend/src/core/model-router`

Validation status:

- Provider settings route/API reachable.
- `GET /api/providers/health` returned partial status in Phase 29 with Ollama active and paid providers blocked by missing keys.

Known limitations:

- OpenAI, Gemini, Anthropic, OpenRouter, Groq, xAI, Mistral, DeepSeek cloud, Together, Stability, ElevenLabs, fal.ai require configured credentials and live validation.

### AI Studio Surfaces

Status: Route/API surface operational; deeper execution workflows require targeted end-to-end tests.

What was built:

- Protected AI Studio route.
- Readiness/templates/media job APIs.
- Runtime panel surfaces from phase reports.

Important files:

- `frontend/src/pages/AiStudioPage.jsx`
- `backend/src/routes/ai-studio.routes.js`
- `backend/src/controllers/ai-studio.controller.js`

Validation status:

- AI Studio route loaded during browser route smoke.
- AI Studio APIs returned data during route tests.

Known limitations:

- Full workflow builder save/load/execution should be treated as partially complete unless a specific current run verifies it.

### Enterprise Cloud And Global Control Center

Status: Operational route/API surfaces.

What was built:

- Enterprise cloud overview, billing, organization, gateway policy, models, observability, diagnostics, global AI OS, AI orchestration, agents, app builder, deployment readiness, marketplace ecosystem, security hardening, control center, operating system, autonomous OS.

Important files:

- `frontend/src/pages/EnterpriseCloudPage.jsx`
- `frontend/src/pages/GlobalControlCenterPage.jsx`
- `frontend/src/features/enterprise-cloud`
- `backend/src/routes/enterprise.routes.js`
- `backend/src/services/enterprise-cloud.service.js`

Validation status:

- Routes loaded during browser QA.
- Enterprise route-triggered APIs returned data.

Known limitations:

- Cloud-scale multi-tenant production operation still requires real deployment, credentials, and load validation.

### Billing Architecture

Status: Architecture operational; live payment capture blocked by credentials.

What was built:

- Billing plans, quotas, status, usage invoices, seat update endpoint, Stripe checkout route, Stripe webhook route, Razorpay orders, Razorpay webhook, credit wallet, usage metering, GST-ready invoice fields.

Important files:

- `backend/src/routes/billing.routes.js`
- `backend/src/core/billing`
- `backend/src/controllers/billing.controller.js`

Validation status:

- Draft usage invoice generation was verified in Phase 29.

Known limitations:

- Live Stripe and Razorpay require real secrets, price IDs, and webhook validation.

### Marketplace Architecture

Status: API surface exists; real external extension lifecycle needs further validation.

What was built:

- Extension listing, installation listing, install endpoint, review endpoint.

Important files:

- `backend/src/routes/marketplace.routes.js`
- `backend/src/controllers/marketplace.controller.js`

Known limitations:

- Do not claim real public marketplace distribution until registry sync, install artifacts, rollback, and extension execution are verified.

### Deployment And Observability Surfaces

Status: Operational locally; global production deployment pending.

What was built:

- Deployment diagnostics, production readiness, infrastructure status, recovery, verification, plans, templates, snapshots, rollback, replay history.
- Telemetry metrics routes and Prometheus-oriented reports.

Important files:

- `backend/src/routes/deployment.routes.js`
- `backend/src/routes/telemetry.routes.js`
- `deploy`
- `k8s`
- `docker-compose.production.yml`

Validation status:

- Production compose overlay rendered successfully in Phase 29.
- Deployment readiness endpoint returned with blockers.

Known limitations:

- Real SSL/TLS automation, production domain, backup restore drills, and multi-region failover are pending.

## C. DO NOT REBUILD -- ALREADY IMPLEMENTED

Future sessions must not rebuild these from scratch:

- React/Vite frontend architecture.
- React Router route structure.
- Protected route system.
- CODRAI brand mark with legacy logo plus CODR animated robot AI.
- Global dark/light theme engine and premium visual token layer.
- Fixed dashboard sidebar/content-scroll architecture.
- Ctrl+K command palette.
- Global React error boundary.
- Node/Express backend route architecture.
- Docker Compose foundation.
- PostgreSQL persistence foundation.
- Redis/BullMQ queue foundation.
- Worker service foundation.
- Ollama local runtime foundation.
- Native `/ws` realtime path.
- Provider registry/settings/key-vault abstraction.
- Enterprise Cloud route/API surfaces.
- AI Studio route/API surface.
- Developer platform pages.
- Billing plan/invoice/Stripe/Razorpay route architecture.
- Marketplace route architecture.
- Deployment diagnostics/plans/snapshot/rollback route architecture.
- Runtime telemetry and report trail.

Improve these systems incrementally. Do not replace them unless there is a documented architectural decision and rollback plan.

## D. Partially Completed Systems

### Paid Provider Live Execution

What exists:

- Provider registry, health, encrypted settings, model routing, local Ollama fallback.

What is missing:

- Real API keys in environment or provider settings.
- Live paid-provider completion/streaming validation for each provider.
- Production budget caps and provider-specific cost verification.

Priority: High for commercial launch.

Next steps:

- Configure sandbox/live keys per provider.
- Run provider validation endpoint.
- Run one real text request and one streaming request per enabled provider.
- Persist latency/token/cost records.

### Stripe And Razorpay Live Billing

What exists:

- Routes, invoices, plans, seat management, credit wallet, usage metering, webhook handlers.

What is missing:

- Live/sandbox credentials.
- Price IDs/products.
- Webhook endpoint registration.
- End-to-end checkout and webhook replay tests.

Priority: High for SaaS launch.

### RAG And Vector Memory

What exists:

- Memory routes, knowledge routes, reports, pgvector-ready architecture, file upload/search surfaces.

What is missing:

- Current proof of vector insert/retrieve with real document set in this run.
- Retrieval quality metrics and workspace isolation verification for a fresh sample.

Priority: High for AI memory product value.

### Whisper CPU Transcription

What exists:

- Phase reports and multimodal route surface.

What is missing:

- Current confirmed `whisper.cpp` or `faster-whisper` binary/model path validation.
- Real audio job submission and persisted transcript proof.

Priority: Medium.

### AI Studio Workflow Builder

What exists:

- AI Studio route/API, templates/media jobs, visual surfaces.

What is missing:

- Fresh end-to-end validation for save/load/version/execution/replay of a workflow.

Priority: Medium-high.

### Marketplace Install Runtime

What exists:

- Marketplace listing/install/review routes.

What is missing:

- Real extension package registry, package extraction, rollback test, execution sandbox proof.

Priority: Medium.

### Mobile Native Runtime

What exists:

- Mobile API surfaces and push adapter status.

What is missing:

- Native mobile app shell, real push credentials, offline sync QA on devices.

Priority: Medium.

### Production Cloud Deployment

What exists:

- Production compose overlay, deploy docs, k8s folder, deployment endpoints.

What is missing:

- Real VPS/Kubernetes deployment, domain, SSL, backup restore drill, monitoring stack deployment.

Priority: High for public launch.

## E. Pending Roadmap

Near term:

- Keep fixed-sidebar and theme system stable while resolving any page-specific visual regressions.
- Add automated route smoke tests for all protected routes.
- Add automated auth flow smoke test.
- Add provider key setup guide and validate OpenAI/Gemini with real keys when available.
- Add payment sandbox credentials and test Stripe/Razorpay webhooks.
- Prove RAG with one uploaded PDF/TXT and workspace-isolated retrieval.
- Prove Whisper CPU with a tiny/base model and a short audio file.

Mid term:

- Make AI Studio workflow save/load/execution/replay fully verified.
- Add marketplace install package validation and rollback.
- Add workspace/team invite end-to-end tests.
- Add billing credit decrement tests tied to real AI execution.
- Add background job replay UI and queue dashboards with drill-down.
- Add admin observability dashboards for cost, latency, errors, queues, provider health.

Long term:

- Deploy production stack on VPS/Kubernetes with NGINX, TLS, backups, restore validation, and alerting.
- Add enterprise SSO/SAML/OIDC.
- Build native mobile apps or PWA with offline sync and push notifications.
- Add multi-node worker scaling with real remote workers.
- Add SOC2-style audit exports and compliance reporting.

Non-goals on current hardware:

- CUDA/NVIDIA setup.
- Heavy GPU-only models.
- Giant 70B model pulls.
- Destructive Docker cleanup without explicit approval.

## F. Architecture Decisions

Finalized decisions:

- Preserve React + Vite + Tailwind frontend.
- Preserve Node/Express backend.
- Preserve Docker Compose foundation.
- Preserve PostgreSQL and Redis.
- Preserve BullMQ-style worker runtime.
- Preserve Ollama local runtime.
- Preserve native `/ws` frontend realtime path.
- Preserve fixed dashboard sidebar architecture.
- Preserve CODRAI branding with legacy logo plus CODR animated robot AI.
- Preserve premium glassmorphism design system with high-contrast dark/light themes.
- Preserve CPU-first runtime policy on this machine.
- Preserve honest degraded/blocked states for unavailable providers, payments, push adapters, Whisper, or cloud services.

Do not change these without a written architecture decision record.

## G. Current Blockers

- Paid provider execution is blocked until real provider API keys are configured and validated.
- Stripe live billing is blocked until Stripe secrets, price IDs, and webhook registration are configured.
- Razorpay live billing is blocked until Razorpay credentials and webhook registration are configured.
- Whisper CPU runtime is not currently proven in this memory update.
- RAG/vector memory should not be claimed complete until fresh insert/search/retrieval tests are run.
- Socket.IO forced websocket-only transport had an issue in a Node test client; native `/ws` is operational and used by the app.
- Production global deployment is pending a real host/domain/TLS/backup validation.
- Exhaustive click testing of every dashboard button is not complete; route-level and API smoke passed.

## H. Future Codex Instructions

Before making changes:

1. Read this file.
2. Read the relevant phase report for the area being changed.
3. Check current runtime health before claiming any runtime state.
4. Preserve already completed systems.
5. Work incrementally with rollback-safe patches.

Systems safe to modify:

- Documentation and reports.
- Page-specific UI polish that follows existing theme tokens.
- New tests and smoke scripts.
- Provider validation improvements that reuse existing provider registry.
- Billing verification flows that reuse existing billing routes.
- RAG implementation details that reuse existing PostgreSQL/pgvector-ready memory routes.

High-risk areas:

- Docker Compose service names, networks, volumes.
- Auth/session middleware and token semantics.
- PostgreSQL schema changes.
- Redis/BullMQ queue names and worker bootstrapping.
- Native WebSocket contract.
- Provider key encryption format.
- Route path names.
- Dashboard fixed-sidebar layout container hierarchy.

Required honesty rules:

- Never claim paid provider readiness without a real key validation and real request.
- Never claim live payments without checkout and webhook verification.
- Never claim GPU support on the current Intel UHD-only machine.
- Never claim Whisper, RAG, marketplace install, or deployment production readiness without a fresh end-to-end test.

## Change Tracking Protocol

Use `CODRAI_DEVELOPMENT_LOG.md` for every future major change. Each entry must include:

- Date.
- Phase/change name.
- Systems touched.
- Files changed.
- Validation performed.
- Production readiness impact.
- New blockers.
- Any new "do not rebuild" decisions.

When a system becomes fully verified, update:

- `CODRAI_MASTER_MEMORY.md`
- `CODRAI_FEATURE_MATRIX.md`
- `CODRAI_COMPLETED_SYSTEMS.md`
- `CODRAI_PENDING_SYSTEMS.md`

This memory system must remain conservative: incomplete systems stay partial until runtime proof exists.
