# CODRAI Security Runtime Report

## Verified Security Paths
- Signup API succeeded.
- Authenticated `/api/auth/me` request succeeded.
- JWT bearer token was accepted by protected runtime/provider endpoints.
- Provider settings did not expose secret key material.
- Provider validation reported missing keys without leaking sensitive data.

## Provider Key Handling
Provider execution remains gated by configured credentials. The runtime reports missing/unavailable providers instead of fabricating health.

## Runtime Safety
- AI Studio media jobs are persisted and marked `blocked` when no healthy provider exists.
- No fake media output is generated.
- Runtime diagnostics report actual PostgreSQL, Redis, queue, worker, container, and realtime state.

## Remaining Production Security Requirements
- Configure production JWT secrets and key rotation policy.
- Run behind HTTPS/TLS.
- Configure production CORS origins.
- Configure cloud secret manager or encrypted environment delivery.
- Add WAF/CDN rules for public exposure.
- Configure production backup and audit retention policies.

## Open-Source Runtime Security Notes
- Local AI services are detected through explicit HTTP probes and reported as blocked when unreachable.
- CODRAI does not assume local services are safe merely because a port is configured.
- Expose Ollama, llama.cpp, vLLM, ComfyUI, Automatic1111, Whisper, and XTTS only on trusted networks unless protected by reverse proxy authentication.
- For production, isolate media generation containers from the backend with resource limits, volume boundaries, and explicit network policy.
- FFmpeg is reported as unavailable unless it exists inside the backend runtime PATH; no shell fallback is used by the open-source runtime detector.
