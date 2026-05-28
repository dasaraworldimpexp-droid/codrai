# CODRAI Self-Hosted Open-Source Deployment

## Baseline Stack
Run the verified CODRAI foundation:

```powershell
docker compose up -d --build
```

This starts PostgreSQL with pgvector, Redis, backend, worker, migrations, and frontend.

## Optional Ollama Runtime
CODRAI can use Ollama without paid API keys. Start Ollama either on the host or through the optional profile:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local-ai.yml --profile local-ai up -d ollama
```

Pull at least one model:

```powershell
docker exec -it codrai-ollama-1 ollama pull llama3.1
docker exec -it codrai-ollama-1 ollama pull qwen2.5
docker exec -it codrai-ollama-1 ollama pull nomic-embed-text
```

Set the backend environment when Ollama runs on Docker Desktop:

```env
OLLAMA_BASE_URL=http://host.docker.internal:11434/v1
OLLAMA_BASE_URLS=http://host.docker.internal:11434,http://ollama:11434
OLLAMA_MODEL=llama3.1
```

## Optional Local Media Runtime
ComfyUI can be started with:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local-ai.yml --profile local-media up -d comfyui
```

Then set:

```env
COMFYUI_BASE_URL=http://host.docker.internal:8188
```

## Runtime Detection
CODRAI reports actual local runtime state through:

- `GET /api/open-source/status`
- AI Studio Open-source AI Core panel

Unavailable services are shown as blocked with setup instructions. CODRAI does not fake local model readiness.
