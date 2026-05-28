# CODRAI Infrastructure Topology Report

```mermaid
flowchart TD
  Frontend["Frontend / Cloud OS"] --> API["Express API Gateway"]
  Frontend --> WS["WebSocket Gateway"]
  API --> Auth["JWT Auth + RBAC Foundation"]
  API --> ProviderRouter["Provider Registry + Model Router"]
  API --> Agents["Autonomous Agent Runtime"]
  API --> Workflows["Workflow Engine"]
  API --> Memory["Enterprise Memory / pgvector"]
  API --> Observability["Diagnostics + Telemetry"]
  API --> Recovery["Runtime Recovery Service"]
  API --> Deployment["Deployment Readiness"]
  API --> RuntimeOps["Worker + Queue + Container APIs"]
  ProviderRouter --> Providers["OpenAI / Claude / Gemini / DeepSeek / xAI / Ollama"]
  Agents --> Postgres["PostgreSQL"]
  Workflows --> Postgres
  Memory --> Postgres
  Observability --> Postgres
  RuntimeOps --> Redis["Redis"]
  Recovery --> Redis
  WS --> EventBus["Realtime Event Bus"]
  EventBus --> Postgres
```

## Live Runtime Ports

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- WebSocket: `ws://localhost:5000/ws`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## Honest Degradation Rules

The backend reports blocked/degraded states when a dependency is unavailable. It does not fabricate provider readiness, container access, worker registration, or model execution health.

