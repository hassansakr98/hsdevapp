# Build the app and package it for cPanel "Setup Node.js App" (Passenger).
# Run from the project folder:  powershell -ExecutionPolicy Bypass -File deploy\package-cpanel.ps1
# Output: hsdevapp-cpanel.zip  (upload to the server and extract into the Application root)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

npm run build
if ($LASTEXITCODE -ne 0) { throw "build failed" }

$out = "deploy\cpanel-build"
if (Test-Path $out) { Remove-Item -Recurse -Force $out }
Copy-Item -Recurse .next\standalone $out
Copy-Item -Recurse .next\static "$out\.next\static"
Copy-Item -Recurse public "$out\public"
# never ship local data or secrets
Remove-Item -Recurse -Force "$out\data", "$out\.env*" -ErrorAction SilentlyContinue

if (Test-Path hsdevapp-cpanel.zip) { Remove-Item hsdevapp-cpanel.zip }
# tar (built into Windows) writes forward-slash paths that Linux extracts correctly
tar -a -c -f hsdevapp-cpanel.zip -C $out .
Write-Host "Created hsdevapp-cpanel.zip ($([math]::Round((Get-Item hsdevapp-cpanel.zip).Length / 1MB, 1)) MB)"
