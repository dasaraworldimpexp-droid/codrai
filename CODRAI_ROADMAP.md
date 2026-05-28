# CODRAI Roadmap

Last updated: 2026-05-28

This roadmap is conservative. A system moves to complete only after real validation evidence exists.

## Guiding Priorities

1. Preserve stable architecture.
2. Keep CPU-first low-resource operation.
3. Convert wired systems into proven end-to-end systems.
4. Automate validation to prevent regressions.
5. Avoid duplicate rebuilds.

## Immediate Roadmap

### 1. Automated Regression Smoke

Goal: Prevent repeated manual validation work.

Tasks:

- Add route smoke for all frontend routes.
- Add auth signup/login/logout smoke.
- Add native WebSocket subscribe smoke.
- Add Docker health smoke.
- Add PostgreSQL and Redis smoke.
- Add Ollama `/api/tags` smoke.

Exit criteria:

- One command reports route/API/auth/runtime health.
- Failures produce actionable diagnostics.

### 2. Provider Activation With Real Keys

Goal: Move paid providers from wired/blocked to verified.

Tasks:

- Configure OpenAI and Gemini first.
- Validate key storage and masking.
- Run real non-streaming completion.
- Run real streaming completion.
- Persist latency/token/cost records.
- Verify fallback to Ollama when provider is unavailable.

Exit criteria:

- Provider health dashboard reports live provider readiness from real calls.
- No provider is marked active without credentials and successful validation.

### 3. Billing Sandbox Validation

Goal: Move billing from architecture-ready to commercial-ready.

Tasks:

- Configure Stripe sandbox secrets and price IDs.
- Register webhook endpoint.
- Run checkout.
- Replay webhook.
- Verify subscription state and invoice records.
- Repeat equivalent Razorpay sandbox flow.

Exit criteria:

- Subscription state changes after webhook.
- Credit/usage metering remains consistent.

### 4. RAG Proof Path

Goal: Prove memory intelligence end-to-end.

Tasks:

- Upload or ingest a small PDF/TXT.
- Chunk and embed content.
- Persist vectors in pgvector or fallback vector table.
- Query semantic retrieval.
- Inject retrieved context into chat.
- Show source attribution and retrieval diagnostics.

Exit criteria:

- Workspace A cannot retrieve Workspace B content.
- RAG answer includes relevant retrieved source.

### 5. Whisper CPU Proof

Goal: Prove CPU-safe transcription.

Tasks:

- Validate `WHISPER_CPP_BIN` or chosen CPU runtime.
- Validate `WHISPER_MODEL_PATH`.
- Use tiny/base model only.
- Submit short audio job.
- Persist transcript and subtitle.
- Report blocked state if binary/model is absent.

Exit criteria:

- Transcript is generated from real audio with no GPU dependency.

## Mid-Term Roadmap

### AI Studio Workflow Execution

Tasks:

- Save/load/version workflow.
- Execute workflow through queue.
- Stream logs through WebSocket.
- Persist execution replay.
- Add failure/retry UX.

### Agent Runtime Verification

Tasks:

- Run planner -> executor -> verifier chain.
- Persist task checkpoints.
- Verify cancellation and retry.
- Connect memory retrieval to agent context.

### Marketplace Install Runtime

Tasks:

- Define extension package manifest.
- Validate package signature/checksum.
- Queue install job.
- Extract into safe workspace.
- Roll back failed install.
- Surface install telemetry.

### Enterprise Team Collaboration

Tasks:

- Team invitations.
- Workspace switching.
- Role-based access test matrix.
- Audit logs per workspace action.

### Observability Upgrade

Tasks:

- Add provider latency charts.
- Add token/cost analytics.
- Add queue wait/run timing.
- Add worker failure timeline.
- Add WebSocket reconnect counters.

## Long-Term Roadmap

### Global Production Deployment

Tasks:

- Deploy to VPS or Kubernetes.
- Configure NGINX reverse proxy.
- Configure TLS.
- Configure backups.
- Run restore drill.
- Configure monitoring and alerting.

### Mobile Runtime

Tasks:

- PWA offline cache.
- Push notification credentials.
- Mobile auth refresh.
- Low-bandwidth API mode.
- Optional native shell.

### Enterprise Security

Tasks:

- Cookie-first auth hardening.
- CSRF protection if cookie-primary.
- SSO/SAML/OIDC.
- Dependency audit in CI.
- Audit export.

### Scale Readiness

Tasks:

- Multi-node worker registration.
- Queue partitioning.
- Object storage deployment.
- CDN asset routing.
- Load testing.

## Permanent Non-Goals For Current Machine

- CUDA installation.
- NVIDIA runtime installation.
- GPU passthrough.
- Heavy GPU-only media stacks.
- Giant model pulls that threaten disk/RAM stability.

These can only be reopened if hardware changes and the CPU-first policy is formally updated.
