# Athenaeum Library Management System

A professional library management system built with Docker, Node.js, PostgreSQL, and modern web technologies.

## Quick Start (5 Minutes)

### Requirements
- **Docker Desktop** installed (any OS: Windows, Mac, Linux)
- That's it!

### Start the System

**Windows:**
```bash
startup.bat
```

**Mac/Linux:**
```bash
chmod +x startup.sh
./startup.sh
```

Or manually on any OS:
```bash
cp .env.example .env
docker compose up -d
```

### Access

- **Web UI**: http://localhost:8080
- **Backend API**: http://localhost:4000
- **Database**: localhost:5432 (libraryuser / librarypassword)

## Features

✓ Full library management system
✓ Book catalog with ISBN tracking
✓ Patron management
✓ Loan tracking (checkout/checkin/renew)
✓ Overdue book detection
✓ Fine calculation and payment recording
✓ Audit log for all actions
✓ Professional dark UI
✓ Input validation (bulletproof forms)
✓ No duplicate books (unique ISBN per copy)
✓ Prevents deletion of checked-out books/patrons
✓ Fully containerized with Docker

## Architecture

```
┌─────────────────────────────────────────┐
│         Nginx Frontend (Port 8080)      │
│      (React-like vanilla JS UI)         │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│    Node.js Backend API (Port 4000)      │
│      (Express REST endpoints)           │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│     PostgreSQL Database (Port 5432)     │
│    (Full schema with audit logging)     │
└─────────────────────────────────────────┘
```

All services run in Docker containers and communicate via Docker network.

## Project Structure

```
library-system/
├── docker-compose.yml          # Container orchestration
├── .env.example                # Environment template
├── .env                        # Local config (create from .env.example)
├── QUICKSTART.md               # Detailed setup guide
├── startup.bat                 # Windows launcher
├── startup.sh                  # Mac/Linux launcher
│
├── frontend/                   # Web UI (Nginx)
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js              # Main app logic
│       ├── api.js              # API client
│       ├── ui.js               # UI utilities + validation
│       ├── books.js
│       ├── patrons.js
│       └── loans.js
│
├── backend/                    # Node.js API (Express)
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js               # Main server
│   ├── db.js                   # Database connection
│   └── routes/
│       ├── books.js            # Book CRUD + validation
│       ├── patrons.js          # Patron CRUD + phone formatting
│       ├── loans.js            # Loan management
│       └── fines.js            # Fine tracking
│
├── supabase/                   # Database schema
│   └── init.sql                # PostgreSQL initialization
│
└── README.md (this file)
```

## Configuration

Edit `.env` to customize:

```env
POSTGRES_USER=libraryuser
POSTGRES_PASSWORD=librarypassword
POSTGRES_DB=librarydb
DB_PORT=5432
BACKEND_PORT=4000
FRONTEND_PORT=8080
POSTGREST_PORT=3001
```

Then restart:
```bash
docker compose down
docker compose up -d
```

## Database Schema

### Tables
- `books` – Book catalog (title, author, ISBN, cost, status)
- `patrons` – Library members (name, email, phone, membership type)
- `loans` – Checkout records (book, patron, due date, fine amount)
- `fine_payments` – Payment history
- `audit_log` – All system changes (create/update/delete/checkout/checkin)

### Key Constraints
- Books cannot be deleted if checked out
- Patrons cannot be deleted if they have active loans
- Phone numbers auto-formatted to XXX-XXX-XXXX
- All monetary values clamped to valid ranges
- ISBN max 20 characters (numbers + hyphens only)

## Input Validation

All user inputs validated both frontend and backend:
- ✓ Phone numbers: 10 digits only, auto-formatted
- ✓ Names: Letters/spaces/hyphens only, max 100 chars
- ✓ Email: Valid format required
- ✓ ISBN: Numbers/hyphens only, max 20 chars
- ✓ Cost/Fines: 0 to 9999.99, exactly 2 decimals
- ✓ Loan days: 1 to 90 only
- ✓ Text fields: Max lengths enforced, XSS chars removed
- ✓ Duplicate books allowed: Different ISBN = different copy

