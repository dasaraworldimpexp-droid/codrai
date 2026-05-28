# CODRAI WebSocket Runtime Report

## Endpoint
- WebSocket URL: `ws://localhost:5000/ws`

## Verification
A live WebSocket connection was opened and subscribed to:

- Channel: `workspace:dashboard`
- Response: `{"type":"subscribed","channel":"workspace:dashboard"}`

## Runtime Integration
AI Studio media job creation publishes workspace events through the existing event bus:

- `ai_studio.media.routing`
- `ai_studio.media.accepted`
- `ai_studio.media.blocked`

## Status
WebSocket subscription is operational in the local Docker runtime.

## Production Notes
For public deployment, WebSocket should be served behind TLS with sticky routing or a shared pub/sub adapter for horizontal scaling.
