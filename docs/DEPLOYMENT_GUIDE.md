# CODRAI Production Deployment Guide

## Local Docker Runtime

```powershell
docker compose up -d --build
docker compose ps
```

## Required Runtime Variables

```env
DATABASE_URL=postgres://codrai:codrai@postgres:5432/codrai
REDIS_URL=redis://redis:6379
JWT_SECRET=replace-with-a-long-random-secret
PROVIDER_KEY_ENCRYPTION_SECRET=replace-with-32-byte-secret
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
XAI_API_KEY=
OLLAMA_BASE_URL=http://host.docker.internal:11434
```

Provider keys should preferably be configured through CODRAI Provider Settings so they are stored through the existing encrypted provider settings system.

## Verification Commands

```powershell
npm run build
docker compose ps
Invoke-RestMethod http://localhost:5000/api/health
```

Authenticated verification for the Enterprise AI OS aggregate:

```powershell
$signup = Invoke-RestMethod -Method Post http://localhost:5000/api/auth/signup -ContentType 'application/json' -Body (@{email="qa@example.com";password="CodraiQA!2026";name="CODRAI QA"} | ConvertTo-Json)
$headers = @{Authorization = "Bearer $($signup.token)"}
Invoke-RestMethod "http://localhost:5000/api/enterprise/cloud/operating-system?workspaceId=$($signup.workspaceId)" -Headers $headers
```

WebSocket verification:

```powershell
node -e "const ws=new WebSocket('ws://localhost:5000/ws'); ws.onopen=()=>ws.send(JSON.stringify({type:'subscribe',channel:'workspace:dashboard'})); ws.onmessage=(event)=>{console.log(event.data); ws.close();}; setTimeout(()=>process.exit(1),5000);"
```

## Production Cloud Recommendations

- Put the API behind a TLS-terminating reverse proxy or managed ingress.
- Use managed PostgreSQL with backups and connection pooling.
- Use managed Redis or Redis Cluster for queue and cache durability.
- Run backend, worker, and frontend as separately scalable services.
- Add WAF/CDN in front of frontend and public API routes.
- Mount secrets through cloud secret manager, not baked image env.
- Export logs and metrics to OpenTelemetry-compatible observability.

