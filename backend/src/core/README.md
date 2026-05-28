# CODRAI Backend Core Modules

This directory contains the internal AI operating system modules. Business code should depend on these module contracts, not directly on provider SDKs.

Rules:
- AI execution enters through `ai-gateway`.
- Model choice happens only in `model-router`.
- Provider SDK usage stays inside `providers`.
- Long-running work goes through `queues`.
- Memory retrieval and storage stays inside `memory`.
- Usage and credit checks happen before provider execution.
