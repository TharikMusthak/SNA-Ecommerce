param(
  [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

if (-not $OutputPath) {
  $OutputPath = Join-Path (Split-Path -Parent $ProjectRoot) "SNA-Clean-Release.zip"
}

$StageRoot = Join-Path ([System.IO.Path]::GetTempPath()) (
  "sna-release-" + [System.Guid]::NewGuid().ToString("N")
)
$StageProject = Join-Path $StageRoot "SNA-Ecommerce"

try {
  New-Item -ItemType Directory -Path $StageProject -Force | Out-Null

  & robocopy $ProjectRoot $StageProject /E `
    /XD .git node_modules dist uploads release `
    /XF .env .env.local .env.production .env.development *.log | Out-Null

  if ($LASTEXITCODE -ge 8) {
    throw "robocopy failed with exit code $LASTEXITCODE"
  }

  Get-ChildItem -Path $StageProject -Recurse -Force -File -Filter ".env*" |
    Where-Object { $_.Name -ne ".env.example" } |
    Remove-Item -Force

  if (Test-Path $OutputPath) {
    Remove-Item -LiteralPath $OutputPath -Force
  }

  Compress-Archive -Path $StageProject -DestinationPath $OutputPath
  Write-Host "Clean release created: $OutputPath"
} finally {
  if (Test-Path $StageRoot) {
    Remove-Item -LiteralPath $StageRoot -Recurse -Force
  }
}
