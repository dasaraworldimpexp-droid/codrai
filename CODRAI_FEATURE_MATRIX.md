# CODRAI Feature Matrix

Last updated: 2026-05-28

Status legend:

- Verified: recently tested end-to-end or route-smoke validated.
- Operational: implemented and expected to run, but not freshly exercised end-to-end in this update.
- Partial: architecture exists, but live production behavior needs more work or proof.
- Blocked: depends on missing credentials, host, model, binary, or external service.
- Experimental: present as advanced AI OS surface but not safe to treat as core production capability.

| System | Status | Frontend | Backend/API | Persistence | Validation Evidence | Next Action |
| --- | --- | --- | --- | --- | --- | --- |
| Landing page | Verified | Present | N/A | N/A | Browser route smoke passed | Keep visual polish only |
| Sign in/sign up | Verified | Present | `/api/auth/*` | PostgreSQL | Signup/login/session/logout validated | Add automated auth smoke |
| Protected routes | Verified | Present | Auth middleware | Token/session records | Protected routes loaded after auth | Preserve route paths |
| Dashboard fixed sidebar | Verified | Present | Dashboard APIs | Runtime data | Fixed sidebar report passed | Do not rebuild layout |
| Theme engine | Verified | Present | N/A | localStorage | UI report contrast/build passed | Apply tokens to new UI |
| CODRAI brand mark | Verified | Present | N/A | N/A | Logo and animated robot visible | Preserve robot and legacy logo |
| Command palette | Verified | Present | Route actions | N/A | Ctrl+K opened and filtered | Keep popup removed |
| Global error boundary | Verified | Present | N/A | N/A | Mounted in `main.jsx` | Add error telemetry later |
| Native WebSocket `/ws` | Verified | Realtime store | `/ws` server | Runtime event state | Subscribe returned expected message | Keep native path |
| Socket.IO transport | Partial | Some dependency present | Socket.IO polling works | N/A | Forced websocket-only failed in Node client | Only fix if app needs it |
| Backend API gateway | Verified | API clients | `backend/src/app.js` | Service-specific | `/api/health` 200 and route smoke | Preserve routes |
| Docker stack | Verified | Frontend container | Backend/worker containers | Volumes | Compose services healthy/running | Avoid destructive cleanup |
| PostgreSQL | Verified | N/A | DB services | PostgreSQL | `pg_isready` accepting | Add backup restore drill |
| Redis/BullMQ | Verified | Queue views | Worker queues | Redis | Redis `PING` and worker running | Add queue replay tests |
| Ollama runtime | Verified | Model visibility | Provider runtime | Ollama volume | `/api/tags` returned models | Keep CPU-first |
| Local models | Verified | Model selector surfaces | Ollama | Ollama models | tinyllama, llama3.1, deepseek-coder, qwen2.5-coder detected | Avoid giant model pulls |
| Paid provider settings | Partial | Provider settings page | Provider routes/services | Encrypted key vault | Health endpoint returned partial | Configure real keys |
| OpenAI live execution | Blocked | Wired | Provider abstraction | Usage metrics ready | Missing API key | Validate real key/request |
| Gemini live execution | Blocked | Wired | Provider abstraction | Usage metrics ready | Missing API key | Validate real key/request |
| Anthropic live execution | Blocked | Wired | Provider abstraction | Usage metrics ready | Missing API key | Validate real key/request |
| Other paid providers | Blocked | Wired | OpenAI-compatible adapters | Usage metrics ready | Missing keys | Validate individually |
| AI Studio route | Verified | Present | `/api/ai-studio/*` | Jobs/templates | Route smoke passed | Test workflow execution |
| Workflow builder | Partial | Visual surfaces | `/api/workflows/*` | Workflow data | API surface exists | End-to-end save/run/replay |
| Agent runtime | Partial | Agent panels | `/api/agents/*` | Agent run records | Routes exist | Verify multi-step task |
| Autonomous cycles | Partial | Dashboard panels | `/api/autonomous-cycles/*` | Runtime records | Routes exist | Verify recovery/replay |
| Conversations/chat | Operational | Chat surfaces | `/api/conversations/*` | Messages | Routes exist | Validate streaming provider response |
| Memory/RAG | Partial | Memory panels | `/api/memory`, `/api/knowledge` | PostgreSQL/pgvector-ready | Reports exist | Insert/search/retrieve proof |
| File upload/search | Operational | Upload/search surfaces | `/api/files/*` | Local/object abstraction | Routes exist | Test with files |
| Object storage | Partial | File UI | `/api/files/objects/*` | Storage abstraction | Routes exist | Configure S3/R2/MinIO |
| Multimodal/OCR | Partial | Multimodal panels | `/api/multimodal/*` | Jobs/files | Route exists | Prove real image/audio jobs |
| Whisper CPU | Blocked/Partial | Transcript panels planned | Multimodal/service hooks | Transcript storage planned | No current binary/model proof | Validate `WHISPER_CPP_BIN` and model |
| Browser/computer use | Operational | Browser panels | `/api/computer-use/*` | Session/replay | Prior reports indicate Chromium working | Revalidate on demand |
| Enterprise Cloud | Verified | Present | `/api/enterprise/cloud/*` | Workspace/billing/runtime | Route smoke passed | Add deeper action tests |
| Global Control Center | Verified | Present | Enterprise/router APIs | Runtime data | Route smoke passed | Validate action buttons |
| Developer platform | Verified | Present | `/api/developer/*` | API/log data | Routes smoke passed | Add API playground tests |
| Billing plans/invoices | Operational | Billing panels | `/api/billing/*` | Billing tables | Draft invoice verified | Add live payment credentials |
| Stripe integration | Blocked | Checkout UI wired | Stripe routes/webhook | Billing records | Missing secrets/price IDs | Sandbox checkout + webhook |
| Razorpay integration | Blocked | Order UI wired | Razorpay routes/webhook | Billing records | Missing credentials | Sandbox order + webhook |
| Marketplace | Partial | Marketplace cards | `/api/marketplace/*` | Install records | Routes exist | Validate real package install |
| Mobile runtime | Partial | Responsive/PWA surfaces | `/api/mobile/*` | Notification queue | Push adapters report blocked without creds | Add real push credentials |
| Deployment engine | Partial | Deployment UI | `/api/deployment/*` | Plans/snapshots | Production overlay config rendered | Deploy to real host |
| Observability metrics | Operational | Dashboards | `/api/telemetry/*` | Metrics source | Prometheus metrics expanded | Deploy Grafana/alerts |
| Security hardening | Operational | Protected UI | Helmet/rate/auth middleware | Audit logs | Auth/rate/helmet exist | Add CI audit and CSRF if cookie-primary |
| Team/workspaces | Partial | Enterprise/workspace UI | `/api/teams`, `/api/workspace` | Workspace records | Routes exist | Invite/member E2E tests |
| Production NGINX/TLS | Partial | N/A | Config/docs | Certs pending | Deployment docs/config exist | Validate with domain |
| Backups/restore | Partial | Admin docs/surfaces | Scripts/docs | DB/object backups | Reports exist | Perform restore drill |
