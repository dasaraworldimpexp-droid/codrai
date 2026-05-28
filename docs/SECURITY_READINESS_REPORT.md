# CODRAI Security Readiness Report

## Active Controls

- JWT-protected enterprise routes.
- Provider settings route protection.
- Encrypted provider key storage via existing provider settings service.
- Developer API key hashing and scoped access.
- Audit log surfaces.
- Gateway policy controls.
- Rate limiting on sensitive provider and settings routes.
- HMAC-ready public API gateway architecture.

## Governance Surfaces

- `GET /api/enterprise/cloud/security-hardening`
- `GET /api/enterprise/cloud/operating-system`
- `GET /api/enterprise/cloud/autonomous-os`
- `GET /api/runtime/diagnostics`

## Remaining Production Hardening

- Configure production-grade JWT secrets and provider encryption secrets.
- Connect SSO/OAuth providers for enterprise tenants.
- Put the public API behind WAF/CDN protection.
- Export audit logs to external SIEM for regulated deployments.
- Apply least-privilege database credentials per service in cloud deployment.

