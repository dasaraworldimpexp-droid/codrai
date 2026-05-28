# CODRAI API Auth Guide

CODRAI public APIs use workspace-bound secret keys.

## Secret Keys

Use the secret key as a bearer token:

```http
Authorization: Bearer sk_codrai_...
```

Secret keys are hashed before storage and are only shown once.

## Scopes

- `chat:read`
- `chat:write`
- `models:read`
- `stream:write`
- `admin:read`
- `analytics:read`

## Optional Request Signing

For replay-resistant calls, send:

```http
x-codrai-timestamp: 1779250000000
x-codrai-signature: hex_hmac_sha256
```

Signature payload:

```text
timestamp.rawRequestBody
```

HMAC secret:

```text
sk_codrai_...
```

Unsigned bearer requests are accepted for local development and ordinary server-to-server use. Signed requests are validated when signature headers are present.
