# 🚀 Athenaeum Library System – Universal Deployment Guide

Your library system is **fully containerized and ready to deploy anywhere**.

## ✅ What's Deployed

Your Docker Hub images are live and tested:
- **Backend**: https://hub.docker.com/r/wesrodd/athenaeum-backend:latest
- **Frontend**: https://hub.docker.com/r/wesrodd/athenaeum-frontend:latest

Both images include:
- ✓ All source code
- ✓ All dependencies
- ✓ API proxy configuration
- ✓ Professional dark UI
- ✓ Complete input validation
- ✓ Bulletproof data protection

## 📦 Quick Deploy (Any Computer/OS)

### Prerequisites
- Docker Desktop installed (https://www.docker.com/products/docker-desktop)

### 3-Step Setup

**1. Get the project files**
```bash
# Clone or download the library-system folder
cd library-system
```

**2. Create environment file**
```bash
cp .env.example .env
```

**3. Start everything**
```bash
docker compose up -d
```

Access: **http://localhost:8080**

## 🎯 What Works Out of the Box

- ✓ Web UI with professional dark theme
- ✓ Full CRUD operations (Create, Read, Update, Delete)
- ✓ Book management with unique ISBN tracking
- ✓ Patron management with formatted phone numbers
- ✓ Loan checkout/checkin/renew system
- ✓ Overdue detection and fine calculation
- ✓ Payment recording
- ✓ Audit log of all actions
- ✓ Bulletproof input validation
- ✓ Prevention of orphaned data (can't delete books with loans or patrons with checkouts)

## 🔗 Access Points

- **Web App**: http://localhost:8080
- **Backend API**: http://localhost:4000
- **REST API**: http://localhost:3001
- **Database**: localhost:5432
  - User: `libraryuser`
  - Password: `librarypassword`
  - DB: `librarydb`

## 📁 Project Structure

```
library-system/
├── docker-compose.yml       ✓ Pulls images from Docker Hub
├── .env.example             ✓ Configuration template
├── .env                     ✓ Local settings (create from template)
├── startup.bat              ✓ Windows launcher
├── startup.sh               ✓ Mac/Linux launcher
├── QUICKSTART.md            ✓ Detailed setup
├── README.md                ✓ Full documentation
├── frontend/                ✓ Web UI (containerized)
├── backend/                 ✓ Node.js API (containerized)
└── supabase/init.sql        ✓ Database schema (auto-init)
```

## 🛠️ Common Tasks

### Start the system
```bash
docker compose up -d
```

### Stop the system
```bash
docker compose down
```

### View running containers
```bash
docker compose ps
```

### Check logs
```bash
docker compose logs backend
docker compose logs frontend
docker compose logs db
```

### Reset everything (delete all data)
```bash
docker compose down -v
docker compose up -d
```

### Use different ports
Edit `.env`:
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

## 🔒 Security Features

✓ All user inputs validated (frontend + backend)
✓ XSS prevention (dangerous characters removed)
✓ SQL injection protection (parameterized queries)
✓ Phone numbers auto-formatted and validated
✓ Email validation
✓ ISBN format enforcement
✓ Money amounts clamped to valid ranges
✓ Loan period limited to 1-90 days
✓ Prevents deletion of checked-out books
✓ Prevents deletion of patrons with active loans
✓ Unique ISBN per book copy

## 📊 Data Validation

All inputs validated both client-side and server-side:

| Field | Validation |
|-------|-----------|
| Phone | 10 digits only, auto-formatted to XXX-XXX-XXXX |
| Names | Letters/spaces/hyphens, max 100 chars |
| Email | Valid email format required |
| ISBN | Numbers/hyphens only, max 20 chars |
| Cost | 0-9999.99, exactly 2 decimals |
| Loan Days | 1-90 days only |
| Fine Amount | 0.01-99999.99 |
| Text Fields | Max lengths enforced, XSS chars removed |

## 🐳 Docker Images

Both images built and pushed to Docker Hub:

```bash
# These pull automatically with docker compose:
wesrodd/athenaeum-backend:latest    (227 MB)
wesrodd/athenaeum-frontend:latest   (92.8 MB)
```

No building needed on other computers – just pull and run!

## 🚀 Deploy to Production

For production servers (AWS, Google Cloud, Azure, DigitalOcean, etc.):

1. Install Docker on your server
2. Copy `library-system` folder to server
3. Edit `.env` with strong passwords
4. Run `docker compose up -d`
5. Configure reverse proxy (nginx/Traefik) for SSL
6. Set up automated backups of `db_data` volume

Example: DigitalOcean App Platform, AWS ECS, Heroku, Railway, etc.

## 📱 Multi-Machine Setup

Same process on any computer:
```bash
# Machine 1, 2, 3, ... N
cd library-system
docker compose up -d
```

Each runs independently with its own database.

## ✨ Features Summary

### Dashboard
- Real-time statistics (total books, available, checked out, patrons, overdue, fines)
- Recent activity log
- One-click refresh

### Books
- Add/edit/delete books
- Track ISBN uniquely per copy
- Track cost and status (IN/OUT/LOST)
- Search by title, author, ISBN
- Prevent deletion of checked-out books

### Patrons
- Add/edit/delete patrons
- Phone numbers auto-formatted
- Membership types (STANDARD/PREMIUM/STUDENT/SENIOR)
- Track books checked out (max 6)
- Prevent deletion if they have active loans

### Loans
- Checkout books to patrons
- Checkin returned books
- Renew loans (14 days)
- Mark lost (charge replacement fee)
- Filter by status (ACTIVE/OVERDUE/RETURNED/LOST)

### Overdue
- Auto-detect overdue books
- Show days overdue
- Show accrued fines
- Actions: checkin, renew, mark lost

### Fines
- Track outstanding fines per patron
- Record fine payments
- View payment history
- Update patron balance automatically

## 🐛 Troubleshooting

### Port already in use
Edit `.env` and change ports, then restart

### Can't connect to http://localhost:8080
- Wait 30 seconds for containers to start
- Check `docker compose ps` – all should show "Running"
- Restart Docker Desktop

### Database errors
```bash
docker compose logs db
```

Usually means database wasn't initialized. Reset with:
```bash
docker compose down -v
docker compose up -d
```

### API returns errors
Check backend logs:
```bash
docker compose logs backend
```

## 📞 Support

**Quick Help:**
```bash
docker compose ps              # Check container status
docker compose logs            # View all logs
docker compose logs backend    # View backend logs only
docker system prune            # Clean up unused images/volumes
```

## 🎓 Educational Value

Perfect for learning:
- Docker & containerization
- Full-stack development
- REST API design
- Database management
- Input validation & security
- Professional UI design
- Production-ready architecture

## 📄 License

Use for educational and personal projects.

---

**Athenaeum v1.0** | Professional Library Management System
🚀 **Production Ready** | 🐳 **Fully Containerized** | 🌍 **Deploy Anywhere**

Last Updated: 2026-03-31
Your Docker Hub: https://hub.docker.com/u/wesrodd
