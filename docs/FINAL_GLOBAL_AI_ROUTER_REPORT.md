# CODRAI Global AI Router Report

Generated: 2026-05-20

## Router Foundation

CODRAI now has persisted global AI router policies layered on the existing model router. The router remains the single execution path and supports provider health, cost, latency, quality tier, capability matching, and fallback ordering.

## Persisted Policies

- Default enterprise chat routing
- Default coding routing
- Default local fallback routing

## Router Recommendation API

`POST /api/enterprise/cloud/router/recommend`

The endpoint performs a real route recommendation against the existing model router. It does not execute model generation.

## Live Result

Local Docker result:

- Status: `blocked`
- Reason: `No healthy provider available for task type: reasoning`

This is correct because provider API keys are not configured.

## Activation

Configure provider keys through Provider Settings or environment variables, then rerun the route recommendation and provider benchmarks.

