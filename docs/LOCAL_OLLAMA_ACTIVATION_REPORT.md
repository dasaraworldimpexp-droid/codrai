# CODRAI Local Ollama Activation Report

## Scope
This report documents the real local AI activation pass for Ollama and lightweight model validation. It does not claim model readiness unless CODRAI can reach a live runtime and execute real model operations.

## Core Stack Status
- Verification time: 2026-05-23 12:27 IST
- Docker Desktop engine: reachable
- Backend: healthy on `http://localhost:5000/api/health`
- Frontend: reachable on `http://localhost:5173`
- PostgreSQL: healthy in Docker Compose
- Redis: healthy in Docker Compose
- Worker: running
- Ollama: running on `http://localhost:11434`
- Frontend production build: passed

## Ollama Activation
Executed:

```powershell
docker pull ollama/ollama:latest
docker compose -f docker-compose.yml -f docker-compose.local-ai.yml --profile local-ai up -d ollama
docker exec codrai-ollama-1 ollama pull tinyllama
```

Result:

- `ollama/ollama:latest` pulled successfully.
- `codrai-ollama-1` started successfully.
- `tinyllama:latest` pulled successfully.
- `http://localhost:11434/api/tags` returns `tinyllama:latest`.
- Direct Ollama inference through `/api/generate` completed successfully.

## CODRAI Runtime Truth
- `/api/open-source/status`: `available`
- Active local runtimes: `1`
- Ollama: `available`
- Ollama model count: `1`
- TinyLlama catalog state: `installed`
- GPU: `blocked`
- pgvector memory: `pgvector_ready`
- Redis queues: `ready`
- Provider diagnostics: Ollama healthy
- Ollama provider metrics: 2 requests, 2 successes, 0 failures during validation

## Agent Verification
- Runtime diagnostic agent: completed successfully.
- Planner/reasoning agent: completed successfully through local Ollama using `tinyllama`.
- Agent plan persistence: completed.
- Follow-up automation jobs: queued through Redis with route `providerName: ollama`.

## Schema Repair
Added migration `010_model_usage_project_id.sql` because model usage telemetry expected `model_usage_events.project_id`. The migration is idempotent and adds:

- `model_usage_events.project_id`
- `model_usage_project_idx`

## Current Blocker
GPU acceleration is not active. Ollama logs show CPU inference because no NVIDIA GPU is exposed to the Ollama container.

## Next Activation Steps
Pull larger models only after confirming disk and VRAM capacity:

```powershell
docker exec codrai-ollama-1 ollama pull llama3.1
docker exec codrai-ollama-1 ollama pull deepseek-coder
docker exec codrai-ollama-1 ollama pull qwen2.5-coder
docker exec codrai-ollama-1 ollama pull mistral
docker exec codrai-ollama-1 ollama pull codellama
```

For GPU acceleration, enable NVIDIA GPU passthrough and start the GPU profile:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local-ai.yml --profile gpu up -d ollama-gpu
```
