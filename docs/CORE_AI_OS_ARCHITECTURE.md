# CODRAI Core Modular AI Operating System Architecture

CODRAI is an AI operating system for creators, developers, businesses, educators, and teams. It is not a chatbot. The platform must orchestrate AI models, agents, memories, files, workspaces, billing, async jobs, and real-time collaboration as separate, replaceable systems.

## 1. System Architecture

```txt
Client Apps
  Web Dashboard
  Mobile App
  Desktop/PWA
  Browser Extension
  Public API / SDK

API Edge
  Auth
  Rate Limits
  Request Validation
  Tenant Resolution
  Device Session Resolution

Core Services
  AI Gateway
  AI Model Router
  Prompt Orchestration Engine
  AI Agent Framework
  AI Memory System
  Workspace System
  Project Management System
  Conversation System
  Credit & Usage Engine
  File Storage System
  Notification System
  Multi-device Sync System
  Human-like Personalization System

Async Layer
  Realtime Job Queue
  Workers
  Schedulers
  Webhooks
  Progress Streams

Provider Layer
  OpenAI
  Claude
  Gemini
  ElevenLabs
  fal.ai
  SDXL / Flux
  Future providers

Data Layer
  MongoDB
  Vector DB
  Redis
  Object Storage
  Analytics Warehouse
```

## 2. Folder Architecture

```txt
CODRAI/
  backend/
    src/
      app.js
      server.js
      config/
        env.js
        database.js
        redis.js
        queues.js
        storage.js
        providers.js
      contracts/
        ai-task.contract.js
        model-provider.contract.js
        agent.contract.js
        memory.contract.js
        job.contract.js
      core/
        ai-gateway/
        model-router/
        prompt-orchestration/
        agents/
        memory/
        workspace/
        projects/
        queues/
        usage/
        storage/
        notifications/
        personalization/
        sync/
      providers/
        openai/
        anthropic/
        gemini/
        elevenlabs/
        fal/
      models/
      routes/
      controllers/
      middleware/
      services/
      utils/

  frontend/
    src/
      app/
        router.jsx
        providers.jsx
        query-client.js
      layouts/
        DashboardShell.jsx
        WorkspaceShell.jsx
        StudioShell.jsx
      features/
        ai-studio/
        agents/
        workspace/
        projects/
        billing/
        settings/
      shared/
        components/
        hooks/
        services/
        stores/
        utils/

  docs/
    CORE_AI_OS_ARCHITECTURE.md
```

## 3. Core Service Architecture

### AI Gateway Layer

Single controlled entry point for all AI execution.

Responsibilities:
- Accept normalized AI task requests from UI, API, agents, automations, and background jobs.
- Resolve user, workspace, project, device, permissions, subscription, credits, and policy constraints.
- Attach relevant memory, files, conversation context, and personalization signals.
- Send the request to the AI Model Router.
- Persist inputs, outputs, cost, latency, provider metadata, and audit events.

Primary modules:
- `aiGateway.service.js`
- `aiGateway.policy.js`
- `aiGateway.audit.js`
- `aiGateway.controller.js`

### AI Model Router

Intelligent routing system that maps task intent to the best model/provider.

Routing dimensions:
- `taskType`: coding, image, video, voice, reasoning, research, document, presentation, ecommerce, game, education, automation.
- `qualityTier`: economy, balanced, premium, enterprise.
- `latencyTargetMs`
- `maxCost`
- `requiredCapabilities`: vision, function calling, tools, json mode, long context, streaming, voice, image generation, video rendering.
- `providerHealth`
- `userPlan`
- `region`

Example routes:
- Coding request -> coding-capable LLM.
- Image request -> image generation provider.
- Video request -> async video provider through queue.
- Reasoning task -> reasoning model.
- Voice task -> voice/TTS/STT engine.

Provider contract:
- `generateText(task)`
- `generateImage(task)`
- `generateVideo(task)`
- `generateVoice(task)`
- `embed(task)`
- `moderate(task)`
- `estimateCost(task)`
- `healthCheck()`

### AI Memory System

Persistent memory with explicit user control.

Memory types:
- Profile memory: preferences, tone, goals, learning style.
- Project memory: project intent, architecture, decisions, files, milestones.
- Conversation memory: summaries, facts, unresolved tasks.
- Workflow memory: repeated business processes and automations.
- Skill memory: user expertise level and teaching preferences.

Memory pipeline:
1. Capture candidate memories from conversations, projects, files, and agent work.
2. Classify as profile, project, workflow, or conversation memory.
3. Ask consent when memory is sensitive or user-controlled settings require it.
4. Store canonical record in MongoDB.
5. Store vector embedding in vector database.
6. Retrieve through semantic search and policy filters.
7. Inject only relevant memory into AI Gateway context.

### User Workspace System

Workspace is the tenant boundary.

Workspace contains:
- Members
- Roles
- Projects
- Folders
- Assets
- Saved prompts
- Conversations
- Generated content
- Billing account
- Usage ledger
- Integrations
- Device sessions

### Project Management System

Project is the main production object.

