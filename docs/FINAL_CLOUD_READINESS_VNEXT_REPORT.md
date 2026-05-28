# CODRAI Cloud Readiness vNext Report

Generated: 2026-05-20

## Implemented

- Object storage configuration table
- OAuth/SSO provider configuration table
- Edge cache policy table
- Deployment pipeline run table
- Cloud runtime readiness panel

## Edge Cache Policies

- `/api/v1/models`
- `/api/v1/providers`
- `/assets/*`

## Readiness Areas

- Kubernetes manifests
- Docker scaling
- Redis queue scaling
- CDN/WAF readiness
- Object storage configurability
- Centralized tracing

## Remaining Cloud Activation

- Attach real S3/GCS/Azure Blob credentials through a secret manager.
- Configure SSO/OAuth client secrets.
- Put frontend/API behind CDN/WAF.
- Run PostgreSQL/Redis as managed replicated services.

