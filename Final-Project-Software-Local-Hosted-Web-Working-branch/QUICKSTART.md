# Athenaeum Library Management System – Quick Start

Get the library system running in 5 minutes on any computer.

## Prerequisites

- **Docker Desktop** installed and running
- That's it!

## Setup (One-Time)

### 1. Verify Docker is installed
```bash
docker --version
docker compose version
```

Should show versions. If not, install Docker Desktop from https://www.docker.com/products/docker-desktop

### 2. Navigate to the project folder
```bash
cd path/to/library-system
```

### 3. Create `.env` file
Copy `.env.example` to `.env` (or run the startup script below).

**Windows:**
```bash
copy .env.example .env
```

**Mac/Linux:**
```bash
cp .env.example .env
```

### 4. Start the system

**Windows:**
```bash
startup.bat
```

**Mac/Linux:**
```bash
./startup.sh
```

Or manually:
```bash
docker compose up -d
```

Wait 30-60 seconds for containers to start. Check status:
```bash
docker compose ps
```

All containers should show `Running` (except `db` may show `Restarting` briefly).

## Access the Application

- **Web UI**: http://localhost:8080
- **Backend API**: http://localhost:4000
- **Database**: localhost:5432 (admin only)

## Verify It Works

1. Open http://localhost:8080 in your browser
2. You should see the Athenaeum dashboard with books and patrons
3. Try adding a book or patron

## Stop the System

```bash
docker compose down
```

## Troubleshooting

### Port Already in Use
If ports 8080, 4000, or 5432 are taken, edit `.env`:
```env
FRONTEND_PORT=8081
BACKEND_PORT=4001
DB_PORT=5433
```

Then restart:
```bash
docker compose down
docker compose up -d
```

### Containers won't start
Check logs:
```bash
docker compose logs
```

Most issues: Docker daemon not running, or insufficient disk space. Restart Docker Desktop.

### Data persists between restarts
Database volume persists. To reset everything:
```bash
docker compose down -v
docker compose up -d
```

⚠️ This deletes all data!

### Can't connect to http://localhost:8080
- Wait 30 seconds - containers take time to start
- Check `docker compose ps` - all should be `Running`
- Try http://127.0.0.1:8080 instead
- Check firewall isn't blocking port 8080

## Environment Variables

Edit `.env` to customize:
- `POSTGRES_USER` – Database user (default: libraryuser)
- `POSTGRES_PASSWORD` – Database password (default: librarypassword)
- `BACKEND_PORT` – API port (default: 4000)
- `FRONTEND_PORT` – Web port (default: 8080)

## Architecture

- **Frontend** (Nginx): Web UI at port 8080
- **Backend** (Node.js): REST API at port 4000
- **Database** (PostgreSQL): Port 5432
- **PostgREST**: Auto-generated API at port 3001

All containerized with Docker Compose.

## Production Notes

This setup is for **local development only**. For production:
- Use strong database passwords
- Deploy on Docker Swarm or Kubernetes
- Add SSL/TLS certificates
- Set up proper backups
- Configure resource limits

## Need Help?

1. Check Docker is running
2. Run `docker compose logs`
3. Verify all files exist: `.env`, `docker-compose.yml`, `frontend/`, `backend/`, `supabase/`
4. Restart Docker Desktop

---

**Athenaeum v1.0** | Library Management System
