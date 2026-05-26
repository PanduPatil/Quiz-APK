$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "app\backend"
$FrontendDir = Join-Path $Root "app\frontend"
$MongoDataDir = Join-Path $Root "mongo-data"

# 1. Detect if Python Virtual Env is available
$BackendPython = Join-Path $BackendDir ".venv\Scripts\python.exe"
if (-not (Test-Path $BackendPython)) {
    Write-Error "Backend Python virtual environment not found at: $BackendPython"
    Exit-1
}

# 2. Check if MongoDB is already running on port 27017
Write-Host "Checking if MongoDB is already active..." -ForegroundColor Cyan
$IsMongoActive = $false
try {
    $TcpClient = New-Object System.Net.Sockets.TcpClient
    $Connect = $TcpClient.BeginConnect("127.0.0.1", 27017, $null, $null)
    $Wait = $Connect.AsyncWaitHandle.WaitOne(1000, $false)
    if ($Wait -and $TcpClient.Connected) {
        $IsMongoActive = $true
        $TcpClient.EndConnect($Connect)
    }
    $TcpClient.Close()
} catch {
    # MongoDB is not listening
}

if ($IsMongoActive) {
    Write-Host "🟢 MongoDB is already running as a service or background process on port 27017." -ForegroundColor Green
} else {
    Write-Host "🟡 MongoDB is not running. Attempting to locate and launch mongod..." -ForegroundColor Yellow
    
    # Dynamically search for MongoDB across version numbers
    $MongoSearchPaths = @(
        "C:\Program Files\MongoDB\Server\*\bin\mongod.exe",
        "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe",
        "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe",
        "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe",
        "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
    )
    
    $MongoExe = $null
    foreach ($PathPattern in $MongoSearchPaths) {
        $Matches = Get-ChildItem -Path $PathPattern -ErrorAction SilentlyContinue
        if ($Matches) {
            $MongoExe = $Matches[0].FullName
            break
        }
    }
    
    if (-not $MongoExe) {
        Write-Error "Could not find MongoDB Server installation. Please install MongoDB or start the MongoDB Service manually."
        Exit-1
    }
    
    Write-Host "Found MongoDB at: $MongoExe" -ForegroundColor Cyan
    New-Item -ItemType Directory -Force -Path $MongoDataDir | Out-Null
    
    Write-Host "Starting MongoDB process..." -ForegroundColor Cyan
    Start-Process powershell.exe -ArgumentList @(
        "-NoExit",
        "-Command",
        "& `"$MongoExe`" --dbpath `"$MongoDataDir`" --bind_ip 127.0.0.1 --port 27017"
    )
    Start-Sleep -Seconds 3
}

# 3. Detect Node / npm
$NpmCmd = "npm"
if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
    # Attempt typical Node.js installation directory
    $NodeDir = "C:\Program Files\nodejs"
    $NpmPath = Join-Path $NodeDir "npm.cmd"
    if (Test-Path $NpmPath) {
        $env:PATH = "$NodeDir;$env:PATH"
        $NpmCmd = $NpmPath
    } else {
        Write-Error "npm was not found. Please install Node.js first."
        Exit-1
    }
}

# 4. Starting Backend
Write-Host "🚀 Starting Backend Server..." -ForegroundColor Cyan
Start-Process powershell.exe -WorkingDirectory $BackendDir -ArgumentList @(
    "-NoExit",
    "-Command",
    "& `"$BackendPython`" -m uvicorn server:app --host 127.0.0.1 --port 8000"
)
Start-Sleep -Seconds 2

# 5. Starting Frontend
Write-Host "🚀 Starting Frontend Dev Server..." -ForegroundColor Cyan
Start-Process powershell.exe -WorkingDirectory $FrontendDir -ArgumentList @(
    "-NoExit",
    "-Command",
    "& `"$NpmCmd`" start"
)

# 6. Final Wait and Launch Browser
Write-Host "⏳ Giving frontend a few seconds to warm up..." -ForegroundColor Yellow
Start-Sleep -Seconds 4
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "🎉 Quiz application started successfully!" -ForegroundColor Green
Write-Host "-------------------------------------------"
Write-Host "Frontend Dashboard:  http://localhost:3000"
Write-Host "Backend API Docs:    http://127.0.0.1:8000/docs"
Write-Host "-------------------------------------------"
Write-Host "Default Login Credentials:"
Write-Host "  Admin:   admin@quizapk.com / Admin@123"
Write-Host "  Student: student@quizapk.com / Student@123"
Write-Host ""
