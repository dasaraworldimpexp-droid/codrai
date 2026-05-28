# CODRAI AI Runtime Report

## Provider Intelligence

CODRAI uses the existing provider registry and model router for:

- OpenAI
- Anthropic / Claude
- Gemini
- DeepSeek
- xAI / Grok
- Ollama local models
- OpenRouter, Groq, Mistral, Together where registered

Runtime signals include:

- provider capabilities
- streaming support
- max token metadata
- health score
- latency metrics
- retry/failure/timeout counters
- fallback chain visibility
- model routing scores

## Autonomous Agents

Existing real agent infrastructure includes:

- persistent `agent_runs`
- persistent `agent_run_steps`
- agent templates
- real AI runtime execution
- event bus telemetry
- workflow handoff support

## Workflow OS

Workflow runtime is PostgreSQL-backed through:

- `saved_workflows`
- `workflow_runs`
- node execution state
- queued/background steps
- tool and agent node support

## Memory

Enterprise memory uses PostgreSQL `ai_memories` with pgvector support. Vector search uses embeddings when OpenAI is configured; otherwise memory search falls back to keyword retrieval and reports that state honestly.

