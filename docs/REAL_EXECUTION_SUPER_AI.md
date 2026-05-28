# CODRAI Real Execution Super AI Operating System

This phase converts the prior architecture into real execution infrastructure. The system now has concrete provider adapters, Postgres persistence, Redis/BullMQ queues, SSE token streaming, WebSocket event fanout, pgvector memory schema, Docker/Kubernetes scaffolding, CI, rate limiting, compression, and queue workers.

## Real Runtime Requirements

Set these environment variables before running production execution:

```txt
DATABASE_URL
REDIS_URL
OPENAI_API_KEY
ANTHROPIC_API_KEY
GEMINI_API_KEY
ELEVENLABS_API_KEY
FAL_API_KEY
```

Provider-specific systems fail closed when keys are missing. CODRAI does not fabricate AI responses.

## Execution Paths

```txt
AI chat / coding
  -> /api/runtime/execute or /api/runtime/stream
  -> AI Runtime Engine
  -> Model Router
  -> Provider Runtime
  -> OpenAI / Claude / Gemini
  -> Usage Ledger + Conversation History + Realtime Events

Image / video / voice
  -> Runtime or Creation Engine
  -> Queue where needed
  -> BullMQ worker
  -> fal.ai / OpenAI image / ElevenLabs
  -> Job result + progress events

Memory
  -> OpenAI embeddings
  -> Postgres pgvector ai_memories
  -> Semantic retrieval
```

## Realtime

- SSE: `POST /api/runtime/stream`
- WebSocket: `ws://localhost:5000/ws`
- Event channels: `workspace:{id}`, `project:{id}`, `conversation:{id}`, `job:{id}`, `agent:{id}`

## DevOps

- `docker-compose.yml` starts Postgres, Redis, backend, and frontend.
- `backend/src/db/migrations/001_execution_core.sql` creates execution tables and pgvector memory.
- `k8s/` contains backend and worker deployment manifests.
- `.github/workflows/ci.yml` builds frontend and verifies backend imports.

## Product Mode Additions

- Real JWT signup/login: `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`
- Persistent conversations: `/api/conversations`
- Real file upload/index/search: `/api/files/upload`, `/api/files/search`
- Provider validation dashboard: `/api/providers/validate`
- Registered default tools: `calculator.evaluate`, `api.request`, `terminal.exec`
- Terminal execution is disabled by default. Set `ENABLE_TERMINAL_TOOL=true` only in trusted sandboxed environments.
- Multi-agent execution: `/api/agents/runs`
- Socket.IO realtime channel: `/socket.io`
- App file export: `/api/projects/:projectId/export`
- Stripe checkout: `/api/billing/stripe/checkout`
- Usage analytics: `/api/analytics/usage`
- Deployment diagnostics: `/api/deployment/diagnostics`

## Production Notes

- Run `npm run migrate --prefix backend` after setting `DATABASE_URL`.
- Queue workers run with `node backend/src/workers/index.js`.
- Media generation latency depends on selected provider and queue load.
- High-risk tools and agent actions should be approval-gated before external deployment, payments, or customer-facing sends.
