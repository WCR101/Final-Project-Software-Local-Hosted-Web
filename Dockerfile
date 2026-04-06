FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    postgresql-14 \
    postgresql-contrib-14 \
    nodejs \
    npm \
    nginx \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Setup PostgreSQL
RUN mkdir -p /var/run/postgresql && chown postgres:postgres /var/run/postgresql

# Copy backend
COPY backend /app/backend
WORKDIR /app/backend
RUN npm install --omit=dev

# Copy frontend
COPY frontend /app/frontend

# Setup Nginx
RUN rm /etc/nginx/sites-enabled/default
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy database init
COPY supabase/init.sql /app/init.sql

# Copy startup script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 80 4000 5432 3001

ENTRYPOINT ["/app/docker-entrypoint.sh"]
