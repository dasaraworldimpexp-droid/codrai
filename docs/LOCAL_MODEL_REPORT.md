# CODRAI Local Model Report

## Supported Local Model Targets
The open-source runtime panel tracks these model families:

- TinyLlama
- Phi / Phi 3 Mini
- Llama 3 / Llama 3.1
- DeepSeek / DeepSeek-R1
- Mistral
- Qwen
- Gemma
- CodeLlama
- Local embedding models such as `nomic-embed-text` and `mxbai-embed-large`

## Verified Local Inventory
Local Ollama inventory now includes:

- `tinyllama:latest`
- `llama3.1:latest`
- `deepseek-coder:latest`
- `qwen2.5-coder:latest`

Verification details:

- Docker image `ollama/ollama:latest`: present
- Ollama API: `http://localhost:11434/api/tags` reachable
- CODRAI `/api/open-source/status`: `available`
- Active local runtimes: `1`
- Direct Ollama inference: completed for `tinyllama`, `llama3.1`, `deepseek-coder`, and `qwen2.5-coder`
- CODRAI agent runtime: completed through Ollama
- CODRAI model role routing: reasoning=`llama3.1`, coding=`deepseek-coder`, heavy coding=`qwen2.5-coder`, fast=`deepseek-coder`

## Model Manager
CODRAI exposes a real Ollama model pull endpoint:

- `POST /api/open-source/models/pull`

Verification result:

- Pull request for `tinyllama`: completed
- Pull request for `llama3.1`: completed
- Pull request for `deepseek-coder`: completed
- Pull request for `qwen2.5-coder`: completed
- Pull request for `mistral`: blocked by upstream Ollama TLS handshake timeout
- Pull request for `codellama`: blocked by upstream Ollama TLS handshake timeout
- Direct model execution: completed
- CODRAI provider route: `ollama`
- CODRAI default local model: `tinyllama`

Detected inventory:

- `tinyllama`: installed
- `phi3-mini`: missing
- `llama3.1`: installed
- `deepseek-coder`: installed
- `deepseek-r1`: missing
- `mistral`: missing
- `qwen2.5-coder`: installed
- `qwen2.5`: missing
- `phi3`: missing
- `gemma2`: missing
- `codellama`: missing
- `nomic-embed-text`: missing
- `mxbai-embed-large`: missing

## Recommended Minimum Local Stack
```powershell
docker compose -f docker-compose.yml -f docker-compose.local-ai.yml --profile local-ai up -d ollama
docker exec -it codrai-ollama-1 ollama pull tinyllama
docker exec -it codrai-ollama-1 ollama pull nomic-embed-text
```

After `tinyllama` proves inference, continue with larger reasoning/coding models:

```powershell
docker exec -it codrai-ollama-1 ollama pull llama3.1
docker exec -it codrai-ollama-1 ollama pull deepseek-coder
docker exec -it codrai-ollama-1 ollama pull qwen2.5-coder
docker exec -it codrai-ollama-1 ollama pull mistral
docker exec -it codrai-ollama-1 ollama pull codellama
```

Current Phase 2 result: `llama3.1`, `deepseek-coder`, and `qwen2.5-coder` are installed and verified. Retry `mistral` and `codellama` when the upstream Ollama model download endpoint is stable.

## GPU Notes
Larger models and media generation require a CUDA-capable NVIDIA GPU with enough VRAM. CPU mode is validated for `tinyllama`, `deepseek-coder`, `llama3.1`, and `qwen2.5-coder`, but `llama3.1` and `qwen2.5-coder` are slow without GPU acceleration.
