#!/bin/bash
set -e

# Start PostgreSQL
echo "Starting PostgreSQL..."
service postgresql start
sleep 2

# Initialize database if needed
sudo -u postgres psql -U postgres -d postgres -f /app/init.sql 2>/dev/null || echo "Database already initialized"

# Start Node.js backend
echo "Starting backend API..."
cd /app/backend
PORT=4000 node server.js &
BACKEND_PID=$!

# Start Nginx frontend
echo "Starting Nginx frontend..."
service nginx start

# Start PostgREST
echo "Starting PostgREST..."
cd /app
postgrest --db-uri "postgresql://libraryuser:librarypassword@localhost:5432/librarydb" --db-schema public --db-anon-role anon --jwt-secret "super-secret-jwt-token-with-at-least-32-characters" --server-port 3001 &

# Keep container running
wait $BACKEND_PID
