# CODRAI Request Tracing Report

Generated: 2026-05-20

## Implemented

CODRAI now emits `X-Request-Id` for API requests and stores sanitized request traces in PostgreSQL.

## Persistence

Table: `request_traces`

Stored fields:

- request id
- workspace id
- user id
- method
- path
- status code
- latency
- user agent
- IP address
- request size
- response size
- route metadata
- timestamp

## Safety

Request tracing intentionally avoids request bodies and secrets. Trace write failures are swallowed so observability cannot break production API responses.

## Verification

Live API calls returned `X-Request-Id` headers after Docker restart.

