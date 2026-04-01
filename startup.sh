#!/bin/bash
# ═══════════════════════════════════════════════════════
# Athenaeum Library System – Startup Script (Mac/Linux)
# ═══════════════════════════════════════════════════════

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Athenaeum Library Management System                  ║"
echo "║  Starting up...                                        ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "ERROR: Docker not found. Please install Docker Desktop:"
  echo "https://www.docker.com/products/docker-desktop"
  exit 1
fi

# Create .env if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
  echo ".env created with default values"
  echo ""
  echo "Edit .env to customize ports or database credentials if needed"
  echo ""
fi

# Start Docker Compose
echo "Starting containers..."
docker compose up -d

# Wait for services
echo ""
echo "Waiting for services to start (30-60 seconds)..."
sleep 5

# Check status
echo ""
echo "Container Status:"
docker compose ps

# Display access info
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  System is running!                                   ║"
echo "║                                                       ║"
echo "║  Web UI:        http://localhost:8080                ║"
echo "║  Backend API:   http://localhost:4000                ║"
echo "║  Database:      localhost:5432                       ║"
echo "║                                                       ║"
echo "║  Stop with:     docker compose down                  ║"
echo "║  View logs:     docker compose logs                  ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
