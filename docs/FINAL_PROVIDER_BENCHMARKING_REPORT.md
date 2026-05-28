# CODRAI Provider Benchmarking Report

Generated: 2026-05-20

## Benchmark System

The provider benchmarking system uses the existing provider registry and real provider `healthCheck` methods. It persists every benchmark attempt into PostgreSQL.

## Recorded Fields

- provider
- model
- benchmark type
- score
- latency
- cost estimate
- status
- error message
- verification method
- metadata

## Live Verification

Executed benchmark run:

- Total providers: 13
- Completed providers: 0
- Blocked providers: 13

Reason: upstream provider credentials are not configured in the local Docker environment.

## Production Activation

Configure provider keys in the existing Provider Settings UI or environment variables:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `XAI_API_KEY`
- `DEEPSEEK_API_KEY`
- `MISTRAL_API_KEY`
- `OPENROUTER_API_KEY`
- `GROQ_API_KEY`
- `TOGETHER_API_KEY`
- `FAL_API_KEY`
- `STABILITY_API_KEY`
- `ELEVENLABS_API_KEY`

After configuring keys, run:

`POST /api/enterprise/cloud/provider-benchmarks/run`

