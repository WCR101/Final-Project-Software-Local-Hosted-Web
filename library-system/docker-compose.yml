version: "3.8"

services:
  # ─────────────────────────────────────────────
  # Supabase – PostgreSQL (core database)
  # ─────────────────────────────────────────────
  db:
    image: postgres:15-alpine
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-librarypassword}
      POSTGRES_DB: ${POSTGRES_DB:-librarydb}
      POSTGRES_USER: ${POSTGRES_USER:-libraryuser}
    volumes:
      - db_data:/var/lib/postgresql/data
      - ./supabase/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-libraryuser} -d ${POSTGRES_DB:-librarydb}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ─────────────────────────────────────────────
  # Supabase – PostgREST (auto REST API on top of Postgres)
  # ─────────────────────────────────────────────
  rest:
    image: postgrest/postgrest:v11.2.2
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "3001:3000"
    environment:
      PGRST_DB_URI: postgres://${POSTGRES_USER:-libraryuser}:${POSTGRES_PASSWORD:-librarypassword}@db:5432/${POSTGRES_DB:-librarydb}
      PGRST_DB_SCHEMA: public
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters}
      PGRST_DB_USE_LEGACY_GUCS: "false"

  # ─────────────────────────────────────────────
  # Node.js + Express – Custom API & Business Logic
  # ─────────────────────────────────────────────
  backend:
    image: wesrodd/athenaeum-backend:latest
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "4000:4000"
    environment:
      PORT: 4000
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: ${POSTGRES_DB:-librarydb}
      DB_USER: ${POSTGRES_USER:-libraryuser}
      DB_PASSWORD: ${POSTGRES_PASSWORD:-librarypassword}
      NODE_ENV: production

  # ─────────────────────────────────────────────
  # Nginx – Serves static frontend & reverse proxies API
  # ─────────────────────────────────────────────
  frontend:
    image: wesrodd/athenaeum-frontend:latest
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "8080:80"

volumes:
  db_data:
