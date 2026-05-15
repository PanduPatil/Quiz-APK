$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "app\backend"
$FrontendDir = Join-Path $Root "app\frontend"
$MongoDataDir = Join-Path $Root "mongo-data"

$MongoExe = "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"
$NodeDir = "C:\Program Files\nodejs"
$NpmCmd = Join-Path $NodeDir "npm.cmd"
$BackendPython = Join-Path $BackendDir ".venv\Scripts\python.exe"

function Require-File($Path, $Name) {
    if (-not (Test-Path $Path)) {
        throw "$Name was not found at: $Path"
    }
}

Require-File $MongoExe "MongoDB"
Require-File $NpmCmd "npm"
Require-File $BackendPython "Backend Python virtual environment"

New-Item -ItemType Directory -Force -Path $MongoDataDir | Out-Null

$env:PATH = "$NodeDir;$env:PATH"

Write-Host "Starting MongoDB..."
Start-Process powershell.exe -ArgumentList @(
    "-NoExit",
    "-Command",
    "& `"$MongoExe`" --dbpath `"$MongoDataDir`" --bind_ip 127.0.0.1 --port 27017"
)

Start-Sleep -Seconds 3

Write-Host "Starting backend..."
Start-Process powershell.exe -WorkingDirectory $BackendDir -ArgumentList @(
    "-NoExit",
    "-Command",
    "& `"$BackendPython`" -m uvicorn server:app --host 127.0.0.1 --port 8000"
)

Start-Sleep -Seconds 3

Write-Host "Starting frontend..."
Start-Process powershell.exe -WorkingDirectory $FrontendDir -ArgumentList @(
    "-NoExit",
    "-Command",
    "npm start"
)

Start-Sleep -Seconds 5
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "Quiz app is starting."
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend:  http://127.0.0.1:8000/api/"
Write-Host ""
Write-Host "Login:"
Write-Host "Admin:   admin@quizapk.com / Admin@123"
Write-Host "Student: student@quizapk.com / Student@123"
