<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Athenaeum · Library Management</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css"/>
</head>
<body>

<!-- ═══════════════ SIDEBAR ═══════════════ -->
<aside class="sidebar">
  <div class="sidebar-brand">
    <button class="brand-name" onclick="navigateTo('dashboard')">Athenaeum</button>
    <div class="brand-sub">Library System</div>
  </div>

  <nav class="sidebar-nav">
    <button class="nav-item active" data-page="dashboard">
      <span class="nav-icon">—</span> Dashboard
    </button>
    <button class="nav-item" data-page="books">
      <span class="nav-icon">≡</span> Books
    </button>
    <button class="nav-item" data-page="patrons">
      <span class="nav-icon">∘</span> Patrons
    </button>
    <button class="nav-item" data-page="loans">
      <span class="nav-icon">↔</span> Loans
    </button>
    <button class="nav-item" data-page="overdue">
      <span class="nav-icon">!</span> Overdue
    </button>
    <button class="nav-item" data-page="fines">
      <span class="nav-icon">¢</span> Fines
    </button>
  </nav>

  <div class="sidebar-footer">
    <div class="connection-status" id="connStatus">
      <span class="dot"></span> Connecting…
    </div>
  </div>
</aside>

<!-- ═══════════════ MAIN ═══════════════ -->
<main class="main-content">

  <!-- Toast -->
  <div id="toast" class="toast"></div>

  <!-- ── DASHBOARD ── -->
  <section id="page-dashboard" class="page active">
    <header class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Library at a glance</p>
      </div>
      <button class="btn btn-ghost" onclick="loadDashboard()">⟳ Refresh</button>
    </header>

    <div class="stats-grid" id="statsGrid">
      <div class="stat-card skeleton"></div>
      <div class="stat-card skeleton"></div>
      <div class="stat-card skeleton"></div>
      <div class="stat-card skeleton"></div>
      <div class="stat-card skeleton"></div>
      <div class="stat-card skeleton"></div>
    </div>

    <div class="dashboard-lower">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Recent Activity</h2>
        </div>
        <div id="activityLog" class="activity-log"></div>
      </div>
    </div>
  </section>

  <!-- ── BOOKS ── -->
  <section id="page-books" class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Books</h1>
        <p class="page-subtitle">Manage the collection</p>
      </div>
      <button class="btn btn-primary" onclick="openModal('bookModal')">+ Add Book</button>
    </header>

    <div class="toolbar">
      <input class="search-input" id="bookSearch" placeholder="Search by title, author, or ISBN…" oninput="debounce(loadBooks,400)()"/>
      <select class="filter-select" id="bookStatusFilter" onchange="loadBooks()">
        <option value="">All statuses</option>
        <option value="IN">Available (IN)</option>
        <option value="OUT">Checked Out</option>
        <option value="LOST">Lost</option>
      </select>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th><th>Title</th><th>Author</th><th>ISBN</th>
            <th>Cost</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody id="booksTable"></tbody>
      </table>
    </div>
  </section>

  <!-- ── PATRONS ── -->
  <section id="page-patrons" class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Patrons</h1>
        <p class="page-subtitle">Manage library members</p>
      </div>
      <button class="btn btn-primary" onclick="openModal('patronModal')">+ Add Patron</button>
    </header>

    <div class="toolbar">
      <input class="search-input" id="patronSearch" placeholder="Search by name or email…" oninput="debounce(loadPatrons,400)()"/>
      <select class="filter-select" id="patronActiveFilter" onchange="loadPatrons()">
        <option value="">All patrons</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Email</th><th>Phone</th>
            <th>Books Out</th><th>Fine</th><th>Membership</th><th>Actions</th>
          </tr>
        </thead>
        <tbody id="patronsTable"></tbody>
      </table>
    </div>
  </section>

  <!-- ── LOANS ── -->
  <section id="page-loans" class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Loans</h1>
        <p class="page-subtitle">Checkout &amp; check-in</p>
      </div>
      <button class="btn btn-primary" onclick="openModal('checkoutModal')">→ Check Out</button>
    </header>

    <div class="toolbar">
      <select class="filter-select" id="loanStatusFilter" onchange="loadLoans()">
        <option value="">All loans</option>
        <option value="ACTIVE">Active</option>
        <option value="OVERDUE">Overdue</option>
        <option value="RETURNED">Returned</option>
        <option value="LOST">Lost</option>
      </select>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th><th>Book</th><th>Patron</th><th>Checked Out</th>
            <th>Due Date</th><th>Status</th><th>Fine</th><th>Actions</th>
          </tr>
        </thead>
        <tbody id="loansTable"></tbody>
      </table>
    </div>
  </section>

  <!-- ── OVERDUE ── -->
  <section id="page-overdue" class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Overdue Books</h1>
        <p class="page-subtitle">Items past their due date</p>
      </div>
      <button class="btn btn-ghost" onclick="loadOverdue()">⟳ Refresh</button>
    </header>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Loan ID</th><th>Book</th><th>Patron</th><th>Email</th>
            <th>Due Date</th><th>Days Overdue</th><th>Fine Accrued</th><th>Actions</th>
          </tr>
        </thead>
        <tbody id="overdueTable"></tbody>
      </table>
    </div>
  </section>

  <!-- ── FINES ── -->
  <section id="page-fines" class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Fines</h1>
        <p class="page-subtitle">Outstanding balances &amp; payments</p>
      </div>
      <button class="btn btn-ghost" onclick="loadFines()">⟳ Refresh</button>
    </header>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Patron</th><th>Email</th><th>Phone</th>
            <th>Overdue Loans</th><th>Balance Owed</th><th>Actions</th>
          </tr>
        </thead>
        <tbody id="finesTable"></tbody>
      </table>
    </div>
  </section>

