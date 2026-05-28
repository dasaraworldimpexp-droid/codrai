# CODRAI

CODRAI is a full-stack AI SaaS platform built with React, Tailwind CSS, Node.js, Express, MongoDB, JWT auth, OpenAI-ready services, and Razorpay-ready payment modules.

## Folder Structure

```txt
CODRAI/
  frontend/       React + Vite + Tailwind app
  backend/        Node.js + Express API
  docs/           Core architecture and system design
```

## Core AI Operating System Architecture

The phase 1 modular foundation is documented here:

```txt
docs/CORE_AI_OS_ARCHITECTURE.md
```

The backend now includes core module boundaries for AI gateway, model routing, memory, agents, prompt orchestration, queues, usage, storage, notifications, personalization, sync, workspaces, projects, and provider abstraction.

The execution layer is documented here:

```txt
docs/EXECUTION_ENGINE_ARCHITECTURE.md
```

It adds the AI Runtime Engine, Workflow Engine, Multi-Agent Runtime, Task Scheduler, Realtime Event Bus, Background Processor, Provider Runtime, Memory Retrieval Runtime, AI Context Engine, Streaming Response Engine, and API orchestration routes.

The autonomous intelligence layer is documented here:

```txt
docs/AUTONOMOUS_MULTI_AGENT_INTELLIGENCE.md
```

It adds specialist agent profiles, autonomous planning, collaboration messaging, memory orchestration, emotional intelligence, approval-gated execution, and agent performance scoring.

The tool execution and creation ecosystem is documented here:

```txt
docs/TOOL_CREATION_ECOSYSTEM.md
```

It adds the secure Tool Execution Engine, Sandbox Policy, Tool Registry, Creation Orchestrator, App/Website/Game/Media/Document/Presentation/Automation/Agent/Ecommerce/Chatbot builders, provider routing catalog, workspace session service, and frontend workspace/creation/tool runtime panels.

The next-generation AI OS layer is documented here:

```txt
docs/NEXT_GENERATION_AI_OS.md
```

It adds the CODRAI Master Brain, multimodal orchestrator, enterprise business OS modules, knowledge graph/vector abstraction, API key vault, RBAC, abuse protection, marketplace plugin system, realtime collaboration service, performance routing, and frontend panels for Master Brain, multimodal, enterprise, marketplace, and trust.

The real execution layer is documented here:

```txt
docs/REAL_EXECUTION_SUPER_AI.md
```

It adds real provider adapters, PostgreSQL/pgvector schema, Redis/BullMQ queues, queue workers, SSE streaming, WebSocket event fanout, Docker, Kubernetes manifests, and CI.

## CMD Setup Commands

```cmd
cd "C:\Users\DASS ENTERPRISES\Documents\New project\CODRAI"
npm install
cd frontend
npm install
cd ..\backend
npm install
```

## Run Locally

Start backend:

```cmd
cd "C:\Users\DASS ENTERPRISES\Documents\New project\CODRAI\backend"
npm run dev
```

Start frontend in another CMD window:

```cmd
cd "C:\Users\DASS ENTERPRISES\Documents\New project\CODRAI\frontend"
npm run dev -- --open
```

Or run both from the project root:

```cmd
cd "C:\Users\DASS ENTERPRISES\Documents\New project\CODRAI"
npm run dev
```
