param(
  [Parameter(Mandatory = $true)][string]$BackupDir
)

$ErrorActionPreference = "Stop"
$resolved = Resolve-Path $BackupDir
$postgresDump = Join-Path $resolved "postgres.dump"
$redisDump = Join-Path $resolved "redis-dump.rdb"

if (!(Test-Path $postgresDump)) {
  throw "Missing postgres.dump in $resolved"
}

Write-Output "This restore writes into the running CODRAI PostgreSQL database. Stop application traffic before running in production."
docker cp $postgresDump "codrai-postgres-1:/tmp/codrai-restore.dump"
docker exec codrai-postgres-1 pg_restore -U postgres -d codrai --clean --if-exists /tmp/codrai-restore.dump
docker exec codrai-postgres-1 rm -f /tmp/codrai-restore.dump

if (Test-Path $redisDump) {
  Write-Output "Redis dump is available at $redisDump. Restore requires stopping Redis first; CODRAI does not overwrite Redis live."
}

[pscustomobject]@{
  status = "postgres_restored"
  backupDir = $resolved.Path
  restoredAt = (Get-Date).ToUniversalTime().ToString("o")
  redisRestore = if (Test-Path $redisDump) { "manual_stop_required" } else { "not_available" }
} | ConvertTo-Json -Depth 4