</main>

<!-- ════════════════ MODALS ════════════════ -->

<!-- Book Modal -->
<div class="modal-overlay" id="bookModal">
  <div class="modal">
    <div class="modal-header">
      <h2 class="modal-title" id="bookModalTitle">Add Book</h2>
      <button class="modal-close" onclick="closeModal('bookModal')">×</button>
    </div>
    <form id="bookForm" onsubmit="submitBook(event)">
      <input type="hidden" id="bookId"/>
      <div class="form-grid">
        <div class="form-group span-2">
          <label class="form-label">Title *</label>
          <input class="form-input" id="bookTitle" required placeholder="Book title" maxlength="255"/>
        </div>
        <div class="form-group span-2">
          <label class="form-label">Author *</label>
          <input class="form-input" id="bookAuthor" required placeholder="Author name" maxlength="255"/>
        </div>
        <div class="form-group">
          <label class="form-label">ISBN</label>
          <input class="form-input" id="bookISBN" placeholder="978-..." maxlength="20"/>
        </div>
        <div class="form-group">
          <label class="form-label">Cost ($)</label>
          <input class="form-input" id="bookCost" type="number" min="0" max="9999.99" step="0.01" placeholder="0.00"/>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-input" id="bookStatus">
            <option value="IN">IN – Available</option>
            <option value="OUT">OUT – Checked Out</option>
            <option value="LOST">LOST</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" onclick="closeModal('bookModal')">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Book</button>
      </div>
    </form>
  </div>
</div>

<!-- Patron Modal -->
<div class="modal-overlay" id="patronModal">
  <div class="modal">
    <div class="modal-header">
      <h2 class="modal-title" id="patronModalTitle">Add Patron</h2>
      <button class="modal-close" onclick="closeModal('patronModal')">×</button>
    </div>
    <form id="patronForm" onsubmit="submitPatron(event)">
      <input type="hidden" id="patronId"/>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">First Name *</label>
          <input class="form-input" id="patronFirstName" required maxlength="100"/>
        </div>
        <div class="form-group">
          <label class="form-label">Last Name *</label>
          <input class="form-input" id="patronLastName" required maxlength="100"/>
        </div>
        <div class="form-group span-2">
          <label class="form-label">Email</label>
          <input class="form-input" id="patronEmail" type="email" maxlength="255"/>
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input class="form-input" id="patronPhone" type="tel" placeholder="555-123-4567" maxlength="14"/>
        </div>
        <div class="form-group">
          <label class="form-label">Membership</label>
          <select class="form-input" id="patronMembership">
            <option value="STANDARD">Standard</option>
            <option value="PREMIUM">Premium</option>
            <option value="STUDENT">Student</option>
            <option value="SENIOR">Senior</option>
          </select>
        </div>
        <div class="form-group span-2">
          <label class="form-label">Address</label>
          <input class="form-input" id="patronAddress" maxlength="255"/>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" onclick="closeModal('patronModal')">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Patron</button>
      </div>
    </form>
  </div>
</div>

<!-- Checkout Modal -->
<div class="modal-overlay" id="checkoutModal">
  <div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">Check Out Book</h2>
      <button class="modal-close" onclick="closeModal('checkoutModal')">×</button>
    </div>
    <form onsubmit="submitCheckout(event)">
      <div class="form-grid">
        <div class="form-group span-2">
          <label class="form-label">Patron *</label>
          <select class="form-input" id="checkoutPatron" required>
            <option value="">Select a patron…</option>
          </select>
        </div>
        <div class="form-group span-2">
          <label class="form-label">Book *</label>
          <select class="form-input" id="checkoutBook" required>
            <option value="">Select a book…</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Loan Period (days)</label>
          <input class="form-input" id="checkoutDays" type="number" min="1" max="90" step="1" value="14"/>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" onclick="closeModal('checkoutModal')">Cancel</button>
        <button type="submit" class="btn btn-primary">Check Out</button>
      </div>
    </form>
  </div>
</div>

<!-- Pay Fine Modal -->
<div class="modal-overlay" id="payFineModal">
  <div class="modal modal-sm">
    <div class="modal-header">
      <h2 class="modal-title">Record Fine Payment</h2>
      <button class="modal-close" onclick="closeModal('payFineModal')">×</button>
    </div>
    <form onsubmit="submitPayFine(event)">
      <input type="hidden" id="payFinePatronId"/>
      <div class="form-group">
        <label class="form-label">Amount ($) *</label>
        <input class="form-input" id="payFineAmount" type="number" min="0.01" max="99999.99" step="0.01" required/>
      </div>
      <div class="form-group">
        <label class="form-label">Note</label>
        <input class="form-input" id="payFineNote" placeholder="Optional note" maxlength="255"/>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" onclick="closeModal('payFineModal')">Cancel</button>
        <button type="submit" class="btn btn-primary">Record Payment</button>
      </div>
    </form>
  </div>
</div>

<!-- Confirm Dialog -->
<div class="modal-overlay" id="confirmModal">
  <div class="modal modal-sm">
    <div class="modal-header">
      <h2 class="modal-title" id="confirmTitle">Confirm</h2>
      <button class="modal-close" onclick="closeModal('confirmModal')">×</button>
    </div>
    <p id="confirmMessage" class="confirm-message"></p>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('confirmModal')">Cancel</button>
      <button class="btn btn-danger" id="confirmBtn">Confirm</button>
    </div>
  </div>
</div>

<script src="js/api.js"></script>
<script src="js/ui.js"></script>
<script src="js/books.js"></script>
<script src="js/patrons.js"></script>
<script src="js/loans.js"></script>
<script src="js/app.js"></script>
</body>
</html>
