# CODRAI Open Source Runtime Report

## Implemented
- Added `OpenSourceRuntimeService` for real local/open-source runtime detection.
- Added `GET /api/open-source/status`.
- Added `GET /api/open-source/gpu`.
- Added `POST /api/open-source/models/pull` for real Ollama model pulls.
- Wired the service into the existing production bootstrap without replacing provider, runtime, Redis, PostgreSQL, or WebSocket architecture.
- Added AI Studio visibility for Ollama, llama.cpp, vLLM, ComfyUI, Automatic1111, Whisper, XTTS, FFmpeg, pgvector, Redis, and local model inventory.
- Added AI Studio local model pull controls that call Ollama only when it is reachable.
- Added optional `docker-compose.local-ai.yml` for self-hosted Ollama and ComfyUI profiles.
- Added lightweight local model support for `tinyllama` and `phi3-mini`.

## Verified State
- Verification time: 2026-05-23 14:50 IST
- Endpoint: `/api/open-source/status`
- Docker engine: reachable
- CODRAI Docker stack: backend, frontend, PostgreSQL, Redis, Ollama, and worker running
- Backend health: `ok`
- Frontend production build: passed
- Endpoint status: `available`
- Active local runtimes: `1`
- Ollama runtime: `available`
- Installed validation models: `tinyllama:latest`, `llama3.1:latest`, `deepseek-coder:latest`, `qwen2.5-coder:latest`
- GPU: `blocked`
- pgvector memory: `pgvector_ready`
- Redis queues: `ready`
- Deterministic runtime agent: completed successfully without paid providers
- Planner/reasoning agent: completed successfully through local Ollama
- Coding agent: completed through local Ollama with `deepseek-coder`
- Heavy coding model: `qwen2.5-coder` installed and directly verified, but CPU inference is slow
- Ollama model pull tests for `tinyllama`, `llama3.1`, `deepseek-coder`, and `qwen2.5-coder`: completed successfully
- Ollama model pull tests for `mistral` and `codellama`: blocked by upstream TLS handshake timeouts

## Runtime State
- Ollama: available
- llama.cpp: blocked until a reachable OpenAI-compatible endpoint is configured
- vLLM: blocked until a reachable OpenAI-compatible endpoint is configured
- ComfyUI: blocked until service is started
- Automatic1111: blocked until service is started
- Whisper: blocked until service is started
- XTTS: blocked until service is started
- FFmpeg: blocked inside backend container until installed in image or mounted as an execution container

## Runtime Manager State
- Runtime manager: wired
- Health monitor: wired
- Queue supervisor: ready
- Model manager: `ollama_ready`
- Failover policy: local-first when available
- Watchdog: diagnostic-only in this pass

## Ollama Activation
Validated commands:

```powershell
docker pull ollama/ollama:latest
docker compose -f docker-compose.yml -f docker-compose.local-ai.yml --profile local-ai up -d ollama
docker exec codrai-ollama-1 ollama pull tinyllama
```

Direct inference through `http://localhost:11434/api/generate` completed. CODRAI provider diagnostics now mark Ollama healthy and record successful usage metrics.

## Phase 2 Model Scale-Up

Installed and verified:

- `llama3.1`: reasoning model, verified direct inference
- `deepseek-coder`: operational coding/fast model, verified direct inference and CODRAI agent execution
- `qwen2.5-coder`: heavy coding model, verified direct inference, CPU latency high

Blocked:

- `mistral`: upstream Ollama model download TLS handshake timeout
- `codellama`: upstream Ollama model download TLS handshake timeout

CODRAI model roles:

- `OLLAMA_MODEL=tinyllama`
- `CODRAI_REASONING_MODEL=llama3.1`
- `CODRAI_CODING_MODEL=deepseek-coder`
- `CODRAI_HEAVY_CODING_MODEL=qwen2.5-coder`
- `CODRAI_FAST_MODEL=deepseek-coder`
