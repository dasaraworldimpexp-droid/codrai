# CODRAI Final API Security Report

Generated: 2026-05-20

## Implemented

- Secret key hashing before database storage.
- One-time secret visibility.
- Masked secret display only after creation.
- Scope enforcement per public endpoint.
- Workspace isolation through API key binding.
- API key revocation.
- API key expiration-ready schema.
- Optional HMAC request signing.
- Replay-window protection for signed requests.
- Public API rate limiting.
- Quota enforcement foundation.
- Audit logs for create/rotate/revoke lifecycle actions.

## HMAC Signing

Headers:

- `x-codrai-timestamp`
- `x-codrai-signature`

Signature:

```text
hex(hmac_sha256(secretKey, timestamp + "." + rawRequestBody))
```

If signing headers are present, validation is enforced. Unsigned bearer requests remain supported for server-to-server and local development usage.

## Verified

- Bearer `sk_codrai_...` authentication: passed.
- Signed request validation: passed.
- Revoked key rejection: passed with `401`.
- Scope-protected endpoints: active.
- Quota headers emitted from public API responses.

## Recommended Production Additions

- Enforce signed requests for enterprise tenants.
- Add external WAF/IP reputation provider.
- Add per-key custom rate limits.
- Add webhook delivery signing and retry queues.
