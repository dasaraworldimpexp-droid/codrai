# CODRAI Runtime Observability Report

## Observable Domains

- Provider health and benchmark scores
- Token and cost analytics
- Agent run state
- Workflow run state
- Redis queue state
- Worker state
- WebSocket subscriptions
- Realtime events
- PostgreSQL persistence
- Recovery events
- Audit logs

## Dashboard Integration

The dashboard now shows:

- Enterprise OS aggregate status
- Autonomous Multi-agent OS status
- provider count
- memory readiness
- self-healing state
- queue and worker telemetry
- container status with honest blocked reporting

## Export Targets

Production deployments should forward logs and traces to:

- OpenTelemetry
- Prometheus/Grafana
- Loki or cloud logging
- Sentry or equivalent error aggregation
- SIEM for audit events

