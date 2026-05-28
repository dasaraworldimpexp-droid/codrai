# CODRAI Enterprise Architecture Report

CODRAI now exposes two enterprise aggregation surfaces:

- `GET /api/enterprise/cloud/operating-system`
- `GET /api/enterprise/cloud/autonomous-os`

Both routes are JWT-protected and aggregate existing production services rather than duplicating runtime layers.

## Core Architecture

- Frontend: React/Vite dashboard, AI Studio, Cloud OS, Global Control Center.
- API: Express gateway with JWT middleware, rate limits, provider routes, developer gateway, enterprise routes, runtime routes.
- Persistence: PostgreSQL with pgvector-ready memory tables, conversations, agent runs, workflow runs, model usage, audit logs, marketplace, billing, deployment, and telemetry tables.
- Queue/cache: Redis-backed queue and runtime cache.
- Realtime: WebSocket `/ws`, event bus, persisted realtime event history.
- AI runtime: provider registry, model router, provider runtime, streaming engine, token usage service, conversation persistence.
- Autonomous runtime: orchestrator, real agent execution service, workflow engine, distributed execution, recovery supervisor.

## New Enterprise Aggregation

The autonomous OS endpoint reports:

- provider intelligence and fallback chains
- agent templates, run state, execution history, and event bus wiring
- workflow definitions and workflow run statuses
- pgvector extension readiness and memory indexing state
- queue, worker, deployment, and recovery status
- model usage and realtime events
- security controls and audit readiness

## Compatibility

No existing routes, migrations, Docker services, auth/session flows, provider settings, Redis queues, or WebSocket subscriptions were replaced.

