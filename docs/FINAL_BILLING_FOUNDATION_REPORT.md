# CODRAI Final Billing Foundation Report

Generated: 2026-05-20

## Implemented

- `developer_api_usage_events` table for public API usage.
- Request metering.
- Token metering.
- Provider/model attribution fields.
- Latency tracking.
- Error categorization fields.
- Cost estimate field.
- Workspace quota state table.
- Monthly request limit.
- Monthly token limit.
- Hard limit switch.
- Credit balance field.
- API quota response headers.

## Public Usage API

- `GET /api/v1/usage`
- `GET /api/developer/usage`
- `GET /api/developer/logs`

## Verified

- Public API usage event persisted after chat completion failure.
- Public API usage event persisted after stream failure.
- Usage dashboard endpoint returned monthly usage.
- Quota headers emitted:
  - `X-CODRAI-RateLimit-Requests-Limit`
  - `X-CODRAI-RateLimit-Requests-Remaining`
  - `X-CODRAI-RateLimit-Tokens-Limit`
  - `X-CODRAI-RateLimit-Tokens-Remaining`

## Production Billing Next Steps

- Attach Stripe customer/subscription IDs to workspaces.
- Add paid tier defaults for `developer_api_quota_state`.
- Add invoice generation for public API usage.
- Add provider-specific cost tables.
- Add alert delivery when soft limits are approached.
