# 📚 Athenaeum – Library Management System

A full-stack, Dockerized library management web app built with:

- **Database** – Supabase-compatible PostgreSQL (runs locally in Docker)
- **Backend** – Node.js + Express REST API
- **Frontend** – Vanilla HTML/CSS/JS served by Nginx
- **Orchestration** – Docker Compose

---

## 🗂 Project Structure

```
library-system/
├── docker-compose.yml        # All services
├── nginx.conf                # Frontend reverse proxy
├── .env                      # Environment variables
├── supabase/
│   └── init.sql              # Schema + seed data
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js             # Express entry point
│   ├── db.js                 # PostgreSQL pool
│   └── routes/
│       ├── books.js
│       ├── patrons.js
│       ├── loans.js
│       ├── stats.js
│       └── fines.js
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── api.js
        ├── ui.js
        ├── books.js
        ├── patrons.js
        ├── loans.js
        └── app.js
```

---

## 🚀 Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### 1. Start everything

```bash
cd library-system
docker compose up --build
```

First run takes ~2 minutes to pull images and initialize the database.

### 2. Open the app

| Service    | URL                        |
|------------|---------------------------|
| **Web App**| http://localhost:8080      |
| **API**    | http://localhost:4000/api  |
| **PostgREST** | http://localhost:3001   |
| **Database** | localhost:5432           |

---

## ⚙️ Environment Variables (`.env`)

| Variable            | Default           | Description                  |
|---------------------|-------------------|------------------------------|
| `POSTGRES_USER`     | `libraryuser`     | DB username                  |
| `POSTGRES_PASSWORD` | `librarypassword` | DB password                  |
| `POSTGRES_DB`       | `librarydb`       | Database name                |
| `JWT_SECRET`        | *(change this)*   | Secret for PostgREST JWT     |
| `PORT`              | `4000`            | Backend API port             |

---

## 🔌 API Reference

### Books
| Method | Endpoint             | Description              |
|--------|----------------------|--------------------------|
| GET    | `/api/books`         | List all (filterable)    |
| GET    | `/api/books/:id`     | Get single book          |
| POST   | `/api/books`         | Create book              |
| PUT    | `/api/books/:id`     | Update book              |
| DELETE | `/api/books/:id`     | Delete book              |

### Patrons
| Method | Endpoint                    | Description             |
|--------|-----------------------------|-------------------------|
| GET    | `/api/patrons`              | List all                |
| GET    | `/api/patrons/:id`          | Get single patron       |
| GET    | `/api/patrons/:id/loans`    | Get patron's loans      |
| POST   | `/api/patrons`              | Create patron           |
| PUT    | `/api/patrons/:id`          | Update patron           |
| DELETE | `/api/patrons/:id`          | Delete patron           |
| POST   | `/api/patrons/:id/pay-fine` | Record fine payment     |

### Loans
| Method | Endpoint               | Description                     |
|--------|------------------------|---------------------------------|
| GET    | `/api/loans`           | List all (filterable by status) |
| GET    | `/api/loans/overdue`   | List overdue loans              |
| POST   | `/api/loans/checkout`  | Check out a book                |
| POST   | `/api/loans/checkin`   | Return a book                   |
| POST   | `/api/loans/:id/renew` | Extend loan by 14 days          |
| POST   | `/api/loans/:id/lost`  | Mark book as lost               |

### Stats & Fines
| Method | Endpoint          | Description                  |
|--------|-------------------|------------------------------|
| GET    | `/api/stats`      | Dashboard summary            |
| GET    | `/api/fines`      | Patrons with outstanding fines |
| GET    | `/api/fines/payments` | Payment history          |
| GET    | `/api/health`     | Health check                 |

---

## 📋 Business Rules

- **Max 6 books** per patron checked out at once
- **Outstanding fines** block checkout
- **$0.50/day** fine for overdue books
- **Lost books** charge the book's replacement cost
- Fines auto-calculate on every API call via SQL trigger
- 14-day default loan period (configurable per checkout)

---

## 🛠 Development

### Run backend locally (without Docker)

```bash
cd backend
npm install
# Set your DB env vars or use a .env file
node server.js
```

### Stop all containers

```bash
docker compose down
```

### Reset database (⚠ deletes all data)

```bash
docker compose down -v
docker compose up --build
```

### View logs

```bash
docker compose logs -f backend
docker compose logs -f db
```

### Connect to DB directly

```bash
docker exec -it $(docker compose ps -q db) \
  psql -U libraryuser -d librarydb
```

---

## 🔧 Connecting to Supabase Cloud (Optional)

If you want to use Supabase cloud instead of the local Postgres container:

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/init.sql` in the Supabase SQL editor
3. Update `.env` with your Supabase connection string:
   ```
   DB_HOST=db.your-project.supabase.co
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=your-supabase-password
   ```
4. Comment out the `db:` and `rest:` services in `docker-compose.yml`
5. Run `docker compose up --build backend frontend`
