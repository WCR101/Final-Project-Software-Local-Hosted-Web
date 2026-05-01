// ── Page Navigation ───────────────────────────────────────────────────
function navigateTo(pageKey) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById(`page-${pageKey}`)?.classList.add('active');
  document.querySelector(`[data-page="${pageKey}"]`)?.classList.add('active');

  // Load data for the page
  switch (pageKey) {
    case 'dashboard': loadDashboard(); break;
    case 'books':     loadBooks();     break;
    case 'patrons':   loadPatrons();   break;
    case 'loans':     loadLoans();     break;
    case 'overdue':   loadOverdue();   break;
    case 'fines':     loadFines();     break;
  }
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.page));
});

// ── Dashboard ─────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const data = await Stats.get();

    const grid = document.getElementById('statsGrid');
    grid.innerHTML = `
      <div class="stat-card accent">
        <div class="stat-value">${data.books.total}</div>
        <div class="stat-label">Total Books</div>
      </div>
      <div class="stat-card green">
        <div class="stat-value">${data.books.available}</div>
        <div class="stat-label">Available</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.books.checked_out}</div>
        <div class="stat-label">Checked Out</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.patrons.total}</div>
        <div class="stat-label">Total Patrons</div>
      </div>
      <div class="stat-card ${parseInt(data.overdue.count) > 0 ? 'red' : 'green'}">
        <div class="stat-value">${data.overdue.count}</div>
        <div class="stat-label">Overdue</div>
      </div>
      <div class="stat-card ${parseFloat(data.overdue.total_fines) > 0 ? 'orange' : 'green'}">
        <div class="stat-value">${fmtMoney(data.overdue.total_fines)}</div>
        <div class="stat-label">Fines Owed</div>
      </div>
    `;

    // Activity log
    const log = document.getElementById('activityLog');
    if (!data.recent_activity.length) {
      log.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-3);font-style:italic">No recent activity</div>';
      return;
    }
    log.innerHTML = data.recent_activity.map(a => `
      <div class="activity-item">
        <span class="activity-action ${a.action}">${a.action}</span>
        <span class="activity-desc">${esc(a.description || '')}</span>
        <span class="activity-time">${relTime(a.created_at)}</span>
      </div>
    `).join('');
  } catch (err) {
    document.getElementById('statsGrid').innerHTML =
      `<div style="grid-column:1/-1;padding:24px;text-align:center;color:var(--red)">Error: Could not load stats – ${err.message}</div>`;
  }
}

// ── Connection Check ──────────────────────────────────────────────────
async function initApp() {
  await checkConnection();
  setInterval(checkConnection, 30000);
  navigateTo('dashboard');
}

// ── Boot ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initApp);
