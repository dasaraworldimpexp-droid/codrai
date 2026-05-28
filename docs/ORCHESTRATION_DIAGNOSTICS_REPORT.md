# CODRAI Orchestration Diagnostics Report

## Diagnostics Endpoints

- `GET /api/runtime/diagnostics?workspaceId=...`
- `GET /api/runtime/workers?workspaceId=...`
- `GET /api/runtime/queues?workspaceId=...`
- `GET /api/runtime/containers?workspaceId=...`
- `GET /api/enterprise/cloud/operating-system?workspaceId=...`
- `GET /api/enterprise/cloud/autonomous-os?workspaceId=...`

## Real Runtime Signals

- PostgreSQL connectivity and latency
- Redis connectivity and queue state
- worker registration state
- container runtime state
- provider health and scores
- WebSocket and event bus snapshots
- model usage and realtime events
- workflow and agent execution history
- recovery and failover plan state

## Expected Degraded States

- Missing provider keys report as provider `missing`.
- Unreachable Ollama reports as provider error.
- Docker lifecycle control reports blocked if Docker CLI is unavailable inside the backend container.
- Worker nodes can be `0` while queue infrastructure remains ready.

