param(
  [string]$BaseUrl = "http://localhost:5000/api",
  [string]$FrontendUrl = "http://localhost:5173",
  [string]$WorkspaceId = "local-workspace"
)

$ErrorActionPreference = "Stop"

function Check-Http {
  param([string]$Name, [string]$Url)
  try {
    $start = Get-Date
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 25
    [pscustomobject]@{
      name = $Name
      status = "ok"
      statusCode = $response.StatusCode
      latencyMs = [int]((Get-Date) - $start).TotalMilliseconds
      url = $Url
    }
  } catch {
    [pscustomobject]@{ name = $Name; status = "blocked"; error = $_.Exception.Message; url = $Url }
  }
}

$checks = @(
  Check-Http "backend_health" "$BaseUrl/health"
  Check-Http "frontend_dashboard" "$FrontendUrl/dashboard"
  Check-Http "provider_orchestration" "$BaseUrl/providers/orchestration?workspaceId=$WorkspaceId"
  Check-Http "deployment_readiness" "$BaseUrl/deployment/production-readiness?workspaceId=$WorkspaceId"
  Check-Http "prometheus_metrics" "$BaseUrl/telemetry/metrics?workspaceId=$WorkspaceId"
  Check-Http "runtime_queues" "$BaseUrl/runtime/queues?workspaceId=$WorkspaceId"
  Check-Http "runtime_workers" "$BaseUrl/runtime/workers?workspaceId=$WorkspaceId"
  Check-Http "object_storage" "$BaseUrl/files/objects/status?workspaceId=$WorkspaceId"
  Check-Http "whisper_diagnostics" "$BaseUrl/multimodal/audio/whisper/diagnostics?workspaceId=$WorkspaceId"
)

$compose = try {
  docker compose ps 2>$null
} catch {
  "docker compose ps unavailable: $($_.Exception.Message)"
}

[pscustomobject]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  status = if (($checks | Where-Object status -eq "blocked").Count -eq 0) { "ready" } else { "needs_attention" }
  checks = $checks
  containers = $compose
  nextActions = @(
    "Configure paid provider keys only when required; Ollama remains the verified local provider.",
    "Configure WHISPER_CPP_BIN and WHISPER_MODEL_PATH before enabling speech-to-text execution.",
    "Run docker compose -f docker-compose.yml -f docker-compose.production.yml up -d codrai-edge for edge proxy.",
    "Run docker compose -f docker-compose.yml -f docker-compose.production.yml --profile observability up -d prometheus grafana for monitoring."
  )
} | ConvertTo-Json -Depth 8