## Commands

### Start/Stop
```bash
docker compose up -d          # Start all services
docker compose down           # Stop all services
docker compose down -v        # Stop & delete all data 
```

### Logs & Status
```bash
docker compose ps             # Show running containers
docker compose logs           # View all logs
docker compose logs backend   # View specific service logs
```

### Rebuild
```bash
docker compose up --build     # Rebuild from source
docker compose up --build -d  # Rebuild + start in background
```

### Access Services
```bash
# Database CLI
docker compose exec db psql -U libraryuser -d librarydb

# Backend shell
docker compose exec backend sh

# Frontend shell
docker compose exec frontend sh
```

## Troubleshooting

### Port Already in Use
```bash
# Edit .env
FRONTEND_PORT=8081
BACKEND_PORT=4001
DB_PORT=5433

# Restart
docker compose down
docker compose up -d
```

### Containers Won't Start
```bash
docker compose logs          # Check error messages
docker system df             # Check disk space
docker system prune          # Clean up
```

### Reset Everything
```bash
docker compose down -v       # Delete volumes
docker compose up -d         # Fresh start
```

### Can't Connect to http://localhost:8080
- Wait 30 seconds (containers take time to start)
- Check `docker compose ps` – all should say "Running"
- Try http://127.0.0.1:8080 instead
- Restart Docker Desktop

## Usage Examples

### Add a Book
1. Go to http://localhost:8080
2. Click "Books" tab
3. Click "+ Add Book"
4. Fill in: Title, Author, ISBN (optional), Cost (optional)
5. Click "Save Book"

### Checkout a Book
1. Go to "Loans" tab
2. Click "Check Out"
3. Select patron & book
4. Set loan period (1-90 days)
5. Click "Check Out"

### Record a Fine Payment
1. Go to "Fines" tab
2. Click "Record Payment" for patron with outstanding fines
3. Enter amount and optional note
4. Click "Record Payment"

## API Endpoints

All available at http://localhost:4000

### Books
- `GET /api/books` – List all books
- `GET /api/books/:id` – Get one book
- `POST /api/books` – Create book
- `PUT /api/books/:id` – Update book
- `DELETE /api/books/:id` – Delete book (only if not checked out)

### Patrons
- `GET /api/patrons` – List all patrons
- `GET /api/patrons/:id` – Get one patron
- `POST /api/patrons` – Create patron
- `PUT /api/patrons/:id` – Update patron
- `DELETE /api/patrons/:id` – Delete patron (only if no active loans)
- `POST /api/patrons/:id/pay-fine` – Record fine payment

### Loans
- `GET /api/loans` – List all loans
- `GET /api/loans/overdue` – List overdue loans
- `POST /api/loans/checkout` – Create checkout
- `POST /api/loans/:id/checkin` – Check in book
- `POST /api/loans/:id/renew` – Renew loan (14 days)
- `POST /api/loans/:id/lost` – Mark book lost

## Security Notes

This is a **local development system**. For production:
- Use strong database passwords
- Enable SSL/TLS
- Add authentication (JWT)
- Deploy on Kubernetes/Swarm
- Set up automated backups
- Use environment-specific configs
- Add rate limiting
- Implement CORS properly

## Browser Compatibility

Tested on:
- ✓ Chrome/Chromium 90+
- ✓ Firefox 88+
- ✓ Safari 14+
- ✓ Edge 90+

## License

Local development system. Use as you wish.

## Support

**Immediate Help:**
```bash
docker compose logs          # See what's wrong
docker compose ps            # Check container status
```

**Common Issues:**
1. Docker not running → Start Docker Desktop
2. Port in use → Change in .env
3. No internet after start → Networks are isolated by design
4. Data lost → You ran `docker compose down -v`

---

**Athenaeum v1.0** | Professional Library Management  
Ready to run anywhere Docker is installed ✓
