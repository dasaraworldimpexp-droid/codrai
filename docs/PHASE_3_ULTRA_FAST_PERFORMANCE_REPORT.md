# CODRAI Phase 3 Ultra-Fast Performance Mode Report

## Objective
Optimize CODRAI for maximum safe speed on limited local hardware without pulling large models, corrupting persistent data, or destabilizing the verified Docker/PostgreSQL/Redis/WebSocket/Ollama stack.

## Current Machine Findings
- Free disk on `C:\`: 24.35 GB after rebuild and validation.
- Docker Desktop: reachable after startup.
- Docker engine: 29.4.3.
- Docker Desktop: 4.74.0.
- Docker cleanup: not performed because active images and volumes are in use by the verified runtime.
- RAM/CPU CIM probes: blocked by Windows permission restrictions.

## Docker Footprint
- Images: 12.93 GB.
- Local volumes: 11.12 GB.
- Build cache: 1.451 GB, with 877.9 MB reclaimable.
- Containers: 2.228 MB, with 2.032 MB reclaimable.

Build cache pruning is optional and safe only when no builds are running. It was not performed in this pass to preserve the verified runtime.

## Idle Container Resources After Optimization
- frontend: 4.406 MiB, 0.00% CPU.
- backend: 233.2 MiB, 0.05% CPU.
- worker: 88.58 MiB, 0.00% CPU.
- ollama: 19.74 MiB before model load, 0.00% CPU.
- redis: 9.16 MiB, 0.70% CPU.
- postgres: 54.46 MiB, 0.00% CPU.

## Model Strategy
Preserved installed lightweight/high-performance local models:

- `tinyllama`
- `llama3.1`
- `deepseek-coder`
- `qwen2.5-coder`

No new model pulls were attempted. `mistral` and `codellama` remain optional and should be retried only after Docker is reachable and disk/network conditions are stable.

## Performance Changes
### Ollama Low-Resource Runtime
Updated `docker-compose.local-ai.yml`:

- `OLLAMA_KEEP_ALIVE=5m` for CPU mode instead of 24h.
- `OLLAMA_MAX_LOADED_MODELS=1`.
- `OLLAMA_NUM_PARALLEL=1`.
- GPU profile uses `OLLAMA_KEEP_ALIVE=10m`, `OLLAMA_MAX_LOADED_MODELS=1`, and `OLLAMA_NUM_PARALLEL=1`.

This reduces RAM pressure and avoids multiple large models staying resident on low-resource machines.

### Local Model Execution Limits
Updated Docker environment:

- `OLLAMA_NUM_CTX=2048`
- `OLLAMA_NUM_PREDICT=384`

Updated the OpenAI-compatible Ollama provider to pass these options for local Ollama calls. This reduces CPU time, RAM pressure, and long-running response stalls.

### Worker Throughput Safety
Updated worker environment:

- `WORKER_CONCURRENCY=1`
- `PROVIDER_MAX_ATTEMPTS=2`
- `PROVIDER_RETRY_BASE_DELAY_MS=750`

This prevents CPU oversubscription when local inference jobs are queued.

### Backend Retry Safety
Backend provider retry settings are now environment-driven:

- `PROVIDER_MAX_ATTEMPTS=2`
- `PROVIDER_RETRY_BASE_DELAY_MS=500`

This reduces wasted retry time during blocked providers or slow local inference.

### Frontend Delivery
Updated Nginx static serving:

- Enabled gzip.
- Added immutable one-year caching for hashed `/assets/`.
- Added no-store caching for SPA HTML and health responses.

This improves repeat load speed without changing frontend runtime behavior.

## Verification
- Backend JavaScript syntax check: passed.
- Frontend production build: passed.
- Frontend build time: 15.56s.
- Docker runtime verification: passed after Docker Desktop became reachable.
- Docker stack: backend, frontend, Ollama, PostgreSQL, Redis, and worker running.
- Backend health: passed.
- Frontend HTTP: 200.
- WebSocket: opened successfully.
- Ollama speed-mode env: verified inside `codrai-ollama-1`.
- Worker low-resource env: verified inside `codrai-worker-1`.
- Direct `deepseek-coder` CPU inference with reduced context/output: completed in 4.35s wall time for an 8-token response.

## Operational Policy
The fastest stable CPU mode is now the default:

- Use `tinyllama` for lightweight fallback.
- Use `deepseek-coder` for fast coding-agent tasks.
- Use `llama3.1` for higher-quality reasoning when latency is acceptable.
- Use `qwen2.5-coder` only for heavier coding tasks because CPU latency is high.
- Keep one Ollama model loaded at a time on this hardware.
- Avoid new model downloads until free disk is comfortably above 30 GB or external storage is added.

## Remaining Blockers
- Docker Desktop must be running before container health, Docker disk, and live runtime stats can be measured again.
- GPU passthrough remains unverified.
- RAM/CPU telemetry needs elevated Windows permissions or an in-container metrics path once Docker is reachable.
