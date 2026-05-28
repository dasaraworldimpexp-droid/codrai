# CODRAI Developer Setup Guide

## Local Base URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Public API: `http://localhost:5000/api/v1`

## Create an API Key

1. Sign in to CODRAI.
2. Open `/developer/api-keys`.
3. Choose scopes and create a key.
4. Store the returned `sk_codrai_...` secret immediately.

## Call the API

```bash
curl http://localhost:5000/api/v1/models \
  -H "Authorization: Bearer sk_codrai_..."
```

```bash
curl http://localhost:5000/api/v1/chat/completions \
  -H "Authorization: Bearer sk_codrai_..." \
  -H "Content-Type: application/json" \
  -d '{"model":"codrai-balanced","messages":[{"role":"user","content":"Hello CODRAI"}]}'
```

Real upstream AI execution requires at least one configured provider key in CODRAI Provider Settings.
