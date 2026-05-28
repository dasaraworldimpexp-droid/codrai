# CODRAI Final Scaling Report

Generated: 2026-05-20

## Backend

The backend is stateless except for PostgreSQL, Redis, and provider secrets. It is ready for horizontal scaling behind a load balancer.

## Workers

Worker processes are Redis-backed and can scale horizontally by queue depth.

## Database

PostgreSQL stores auth, provider settings, developer API keys, usage, workspaces, billing, events, and runtime state. Use managed PostgreSQL with pgvector and automated backups.

## Redis

Redis is used for queues and runtime coordination. Use managed Redis with persistence and clustering for enterprise deployments.

## WebSockets

For multiple backend instances, use Redis pub/sub or a websocket-aware gateway so event fanout crosses pods/instances.

## CDN/WAF

Use Cloudflare, Fastly, or CloudFront in front of frontend and public APIs. Enable WAF bot/rate-limit policies on `/api/v1/*`.
