// ── Toast ────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 3200);
}

// ── Modal ────────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Close on backdrop click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// Confirm dialog helper
function confirmAction(title, message, onConfirm) {
  document.getElementById('confirmTitle').textContent   = title;
  document.getElementById('confirmMessage').textContent = message;
  const btn = document.getElementById('confirmBtn');
  const fresh = btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh, btn);
  fresh.addEventListener('click', () => {
    closeModal('confirmModal');
    onConfirm();
  });
  openModal('confirmModal');
}

// ── Debounce ─────────────────────────────────────────────────────────
function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// ── Date helpers ─────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(dateStr) {
  const due  = new Date(dateStr);
  const now  = new Date();
  due.setHours(12,0,0,0); now.setHours(12,0,0,0);
  return Math.round((due - now) / 86400000);
}

// ── Status badge helpers ─────────────────────────────────────────────
function bookStatusBadge(status) {
  const map = { IN: 'badge-green', OUT: 'badge-blue', LOST: 'badge-red' };
  return `<span class="badge ${map[status] || 'badge-grey'}">${status}</span>`;
}

function loanStatusBadge(status) {
  const map = { ACTIVE: 'badge-green', OVERDUE: 'badge-red', RETURNED: 'badge-grey', LOST: 'badge-orange' };
  return `<span class="badge ${map[status] || 'badge-grey'}">${status}</span>`;
}

function memberBadge(type) {
  const map = { PREMIUM: 'badge-gold', STUDENT: 'badge-blue', SENIOR: 'badge-green', STANDARD: 'badge-grey' };
  return `<span class="badge ${map[type] || 'badge-grey'}">${type}</span>`;
}

// ── Connectivity status ───────────────────────────────────────────────
async function checkConnection() {
  const el = document.getElementById('connStatus');
  try {
    await Health.check();
    el.innerHTML = '<span class="dot online"></span> Connected';
  } catch {
    el.innerHTML = '<span class="dot offline"></span> Offline';
  }
}

// ── Empty row ─────────────────────────────────────────────────────────
function emptyRow(cols, msg = 'No records found') {
  return `<tr class="empty-row"><td colspan="${cols}">${msg}</td></tr>`;
}

// ── Currency ─────────────────────────────────────────────────────────
function fmtMoney(n) {
  return '$' + parseFloat(n || 0).toFixed(2);
}

// ── Relative time ─────────────────────────────────────────────────────
function relTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}
