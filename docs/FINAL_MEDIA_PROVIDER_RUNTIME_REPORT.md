# CODRAI Final Media Provider Runtime Report

Generated: 2026-05-20

## Runtime Model

CODRAI AI Studio does not simulate media generation. Each media request is stored in PostgreSQL and routed through the existing production AI runtime engine. Provider availability is checked through the registered provider layer.

## Provider Wiring

Registered media providers checked by AI Studio:

- `fal`
- `stability`
- `elevenlabs`

Provider readiness is returned from the backend through:

`GET /api/ai-studio/readiness?workspaceId=:workspaceId`

The response includes:

- provider name
- provider type
- registered state
- capabilities
- streaming support flag
- job summary
- prompt templates
- studio capabilities

## Execution Behavior

When a user submits a media job:

1. The API validates authenticated access.
2. The request is inserted into `ai_studio_media_jobs` with status `routing`.
3. A realtime routing event is published to the workspace channel.
4. `AiRuntimeEngine.execute` attempts provider routing for `image`, `video`, or `voice`.
5. If a provider accepts the task, the job is updated to `queued` or `completed`.
6. If no provider is configured or healthy, the job is updated to `blocked`.
7. The blocked reason is stored in PostgreSQL and returned to the frontend as `errorMessage`.

## Verified Local Result

Test media job:

- media type: `image`
- mode: `logo`
- prompt: `Create a premium black neon CODRAI AI operating system logo with cyan highlights`
- status: `blocked`
- error: `No healthy provider available for task type: image`

This confirms:

- API validation works.
- Auth works.
- Runtime dispatch is reached.
- Missing provider keys do not crash the request.
- Failure state is persisted.
- Failure state is returned to the frontend.

## Production Provider Requirements

To activate real media generation:

- fal.ai: configure a valid fal API key.
- Stability: configure a valid Stability API key.
- ElevenLabs: configure a valid ElevenLabs API key.

Recommended environment/provider settings:

- `FAL_API_KEY`
- `STABILITY_API_KEY`
- `ELEVENLABS_API_KEY`

If provider keys are stored through CODRAI Provider Settings, they should continue using the existing encrypted provider settings path.

## Reliability Notes

- No fake generated image/video/audio URL is returned.
- Blocked states are explicit and actionable.
- Jobs are durable across process restarts.
- Realtime events are emitted through the existing event bus.
- The frontend is protected by the existing auth route guard.