Project types:
- Website
- App
- AI video
- AI image collection
- Software repo
- AI agent
- Automation
- Document
- Presentation
- Ecommerce system
- Game
- Education course

Each project has:
- Metadata
- Folder tree
- Assets
- Conversations
- Jobs
- Agents
- Version history
- Deployment/export records
- Memory namespace

### AI Agent Framework

Agents are capability-scoped workers with tools, memory, policies, and background execution.

Core agents:
- Coding Agent
- Marketing Agent
- Research Agent
- Design Agent
- Teacher Agent
- Automation Agent

Agent runtime:
- Planner
- Tool registry
- Memory access layer
- Delegation manager
- Execution journal
- Queue integration
- Approval gates
- Cost guardrails

Multi-agent collaboration:
- A lead agent owns task planning.
- Specialist agents receive scoped subtasks.
- Shared workspace memory stores decisions.
- Execution journal records who did what.
- Human approval is required for destructive, financial, external publishing, or deployment actions.

### Prompt Orchestration Engine

Prompt orchestration builds task-ready model input.

Responsibilities:
- Select system prompt by domain and agent.
- Compose user intent, memory, files, project state, safety rules, output contract, and tool definitions.
- Enforce structured output where needed.
- Version prompts and evaluate performance.
- Support prompt templates, snippets, variables, and saved prompts.

### Realtime Job Queue

Async processing for long-running work.

Use cases:
- AI video generation.
- AI image batches.
- Code generation and tests.
- Exports.
- Rendering.
- Web scraping/research.
- Document generation.
- Presentation rendering.
- Ecommerce sync.

Recommended stack:
- Redis + BullMQ for phase 1.
- Dedicated workers by queue domain.
- WebSocket or Server-Sent Events for progress.
- MongoDB job records as durable audit trail.

Queues:
- `ai.text`
- `ai.image`
- `ai.video`
- `ai.voice`
- `agents.execution`
- `exports.render`
- `documents.generate`
- `presentations.generate`
- `ecommerce.sync`
- `notifications.delivery`

Job guarantees:
- Idempotency key.
- Retry policy.
- Dead-letter queue.
- Progress events.
- Cancellation.
- Timeout.
- Provider callback/webhook support.

### Credit & Usage Engine

Every AI operation must produce usage ledger entries.

Tracks:
- Input tokens.
- Output tokens.
- Image/video/voice units.
- Storage used.
- Queue runtime.
- Provider cost.
- Platform credit charge.
- Workspace/user/project attribution.

Rules:
- Check balance before execution.
- Reserve credits for long-running jobs.
- Finalize charge on completion.
- Refund unused reservations on failure/cancel.
- Enforce plan limits and rate limits.

### File Storage System

Storage must support generated assets and user uploads.

Recommended:
- S3-compatible object storage.
- MongoDB file metadata.
- Signed upload/download URLs.
- Virus/content scanning extension point.
- Asset deduplication through hashes.
- Project/folder namespace.

Asset types:
- Images
- Videos
- Audio
- Documents
- Presentations
- Code archives
- Datasets
- Ecommerce product assets

### Notification System

Notification channels:
- In-app
- Email
- Web push
- Webhook
- Future SMS/WhatsApp

Events:
- Job completed/failed.
- Payment succeeded/failed.
- Agent needs approval.
- Export ready.
- Workspace invite.
- Usage limit warning.

### AI Conversation History

Conversation is separate from memory.

Stores:
- Threads
- Messages
- Attachments
- Tool calls
- Agent actions
- Provider metadata
- Cost and latency
- Message summaries
- Memory extraction status

### Human-like Personalization System

Personalization is controlled, inspectable, and reversible.

Signals:
- Tone preference.
- Response detail preference.
- Domain expertise.
- Learning style.
- Current emotional tone.
- Project goals.
- Repeated workflows.
- Prior corrections.

Runtime behavior:
- Detect emotional tone without overclaiming.
- Adapt explanation depth.
- Preserve user voice and project preferences.
- Recall only relevant context.
- Avoid storing sensitive personal data without consent.

### Multi-device Sync System

Sync targets:
- Open conversations.
- Draft prompts.
- Workspace navigation state.
- Notifications.
- Job progress.
- Project updates.
- Presence.

Recommended:
- Device sessions in MongoDB.
- Redis pub/sub for real-time fanout.
- WebSocket gateway for live updates.
- Last-write-wins for simple UI state.
- Versioned conflict resolution for documents and project files.

## 4. Database Schema Plan

MongoDB collections:

```txt
users
workspaces
workspaceMembers
deviceSessions
projects
projectFolders
assets
savedPrompts
conversations
messages
messageToolCalls
memories
memoryEmbeddings
agents
agentRuns
agentRunSteps
jobs
jobEvents
usageLedger
creditReservations
subscriptions
payments
notifications
integrations
auditLogs
```

Key schema notes:
- Every tenant-owned document includes `workspaceId`.
- Project-owned documents include `projectId`.
- AI records include `provider`, `model`, `cost`, `latencyMs`, and `requestId`.
- Soft delete important user data with `deletedAt`.
- Sensitive fields are encrypted at rest.
- Large files stay in object storage, not MongoDB.
- Vector data can live in a dedicated vector DB; MongoDB stores canonical memory metadata.

