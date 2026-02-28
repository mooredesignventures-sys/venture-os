$ErrorActionPreference = "Continue"

function Write-Section($title) {
  Write-Host ""
  Write-Host ("=== " + $title + " ===")
}

function Test-UrlHead($url) {
  Write-Host ("[curl] " + $url)
  $output = curl.exe -I --max-time 8 $url 2>&1
  if ($LASTEXITCODE -eq 0) {
    $status = $output | Select-String -Pattern "^HTTP/" | Select-Object -First 1
    if ($status) {
      Write-Host ("  " + $status.Line)
    } else {
      Write-Host "  Request succeeded but no HTTP status line was detected."
      $output | Select-Object -First 5 | ForEach-Object { Write-Host ("  " + $_) }
    }
    return
  }

  Write-Host ("  curl failed (exit " + $LASTEXITCODE + ")")
  $output | Select-Object -First 8 | ForEach-Object { Write-Host ("  " + $_) }
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"
Write-Host ("Timestamp: " + $timestamp)
Write-Host ("PWD: " + (Get-Location).Path)

$urlFile = Join-Path ".next" "dev-safe-url.json"
$discoveredPort = $null

Write-Section ".next/dev-safe-url.json"
if (Test-Path $urlFile) {
  $raw = Get-Content $urlFile -Raw
  Write-Host $raw
  try {
    $parsed = $raw | ConvertFrom-Json
    if ($parsed -and $parsed.port) {
      $discoveredPort = [int]$parsed.port
      Write-Host ("Discovered port: " + $discoveredPort)
    }
  } catch {
    Write-Host "Could not parse dev-safe-url.json"
  }
} else {
  Write-Host "Missing .next/dev-safe-url.json"
}

Write-Section "netstat LISTENING ports 3000-3010"
$hasListening = $false
foreach ($port in 3000..3010) {
  $lines = netstat -ano -p tcp | Select-String -Pattern (":" + $port + "\s+") | ForEach-Object { $_.Line } | Where-Object { $_ -match "LISTENING" }
  if ($lines) {
    $hasListening = $true
    Write-Host ("Port " + $port + ":")
    $lines | ForEach-Object { Write-Host ("  " + $_.Trim()) }
  }
}
if (-not $hasListening) {
  Write-Host "No LISTENING TCP entries found in range 3000-3010."
}

Write-Section "tasklist node.exe"
tasklist /FI "IMAGENAME eq node.exe"

$portsToProbe = New-Object System.Collections.Generic.HashSet[int]
[void]$portsToProbe.Add(3000)
if ($discoveredPort -and $discoveredPort -ge 1) {
  [void]$portsToProbe.Add($discoveredPort)
}

Write-Section "HTTP probe 127.0.0.1"
foreach ($port in $portsToProbe) {
  Test-UrlHead ("http://127.0.0.1:" + $port + "/login")
}

Write-Section "HTTP probe localhost"
foreach ($port in $portsToProbe) {
  Test-UrlHead ("http://localhost:" + $port + "/login")
}

$watchdogLog = Join-Path "logs" "dev-watchdog.log"
Write-Section "logs/dev-watchdog.log (last 50 lines)"
if (Test-Path $watchdogLog) {
  Get-Content $watchdogLog -Tail 50
} else {
  Write-Host "No watchdog log found at logs/dev-watchdog.log"
}
