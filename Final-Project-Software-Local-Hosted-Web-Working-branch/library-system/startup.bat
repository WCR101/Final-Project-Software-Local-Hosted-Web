@echo off
REM ═══════════════════════════════════════════════════════
REM Athenaeum Library System – Startup Script (Windows)
REM ═══════════════════════════════════════════════════════

echo.
echo ╔═══════════════════════════════════════════════════════╗
echo ║  Athenaeum Library Management System                  ║
echo ║  Starting up...                                        ║
echo ╚═══════════════════════════════════════════════════════╝
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Docker not found. Please install Docker Desktop:
  echo https://www.docker.com/products/docker-desktop
  pause
  exit /b 1
)

REM Create .env if it doesn't exist
if not exist .env (
  echo Creating .env from .env.example...
  copy .env.example .env >nul
  echo .env created with default values
  echo.
  echo Edit .env to customize ports or database credentials if needed
  echo.
)

REM Start Docker Compose
echo Starting containers...
docker compose up -d

REM Wait for services to be ready
echo.
echo Waiting for services to start (30-60 seconds)...
timeout /t 5 /nobreak

REM Check status
echo.
echo Container Status:
docker compose ps

REM Display access info
echo.
echo ╔═══════════════════════════════════════════════════════╗
echo ║  System is running!                                   ║
echo ║                                                       ║
echo ║  Web UI:        http://localhost:8080                ║
echo ║  Backend API:   http://localhost:4000                ║
echo ║  Database:      localhost:5432                       ║
echo ║                                                       ║
echo ║  Stop with:     docker compose down                  ║
echo ║  View logs:     docker compose logs                  ║
echo ╚═══════════════════════════════════════════════════════╝
echo.
pause
