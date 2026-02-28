$ErrorActionPreference = "Continue"

function Write-Section($title) {
  Write-Host ""
  Write-Host ("=== " + $title + " ===")
}

function Test-HeadStatus($url) {
  $output = curl.exe -I --max-time 8 $url 2>&1
  if ($LASTEXITCODE -ne 0) {
    return [PSCustomObject]@{
      Url = $url
      Success = $false
      Status = ""
      Raw = $output
    }
  }

  $status = $output | Select-String -Pattern "^HTTP/" | Select-Object -First 1
  return [PSCustomObject]@{
    Url = $url
    Success = [bool]$status
    Status = if ($status) { $status.Line } else { "" }
    Raw = $output
  }
}

Write-Host ("Timestamp: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"))
Write-Host ("PWD: " + (Get-Location).Path)

$urlFile = Join-Path ".next" "dev-safe-url.json"
$discoveredPort = $null
$reportedUrl = $null

Write-Section ".next/dev-safe-url.json"
if (Test-Path $urlFile) {
  $raw = Get-Content $urlFile -Raw
  Write-Host $raw
  try {
    $parsed = $raw | ConvertFrom-Json
    if ($parsed.port) {
      $discoveredPort = [int]$parsed.port
    }
    if ($parsed.url) {
      $reportedUrl = [string]$parsed.url
    }
  } catch {
    Write-Host "Could not parse .next/dev-safe-url.json"
  }
} else {
  Write-Host "Missing .next/dev-safe-url.json"
}

$listeners = @()
Write-Section "Listeners 3000-3010"
foreach ($port in 3000..3010) {
  $lines = netstat -ano -p tcp |
    Select-String -Pattern (":" + $port + "\s+") |
    ForEach-Object { $_.Line } |
    Where-Object { $_ -match "LISTENING" }
  if ($lines) {
    foreach ($line in $lines) {
      $trim = $line.Trim()
      $parts = $trim -split "\s+"
      $pid = $parts[$parts.Length - 1]
      $listeners += [PSCustomObject]@{ Port = $port; PID = $pid; Line = $trim }
    }
  }
}

if ($listeners.Count -eq 0) {
  Write-Host "No LISTENING TCP entries found in 3000-3010."
} else {
  $listeners | ForEach-Object { Write-Host ("Port " + $_.Port + " PID " + $_.PID + " :: " + $_.Line) }
}

Write-Section "node.exe tasklist"
tasklist /FI "IMAGENAME eq node.exe"

$portsToProbe = New-Object System.Collections.Generic.HashSet[int]
[void]$portsToProbe.Add(3000)
if ($discoveredPort -and $discoveredPort -ge 1) {
  [void]$portsToProbe.Add($discoveredPort)
}

$probeRows = @()
Write-Section "HTTP HEAD probes (127.0.0.1)"
foreach ($port in $portsToProbe) {
  $url = "http://127.0.0.1:$port/login"
  $row = Test-HeadStatus $url
  $probeRows += $row
  if ($row.Success) {
    Write-Host ("[OK] " + $row.Url + " -> " + $row.Status)
  } else {
    Write-Host ("[FAIL] " + $row.Url)
  }
}

Write-Section "HTTP HEAD probes (localhost)"
foreach ($port in $portsToProbe) {
  $url = "http://localhost:$port/login"
  $row = Test-HeadStatus $url
  $probeRows += $row
  if ($row.Success) {
    Write-Host ("[OK] " + $row.Url + " -> " + $row.Status)
  } else {
    Write-Host ("[FAIL] " + $row.Url)
  }
}

$hasAnyListener = $listeners.Count -gt 0
$hasDiscoveredListener = $false
if ($discoveredPort) {
  $hasDiscoveredListener = @($listeners | Where-Object { $_.Port -eq $discoveredPort }).Count -gt 0
}
$has127Success = @($probeRows | Where-Object { $_.Url -like "http://127.0.0.1:*" -and $_.Success }).Count -gt 0
$hasLocalhostSuccess = @($probeRows | Where-Object { $_.Url -like "http://localhost:*" -and $_.Success }).Count -gt 0

Write-Section "Conclusion"
if (-not $hasAnyListener) {
  Write-Host "NO LISTENER: No Node/Next listener on ports 3000-3010."
} elseif ($discoveredPort -and -not $hasDiscoveredListener) {
  Write-Host ("PORT DRIFT: URL file points to port " + $discoveredPort + " but listener is on a different port.")
} elseif ($has127Success -and -not $hasLocalhostSuccess) {
  Write-Host "LOCALHOST ISSUE: 127.0.0.1 works but localhost fails."
} elseif ($has127Success -and $hasLocalhostSuccess) {
  Write-Host "HEALTHY: Listener and HTTP responses are available for both 127.0.0.1 and localhost."
} else {
  Write-Host "UNHEALTHY: Listener exists but HTTP checks failed. Run npm run dev:safe and recheck."
}

if ($reportedUrl) {
  Write-Host ("Reported URL: " + $reportedUrl)
}
