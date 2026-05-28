param(
  [string]$BackupDir = ".\backups",
  [string]$Project = "codrai"
)

$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $BackupDir $stamp
New-Item -ItemType Directory -Force -Path $target | Out-Null

$postgresContainer = "codrai-postgres-1"
$redisContainer = "codrai-redis-1"

docker exec $postgresContainer pg_dump -U postgres -d codrai -Fc -f /tmp/codrai-$stamp.dump
docker cp "${postgresContainer}:/tmp/codrai-$stamp.dump" (Join-Path $target "postgres.dump")
docker exec $postgresContainer rm -f /tmp/codrai-$stamp.dump

docker exec $redisContainer redis-cli BGSAVE | Out-Null
Start-Sleep -Seconds 2
docker cp "${redisContainer}:/data/dump.rdb" (Join-Path $target "redis-dump.rdb")

$storagePath = Join-Path (Get-Location) "storage"
if (Test-Path $storagePath) {
  Compress-Archive -Path $storagePath -DestinationPath (Join-Path $target "storage.zip") -Force
}

[pscustomobject]@{
  status = "completed"
  project = $Project
  backupDir = (Resolve-Path $target).Path
  createdAt = (Get-Date).ToUniversalTime().ToString("o")
  artifacts = Get-ChildItem $target | Select-Object Name, Length
} | ConvertTo-Json -Depth 5
