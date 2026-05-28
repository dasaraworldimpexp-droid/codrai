# CODRAI Final Runtime Health Report

Generated: 2026-05-20

## Live URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000/api/health`
- Dashboard: `http://localhost:5173/dashboard`
- Provider settings: `http://localhost:5173/settings/providers`
- WebSocket: `ws://localhost:5000/ws`

## Docker Runtime

Verified with `docker compose ps`:

- `codrai-backend-1`: running, healthy, port `5000`
- `codrai-frontend-1`: running, port `5173`
- `codrai-postgres-1`: running, healthy, port `5432`
- `codrai-redis-1`: running, healthy, port `6379`
- `codrai-worker-1`: running

## Verification Results

- Backend health: `200 OK`
- PostgreSQL migrations: passed
- Backend syntax: passed for 279 files
- Frontend production build: passed
- Redis queue endpoint: ready, `PONG`
- WebSocket: open and verified
- Auth signup: passed
- Auth signin: passed
- Refresh token rotation: passed
- Logout: passed
- Provider save/delete: passed
- Provider validation: passed operationally, reports missing/invalid keys truthfully
- SSE stream missing-provider behavior: returns structured `runtime.error`
- Browser render check: dashboard and provider settings rendered on mobile viewport with zero console errors

## Database Validation

Verified tables:

- `users`
- `user_sessions`
- `refresh_tokens`
- `provider_settings`
- `api_keys`
- `audit_logs`
- `password_reset_tokens`
- `email_verification_tokens`
- `conversations`
- `messages`

Migration duplicate check:

- `audit_logs` create block count: `1`

## Redis Validation

Endpoint: `GET /api/runtime/queues?workspaceId=local-workspace`

Status:

- Redis: `ok`
- Queue ping: `PONG`
- Routing mode: `distributed_queue`

## Runtime Notes

- Docker-host diagnostics inside the backend container may report Docker CLI unavailable because the container does not mount the host Docker socket. Host-level Docker Compose control is working.
- Provider validation is intentionally real and fails until a real provider key is configured.
