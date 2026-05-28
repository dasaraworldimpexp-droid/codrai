# CODRAI Pending And Partially Completed Systems

Last updated: 2026-05-28

This file tracks unfinished, blocked, or partially verified systems. Do not move an item to completed without runtime proof.

## High Priority

### Paid Provider Live Execution

Status: Blocked by missing credentials.

What exists:

- Provider registry.
- Encrypted key storage.
- Health endpoint.
- Local Ollama provider.
- Model router.
- Failover abstraction.

Missing:

- Real API keys.
- Real completion request per provider.
- Real streaming request per provider.
- Token/cost persistence proof per provider.

Next steps:

1. Configure OpenAI and Gemini keys first.
2. Validate keys through provider endpoint.
3. Run chat completion and streaming completion.
4. Verify fallback to Ollama.

### Stripe And Razorpay Live Billing

Status: Blocked by missing payment credentials.

What exists:

- Plans.
- Usage invoices.
- Credit wallet.
- Stripe checkout/webhook routes.
- Razorpay order/webhook routes.

Missing:

- Stripe secret key and price IDs.
- Razorpay credentials.
- Webhook endpoint registration.
- Checkout/order end-to-end tests.
- Failed payment handling proof.

Next steps:

1. Configure sandbox credentials.
2. Run checkout/order.
3. Replay webhook.
4. Verify subscription and invoice state.

### RAG/Vector Memory Proof

Status: Partial.

What exists:

- Memory routes.
- Knowledge routes.
- pgvector-ready architecture.
- File upload/search architecture.
- Phase reports.

Missing:

- Fresh vector insertion proof.
- Fresh similarity search proof.
- Workspace isolation proof.
- RAG answer with retrieved source context.

Next steps:

1. Ingest sample TXT/PDF.
2. Chunk and embed.
3. Persist vectors.
4. Search semantically.
5. Inject retrieval context into chat.

### Production Deployment

Status: Partial.

What exists:

- Production compose overlay.
- Deploy and Kubernetes folders.
- Deployment diagnostics/plans/snapshots/rollback endpoints.
- Deployment documentation.

Missing:

- Real VPS/Kubernetes deployment.
- Real domain and TLS.
- Backup/restore drill.
- Monitoring deployment.
- External smoke test.

Next steps:

1. Pick deployment target.
2. Configure production environment.
3. Run one-command deploy or documented compose.
4. Validate health, auth, WebSocket, Ollama, Postgres, Redis.
5. Run restore drill.

## Medium Priority

### Whisper CPU Runtime

Status: Partial/blocked pending binary and model validation.

What exists:

- Multimodal route/report trail.
- CPU-first policy.
- Environment names documented: `WHISPER_CPP_BIN`, `WHISPER_MODEL_PATH`.

Missing:

- Confirmed binary path.
- Confirmed tiny/base model path.
- Audio preprocessing proof.
- Transcript persistence proof.
- Subtitle export proof.

Next steps:

1. Validate configured binary.
2. Validate model path.
3. Submit short audio job.
4. Persist transcript and subtitle.
5. Add blocked-state UI when binary/model absent.

### AI Studio Workflow Builder

Status: Partial.

What exists:

- AI Studio route.
- Readiness/templates/media jobs APIs.
- Workflow route surface.

Missing:

- Fresh save/load/version validation.
- Queue-based execution proof.
- Live logs proof.
- Replay/debugger proof.

Next steps:

1. Create small workflow.
2. Save it.
3. Execute it.
4. Verify logs and replay.

### Agent Execution Engine

Status: Partial.

What exists:

- `/api/agents/runs`.
- Agent catalog/status/DAG/replay/messages routes.
- Agent surfaces and reports.

Missing:

- Fresh multi-step planner/executor/verifier run.
- Cancellation test.
- Retry/recovery test.
- Memory-aware run proof.

Next steps:

1. Run a small deterministic agent task.
2. Inspect DAG/messages/replay.
3. Force failure and verify retry/recovery.

### Marketplace Install Engine

Status: Partial.

What exists:

- Extension listing.
- Installation listing.
- Install endpoint.
- Reviews endpoint.

Missing:

- Real registry sync.
- Package extraction.
- Signature/checksum validation.
- Rollback test.
- Extension execution sandbox.

Next steps:

1. Define minimal extension package.
2. Validate install queue.
3. Test failed install rollback.

### Team Collaboration

Status: Partial.

What exists:

- Team/workspace route surface.
- Enterprise organization surfaces.
- RBAC roles documented.

Missing:

- Invite flow proof.
- Role permission matrix proof.
- Shared workspace realtime collaboration proof.

Next steps:

1. Add invite E2E test.
2. Verify role restrictions.
3. Add audit event for membership changes.

## Lower Priority / Future

### Native Mobile App

Status: Planned/partial.

What exists:

- Responsive frontend.
- Mobile runtime API surfaces.
- Push adapter status endpoint.

Missing:

- Native app shell.
- Push credentials.
- Offline sync device QA.

### Object Storage Production Backend

Status: Partial.

What exists:

- Upload/object routes.
- Signed object read route.

Missing:

- S3/R2/MinIO production configuration.
- CDN integration.
- Backup strategy.

### Enterprise SSO

Status: Planned.

Missing:

- SAML/OIDC provider integration.
- Domain-based workspace routing.
- SCIM provisioning.

### Compliance And Audit Exports

Status: Planned/partial.

What exists:

- Audit/security report trail and some audit logging.

Missing:

- Exportable audit logs.
- Retention policies.
- Compliance dashboard.

## Known Non-Blocking Issues

- Forced Socket.IO websocket-only transport failed in Node client, but current frontend uses native `/ws`, which passed.
- Docker previously reported orphan Ollama containers; do not clean destructively without explicit approval.
- Exhaustive click validation of every dashboard button has not been completed.

## Current Hardware Constraints

- Intel UHD Graphics only.
- CPU-first operation.
- No CUDA/NVIDIA.
- Low-resource laptop.
- Avoid huge model downloads and RAM-heavy dependencies.