## 5. API Layer Structure

```txt
/api/auth
  POST /signup
  POST /login
  POST /logout
  GET  /me

/api/workspaces
  GET    /
  POST   /
  GET    /:workspaceId
  PATCH  /:workspaceId
  GET    /:workspaceId/members

/api/projects
  GET    /
  POST   /
  GET    /:projectId
  PATCH  /:projectId
  DELETE /:projectId

/api/ai
  POST /tasks
  GET  /tasks/:taskId
  POST /tasks/:taskId/cancel

/api/conversations
  GET  /
  POST /
  GET  /:conversationId
  POST /:conversationId/messages

/api/agents
  GET  /
  POST /runs
  GET  /runs/:runId
  POST /runs/:runId/cancel

/api/jobs
  GET /:jobId
  GET /:jobId/events

/api/assets
  POST /upload-url
  GET  /
  GET  /:assetId
  DELETE /:assetId

/api/billing
  GET  /usage
  POST /checkout/razorpay
  POST /webhooks/razorpay

/api/notifications
  GET /
  POST /:notificationId/read
```

## 6. AI Routing System

Normalized AI task shape:

```js
{
  id,
  userId,
  workspaceId,
  projectId,
  conversationId,
  taskType,
  intent,
  input,
  attachments,
  requiredCapabilities,
  qualityTier,
  maxCost,
  latencyTargetMs,
  outputContract,
  contextPolicy,
  metadata
}
```

Routing flow:
1. Classify task intent.
2. Validate user/workspace permissions.
3. Check plan and credits.
4. Retrieve memory and project context.
5. Select provider candidates.
6. Estimate cost/latency.
7. Choose route.
8. Execute synchronously or enqueue.
9. Persist result and usage.
10. Emit real-time update.

## 7. Agent Framework Structure

Agent record:

```js
{
  workspaceId,
  type,
  name,
  description,
  tools,
  memoryScopes,
  policies,
  defaultModelPolicy,
  status
}
```

Agent run:

```js
{
  workspaceId,
  projectId,
  agentId,
  objective,
  status,
  plan,
  steps,
  delegatedRuns,
  approvals,
  usage,
  result
}
```

Execution states:
- `queued`
- `planning`
- `running`
- `waiting_for_approval`
- `completed`
- `failed`
- `cancelled`

## 8. Queue Architecture

```txt
API request
  -> AI Gateway
  -> Credit reservation
  -> Job record
  -> BullMQ queue
  -> Worker
  -> Provider adapter
  -> Progress events
  -> Usage finalize
  -> Asset/result persistence
  -> Notification
  -> Realtime sync
```

Worker types:
- `TextWorker`
- `ImageWorker`
- `VideoWorker`
- `VoiceWorker`
- `AgentWorker`
- `ExportWorker`
- `NotificationWorker`

## 9. Memory Architecture

```txt
Conversation / Project / File / Agent Run
  -> Memory Candidate Extractor
  -> Sensitivity Classifier
  -> User Consent Policy
  -> Canonical Memory Store
  -> Embedding Provider
  -> Vector Index
  -> Semantic Retrieval
  -> Context Compressor
  -> AI Gateway
```

Memory retrieval filters:
- User scope.
- Workspace scope.
- Project scope.
- Recency.
- Confidence.
- Sensitivity.
- User opt-out.
- Task relevance.

## 10. Frontend Modular Structure

Dashboard shell:
- Sidebar navigation.
- Workspace switcher.
- Project switcher.
- Global command palette.
- Notification center.
- User/account menu.

AI Studio:
- Conversation panel.
- Composer.
- Attachments.
- Tool/action picker.
- Model/quality selector.
- Job progress panel.
- Output preview.

Workspace:
- Projects.
- Folders.
- Assets.
- Saved prompts.
- Team members.
- Integrations.

Agents:
- Agent catalog.
- Agent run history.
- Multi-agent task view.
- Approval inbox.

Billing:
- Plan.
- Credits.
- Usage.
- Invoices.
- Razorpay checkout.

## 11. Scaling Strategy

Phase 1:
- Modular monolith backend.
- MongoDB.
- Redis + BullMQ.
- S3-compatible storage.
- Vector DB managed service.
- WebSocket/SSE realtime.

Phase 2:
- Split workers into separate deployables.
- Add provider health monitor.
- Add analytics warehouse.
- Add event bus.
- Add API SDK.

Phase 3:
- Service extraction for AI Gateway, Queue Workers, Usage, Memory, and Realtime.
- Multi-region storage/CDN.
- Dedicated enterprise tenant isolation.
- Fine-grained audit and compliance controls.

## 12. Production Rules

- No provider-specific code inside business modules.
- Every AI task goes through AI Gateway.
- Every AI operation creates usage ledger entries.
- Every long task uses queue and progress events.
- Every workspace-owned resource has workspace authorization.
- Every memory has scope, source, confidence, and deletion controls.
- Every agent run is auditable.
- Every external action requiring risk uses approval gates.
