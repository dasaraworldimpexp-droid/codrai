# CODRAI Scaling Strategy Report

## Immediate Scaling

- Run frontend, backend, worker, Redis, and PostgreSQL as separate deployable units.
- Scale backend horizontally behind a load balancer.
- Scale workers independently based on Redis queue depth.
- Keep WebSocket connections on a gateway layer with sticky sessions or a shared pub/sub adapter.

## Database

- Use managed PostgreSQL with automated backups.
- Enable pgvector indexes for large memory stores.
- Add read replicas for analytics dashboards.
- Use connection pooling for high concurrency.

## Queue Runtime

- Use managed Redis or Redis Cluster.
- Separate high-priority AI execution queues from telemetry and analytics queues.
- Configure dead-letter queues for long-running agent tasks.

## Provider Routing

- Keep provider routing latency-aware and cost-aware.
- Persist provider benchmark results.
- Apply per-provider concurrency limits.
- Route local/Ollama tasks only when the local daemon is reachable.

## Cloud

- Kubernetes-ready deployment should run separate deployments for API, worker, websocket, and frontend.
- Use HPA policies keyed to CPU, queue depth, WebSocket connection count, and provider latency.

