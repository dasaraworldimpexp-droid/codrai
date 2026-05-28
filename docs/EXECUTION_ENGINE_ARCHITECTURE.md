# CODRAI Execution Engine Architecture

This document extends `CORE_AI_OS_ARCHITECTURE.md` with the live execution layer. The execution engine is the runtime heart of CODRAI: it turns user intent, workflow steps, agent actions, and background jobs into auditable AI operations with streaming updates, memory-aware context, provider routing, usage tracking, and multi-device progress.

## 1. Runtime Stack

```txt
API / UI / Agents / Scheduler
  -> AI Runtime Engine
  -> AI Context Engine
  -> Memory Retrieval Runtime
  -> Prompt Orchestration
  -> AI Model Router
  -> AI Provider Runtime
  -> Streaming Response Engine
  -> Usage Ledger
  -> Event Bus
  -> Conversation / Project / Asset Persistence

Workflow Engine
  -> Dependency graph
  -> Agent delegation
  -> Background Processing
  -> Event Bus
  -> Job Queue

Multi-Agent Runtime
  -> Lead agent planner
  -> Specialist agents
  -> Shared memory scope
  -> Inter-agent messages
  -> Approval gates
  -> Execution journal
```

## 2. Execution Layer Modules

```txt
backend/src/core/
  runtime/
    ai-runtime-engine.js
    runtime-types.js
  workflows/
    workflow-engine.js
    workflow-types.js
  agents/
    multi-agent-runtime.js
  scheduler/
    task-scheduler.js
  events/
    realtime-event-bus.js
    event-types.js
  background-processing/
    background-processor.js
  provider-runtime/
    ai-provider-runtime.js
  memory/
    memory-retrieval-runtime.js
  context/
    ai-context-engine.js
  streaming/
    streaming-response-engine.js
```

## 3. AI Runtime Engine

The AI Runtime Engine is the unified executor for:
- Coding AI
- Image AI
- Video AI
- Voice AI
- Chatbot AI
- Automation AI
- Teacher AI

Runtime responsibilities:
- Normalize incoming execution requests.
- Build memory-aware context.
- Select provider through the model router.
- Reserve and finalize usage.
- Choose sync, streaming, or queued execution.
- Retry transient provider failures.
- Emit real-time lifecycle events.
- Persist conversation, asset, and job outputs through injected repositories.

Execution states:
- `accepted`
- `context_building`
- `routing`
- `queued`
- `streaming`
- `running`
- `completed`
- `failed`
- `cancelled`

## 4. Workflow Execution Engine

Workflows are directed acyclic graphs of executable steps.

Supported workflow families:
- Website generation
- App generation
- AI marketing
- AI video
- Ecommerce
- Education/course creation
- Document/presentation generation

Step types:
- `ai_task`
- `agent_task`
- `human_approval`
- `asset_transform`
- `export`
- `integration_call`
- `notification`

Workflow rules:
- Steps can depend on previous steps.
- Independent steps run in parallel.
- Long steps are queued.
- Failed retryable steps use retry policy.
- Human approval pauses execution.
- Every step emits progress events.

## 5. Multi-Agent Runtime

The multi-agent runtime coordinates:
- Architect Agent
- Coding Agent
- Design Agent
- Marketing Agent
- Research Agent
- QA Agent
- Teacher Agent

Agent collaboration model:
- Lead agent creates task plan.
- Delegation manager assigns specialist subtasks.
- Agents write to an execution journal.
- Shared memory is scoped to workspace/project/run.
- Inter-agent messages are persisted.
- External-risk actions require approval gates.

## 6. Realtime Event System

Event channels:
- `workspace:{workspaceId}`
- `project:{projectId}`
- `conversation:{conversationId}`
- `job:{jobId}`
- `workflow:{workflowRunId}`
- `agent:{agentRunId}`
- `device:{deviceId}`

Events:
- AI task accepted/routing/streaming/completed/failed.
- Workflow step started/completed/failed.
- Job queued/progress/completed/failed.
- Agent message/step/approval required.
- Notification created/read.
- Device sync patch.

Transport strategy:
- In-process event bus for modular monolith.
- Redis pub/sub fanout when workers split.
- Server-Sent Events for AI streaming and progress.
- WebSocket for multi-device sync and collaborative workspace state.

## 7. Memory + Context Runtime

Runtime retrieval flow:
1. Resolve user, workspace, project, conversation, workflow, and agent scopes.
2. Retrieve semantic memory through vector search.
3. Retrieve recent conversation summaries.
4. Retrieve project decisions and active files/assets.
5. Retrieve personalization profile.
6. Rank and compress context.
7. Enforce sensitivity and consent policies.
8. Return structured context blocks to prompt orchestration.

Context block types:
- `system`
- `user_profile`
- `project_memory`
- `conversation_summary`
- `workflow_state`
- `agent_journal`
- `asset_manifest`
- `retrieved_memory`
- `personalization`

## 8. Streaming Architecture

Streaming Response Engine supports:
- Token streaming.
- Partial rendering.
- Progress updates.
- Provider event normalization.
- Cancellation.
- Final output persistence.

Streaming flow:
```txt
Provider stream
  -> Provider Runtime normalizes chunks
  -> Streaming Engine emits token/progress events
  -> Event Bus fans out to devices
  -> Frontend progressive renderer updates UI
  -> Final response persists to conversation/project
```

## 9. Performance Strategy

Targets:
- AI chat first token under 1 second where provider latency allows.
- Image generation request accepted and visible in UI under 2 seconds.
- Smooth streaming through chunk buffering and low-overhead event fanout.

Techniques:
- Route low-latency chat to streaming-capable text providers.
- Queue media generation immediately and return job id.
- Cache provider health, model metadata, prompt templates, and memory summaries.
- Retrieve memory in parallel with project and conversation context.
- Use CDN for generated assets.
- Use signed URLs and lazy asset loading.
- Split GPU/media workers from text workers.
- Reserve credits before queueing to avoid wasted provider calls.

## 10. API Orchestration Layer

```txt
POST /api/runtime/execute
  Runs a normalized AI task through AI Runtime Engine.

POST /api/runtime/stream
  Starts streaming task and returns SSE stream.

POST /api/workflows/runs
  Starts workflow execution.

GET /api/workflows/runs/:runId
  Returns workflow state and step graph.

POST /api/agents/runs
  Starts multi-agent run.

GET /api/events/stream
  SSE stream for workspace, project, job, workflow, or conversation events.

POST /api/jobs/:jobId/cancel
  Cancels queued/running job if supported.
```

## 11. Realtime Frontend Integration

Frontend runtime modules:
- `runtime`: execution client and AI generation panels.
- `workflows`: workflow builder and workflow run graph.
- `realtime`: SSE/WebSocket client and event store.
- `agents`: agent catalog, run monitor, approval inbox.
- `ai-studio`: streaming conversation renderer.

UI update pattern:
- Start execution request.
- Immediately render accepted job/task state.
- Subscribe to relevant event channels.
- Append tokens/progress incrementally.
- Reconcile final persisted result.

## 12. Production Non-Negotiables

- No direct provider calls from controllers.
- No AI execution without usage checks.
- No long-running media task without queue/job record.
- No agent action without execution journal.
- No memory injection without scope and policy filtering.
- No realtime update without workspace authorization.
- No streaming task without cancellation and finalization path.
