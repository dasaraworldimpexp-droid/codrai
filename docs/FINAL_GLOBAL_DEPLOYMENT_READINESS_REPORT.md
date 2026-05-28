# CODRAI Global Deployment Readiness Report

Generated: 2026-05-20

## Deployment Targets

CODRAI now persists cloud deployment targets:

- Kubernetes
- AWS ECS/Fargate
- Vercel Edge
- Railway Runtime
- Render Runtime

Existing deployment artifacts remain active:

- `deploy/kubernetes/codrai.yaml`
- `deploy/ecs-fargate/task-definition.json`
- `deploy/nginx/codrai-edge.conf`

## New API

- `GET /api/enterprise/cloud/deployment-readiness`

The endpoint returns deployment targets, recent deployment plans, deployment health summaries, and the cloud stack readiness list.

## Verification

Live endpoint returned 5 deployment targets from PostgreSQL.

## Cloud Activation Requirements

- Managed PostgreSQL with pgvector
- Managed Redis or Redis Cluster
- TLS ingress
- WAF/CDN
- Object storage for large files
- Provider API key vault
- Stripe webhook endpoint
- CI/CD secrets configured per cloud provider

