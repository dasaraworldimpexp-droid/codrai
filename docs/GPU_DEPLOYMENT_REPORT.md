# CODRAI GPU Deployment Report

## Current Verified State
The current Docker stack is running with CPU-mode local Ollama.

Verified on 2026-05-23 14:50 IST:

- Docker engine: reachable
- CODRAI core services: running
- Ollama CPU service: active
- Ollama GPU service: attempted and blocked
- ComfyUI GPU/media service: not active
- Local validation models: `tinyllama:latest`, `llama3.1:latest`, `deepseek-coder:latest`, `qwen2.5-coder:latest`

## GPU Detection
CODRAI exposes:

- `GET /api/open-source/gpu`

Verified result:

- GPU status: `blocked`
- Reason: `nvidia-smi` is not available in the backend runtime PATH, or no NVIDIA GPU is exposed to the container.
- Host `nvidia-smi`: not available from the current shell.
- Docker runtime inventory: `nvidia` runtime is registered.
- GPU Ollama container start attempt: blocked by `nvidia-container-cli` with `WSL environment detected but no adapters were found`.
- CPU Ollama container remained healthy on `localhost:11434`.

Ollama startup logs also report CPU inference and zero VRAM.

## Optional GPU Services
The `docker-compose.local-ai.yml` file adds optional profiles:

- `local-ai`: Ollama CPU/default service
- `gpu`: Ollama GPU service
- `local-media`: ComfyUI

## Recommended GPU Requirements
- NVIDIA GPU for practical local LLM/media workloads.
- 8 GB VRAM minimum for smaller models.
- 12-24 GB VRAM recommended for larger LLMs and SDXL/Flux workflows.
- NVIDIA Container Toolkit or Docker Desktop GPU passthrough for container acceleration.

## CPU Fallback
CPU-only operation is validated for:

- PostgreSQL/pgvector
- Redis queues
- Dashboard
- Agent orchestration
- TinyLlama local inference
- Llama 3.1 local inference
- DeepSeek Coder local inference
- Qwen 2.5 Coder local inference
- Local agent execution through Ollama, Redis queue, PostgreSQL persistence, and pgvector context injection

## Honest Blocker
GPU runtime was attempted but not activated. Docker has the NVIDIA runtime registered, but the WSL/Docker environment did not expose a GPU adapter to `nvidia-container-cli`. GPU acceleration remains blocked until NVIDIA drivers, WSL GPU passthrough, and Docker Desktop GPU integration expose an adapter to containers.
