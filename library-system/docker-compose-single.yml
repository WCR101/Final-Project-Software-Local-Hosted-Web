version: '3.8'

services:
  # Single all-in-one Athenaeum application
  athenaeum:
    image: wesrodd/athenaeum:latest
    restart: unless-stopped
    ports:
      - "8080:80"      # Frontend
      - "4000:4000"    # Backend API
      - "5432:5432"    # Database
      - "3001:3001"    # PostgREST
    environment:
      POSTGRES_USER: libraryuser
      POSTGRES_PASSWORD: librarypassword
      POSTGRES_DB: librarydb
      DB_HOST: localhost
      DB_PORT: 5432
      NODE_ENV: production
    volumes:
      - athenaeum_data:/var/lib/postgresql/data

volumes:
  athenaeum_data:
