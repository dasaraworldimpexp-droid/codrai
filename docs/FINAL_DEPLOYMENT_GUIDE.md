# CODRAI Enterprise Cloud Deployment Guide

## Local Production Runtime

```powershell
docker compose up -d --build
docker compose ps
```

## Required Managed Services

- PostgreSQL 17 with pgvector
- Redis 7
- Object storage for uploads and generated artifacts
- TLS ingress
- CDN/WAF
- Secret manager

## Kubernetes

Use `deploy/kubernetes/codrai.yaml` as the baseline workload manifest. Store all secrets in `codrai-secrets`.

## ECS/Fargate

Use `deploy/ecs-fargate/task-definition.json` as the task baseline and attach RDS PostgreSQL, ElastiCache Redis, CloudWatch logs, and Secrets Manager.

## Edge / CDN

Use `deploy/nginx/codrai-edge.conf` behind Cloudflare, Fastly, AWS CloudFront, or Azure Front Door. Enable WebSocket pass-through for `/ws`.

## Scaling

- Scale backend by HTTP latency and CPU.
- Scale workers by Redis queue depth.
- Scale PostgreSQL vertically first, then use read replicas for analytics.
- Partition usage events by month at high volume.
