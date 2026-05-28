# CODRAI Enterprise AI OS Architecture

```mermaid
flowchart LR
  User["User / Enterprise Workspace"] --> Frontend["React + Vite Cloud OS Dashboard"]
  Frontend --> Auth["JWT Auth + Session Store"]
  Frontend --> API["Express API Gateway"]
  Frontend --> WS["WebSocket / Realtime Event Bus"]

  API --> Providers["Provider Registry + Model Router"]
  Providers --> OpenAI["OpenAI"]
  Providers --> Claude["Anthropic / Claude"]
  Providers --> Gemini["Gemini"]
  Providers --> DeepSeek["DeepSeek"]
  Providers --> Grok["Grok / xAI"]
  Providers --> Ollama["Local Ollama"]

  API --> Agents["Autonomous Agent Runtime"]
  API --> Workflows["Workflow Engine + Visual Builder"]
  API --> Runtime["Runtime Diagnostics + Recovery"]
  API --> Enterprise["Enterprise Cloud Services"]
  API --> Billing["Billing + Usage Metering"]
  API --> Marketplace["Marketplace + Developer Platform"]

  Agents --> Postgres["PostgreSQL Persistence"]
  Workflows --> Postgres
  Enterprise --> Postgres
  Billing --> Postgres
  Marketplace --> Postgres

  Runtime --> Redis["Redis Queues + Cache"]
  Agents --> Redis
  Workflows --> Redis

  WS --> Frontend
  Runtime --> WS
  Providers --> WS
  Agents --> WS
  Workflows --> WS

  Runtime --> Docker["Docker / Container Runtime"]
  Runtime --> Deploy["Deployment Readiness + Cloud Targets"]
```

## Enterprise Operating System Endpoint

`GET /api/enterprise/cloud/operating-system` aggregates:

- Provider orchestration
- Agent platform
- Workflow/global AI OS services
- Observability
- Security hardening
- Deployment readiness
- Control center telemetry
- Workers
- Queues
- Containers
- Runtime recovery
- Realtime event bus and WebSocket metrics

The endpoint is JWT-protected and returns real degraded/blocked states when infrastructure is unavailable.

