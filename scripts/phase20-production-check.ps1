param(
  [string]$BaseUrl = "http://localhost:5000/api",
  [string]$FrontendUrl = "http://localhost:5173",
  [string]$WorkspaceId = "local-workspace"
)

$ErrorActionPreference = "Stop"

function Invoke-CodraiCheck {
  param([string]$Name, [string]$Url)
  try {
    $started = Get-Date
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 20
    $elapsed = [int]((Get-Date) - $started).TotalMilliseconds
    [pscustomobject]@{ name = $Name; status = "ok"; statusCode = $response.StatusCode; latencyMs = $elapsed; url = $Url }
  } catch {
    [pscustomobject]@{ name = $Name; status = "blocked"; error = $_.Exception.Message; url = $Url }
  }
}

$checks = @(
  Invoke-CodraiCheck -Name "backend_health" -Url "$BaseUrl/health"
  Invoke-CodraiCheck -Name "frontend_dashboard" -Url "$FrontendUrl/dashboard"
  Invoke-CodraiCheck -Name "provider_orchestration" -Url "$BaseUrl/providers/orchestration?workspaceId=$WorkspaceId"
  Invoke-CodraiCheck -Name "whisper_diagnostics" -Url "$BaseUrl/multimodal/audio/whisper/diagnostics?workspaceId=$WorkspaceId"
  Invoke-CodraiCheck -Name "runtime_queues" -Url "$BaseUrl/runtime/queues?workspaceId=$WorkspaceId"
  Invoke-CodraiCheck -Name "object_storage" -Url "$BaseUrl/files/objects/status?workspaceId=$WorkspaceId"
  Invoke-CodraiCheck -Name "deployment_readiness" -Url "$BaseUrl/deployment/production-readiness?workspaceId=$WorkspaceId"
)

$summary = [pscustomobject]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  baseUrl = $BaseUrl
  frontendUrl = $FrontendUrl
  workspaceId = $WorkspaceId
  status = if (($checks | Where-Object { $_.status -eq "blocked" }).Count -eq 0) { "ready" } else { "needs_attention" }
  checks = $checks
}

$summary | ConvertTo-Json -Depth 8
