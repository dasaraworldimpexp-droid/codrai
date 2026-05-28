# CODRAI API Documentation

## Core Health

- `GET /api/health`
- `GET /api/runtime/diagnostics?workspaceId=...`
- `GET /api/runtime/workers?workspaceId=...`
- `GET /api/runtime/queues?workspaceId=...`
- `GET /api/runtime/containers?workspaceId=...`

## Authentication

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Providers

- `GET /api/providers`
- `POST /api/providers/validate`
- `GET /api/providers/settings`
- `PUT /api/providers/settings/:providerName`
- `DELETE /api/providers/settings/:providerName`

## Enterprise AI OS

- `GET /api/enterprise/cloud/overview`
- `GET /api/enterprise/cloud/control-center`
- `GET /api/enterprise/cloud/operating-system`
- `GET /api/enterprise/cloud/autonomous-os`
- `GET /api/enterprise/cloud/ai-orchestration`
- `GET /api/enterprise/cloud/agents`
- `GET /api/enterprise/cloud/observability`
- `GET /api/enterprise/cloud/security-hardening`
- `POST /api/enterprise/cloud/provider-benchmarks/run`
- `POST /api/enterprise/cloud/router/recommend`

## AI Runtime

- `POST /api/runtime/execute`
- `POST /api/runtime/stream`
- `POST /api/v1/chat/completions`
- `POST /api/v1/chat/stream`

## Agents And Workflows

- `POST /api/agents/runs`
- `GET /api/agents/runs`
- `POST /api/workflows`
- `GET /api/workflows`
- `POST /api/workflows/runs`
- `GET /api/workflows/runs/:runId`

## AI Studio

- `GET /api/ai-studio/readiness`
- `GET /api/ai-studio/templates`
- `GET /api/ai-studio/media/jobs`
- `POST /api/ai-studio/media/jobs`
- `GET /api/ai-studio/media/jobs/:jobId`

## Memory And Files

- `GET /api/memory/search`
- `POST /api/files/upload`
- `GET /api/files/search`

## WebSocket

- Endpoint: `ws://localhost:5000/ws`
- Subscribe message:

```json
{ "type": "subscribe", "channel": "workspace:dashboard" }
```

