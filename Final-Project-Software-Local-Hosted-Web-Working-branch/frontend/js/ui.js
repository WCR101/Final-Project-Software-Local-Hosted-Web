// ── Connection status styling ────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
  #connStatus {
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  #connStatus:hover {
    background-color: var(--bg-3);
  }
  #connStatus .dot {
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  #connStatus .dot.offline {
    animation: none;
  }
`;
document.head.appendChild(style);  // Prevent pasting malicious content
  document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]').forEach(input => {
    input.addEventListener('paste', (e) => {
      const pastedText = (e.clipboardData || window.clipboardData).getData('text');
      // Check for suspicious patterns
      if (/<|>|script|javascript|onclick/i.test(pastedText)) {
        e.preventDefault();
        showToast('Pasted content contains invalid characters', 'error');
      }
    });
  });// ── Toast ────────────────────────────────────────────────────────────
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

// ── Connectivity status (Real-time) ───────────────────────────────
async function checkConnection() {
  const el = document.getElementById('connStatus');
  try {
    // Check backend health
    const health = await Health.check();
    
    // Check if we have sample data
    const books = await fetch('/api/books').then(r => r.json());
    const patrons = await fetch('/api/patrons').then(r => r.json());
    const hasSampleData = books.length > 0 && patrons.length > 0;
    
    el.innerHTML = `<span class="dot online"></span> Connected${hasSampleData ? ' • Sample data loaded' : ''}`;
  } catch (err) {
    el.innerHTML = `<span class="dot offline"></span> Offline • ${err.message}`;
  }
}

// Check connection on load and every 30 seconds
document.addEventListener('DOMContentLoaded', () => {
  checkConnection();
  setInterval(checkConnection, 30000);
});

// ── Empty row ─────────────────────────────────────────────────────────
function emptyRow(cols, msg = 'No records found') {
  return `<tr class="empty-row"><td colspan="${cols}">${msg}</td></tr>`;
}

// ── Currency ─────────────────────────────────────────────────────────
function fmtMoney(n) {
  return '$' + parseFloat(n || 0).toFixed(2);
}

// ── Phone formatting ──────────────────────────────────────────────────
function formatPhone(input) {
  // Remove all non-digits
  let digits = (input || '').replace(/\D/g, '');
  // Keep only first 10 digits
  digits = digits.substring(0, 10);
  // Format as XXX-XXX-XXXX
  if (digits.length === 0) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return digits.slice(0, 3) + '-' + digits.slice(3);
  return digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6);
}

function isValidPhone(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.length === 10;
}

// ── Input validation helpers ────────────────────────────────────────
function sanitizeText(str, maxLen = 255) {
  return (str || '')
    .trim()
    .substring(0, maxLen)
    .replace(/[<>"'`]/g, '')  // Remove dangerous characters
    .replace(/\s+/g, ' ');    // Normalize whitespace (prevent copy-paste spam)
}

function sanitizeName(str, maxLen = 100) {
  return sanitizeText(str, maxLen)
    .replace(/[^a-zA-Z\s'-]/g, '')  // Only letters, spaces, hyphens, apostrophes
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // Separate camelCase
    .trim();
}

function sanitizeISBN(str) {
  return (str || '').replace(/[^0-9-]/g, '').substring(0, 20);
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePositiveNumber(n, max = Infinity) {
  const num = parseFloat(n);
  return !isNaN(num) && num >= 0 && num <= max && Number.isFinite(num);
}

function sanitizeMoneyInput(value) {
  let num = parseFloat(value) || 0;
  // Clamp to 0-999999.99
  num = Math.max(0, Math.min(999999.99, num));
  return num.toFixed(2);
}

function formatISBN(isbn) {
  const digits = (isbn || '').replace(/[^0-9-]/g, '');
  if (digits.length < 10) return digits;
  return digits.substring(0, 17); // Max ISBN-13 length
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

// Auto-format phone on input
document.addEventListener('DOMContentLoaded', () => {
  // Phone inputs
  const phoneInputs = document.querySelectorAll('input[id*="Phone"]');
  phoneInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      e.target.value = formatPhone(e.target.value);
    });
    input.addEventListener('blur', (e) => {
      if (e.target.value && !isValidPhone(e.target.value)) {
        showToast('Phone must be 10 digits', 'error');
      }
    });
  });

  // Name inputs (first/last name) - prevent sticky keys
  const nameInputs = document.querySelectorAll('input[id*="Name"]');
  nameInputs.forEach(input => {
    // Prevent same character repeated (sticky keys)
    input.addEventListener('input', (e) => {
      const val = e.target.value;
      // If same char repeated more than 5 times, warn
      if (/([a-zA-Z])\1{5,}/.test(val)) {
        showToast('Too many repeated characters - possible sticky key', 'error');
        e.target.value = val.replace(/([a-zA-Z])\1{5,}/g, '$1$1');
      }
    });
    input.addEventListener('blur', (e) => {
      e.target.value = sanitizeName(e.target.value);
    });
  });

  // ISBN input
  const isbnInput = document.getElementById('bookISBN');
  if (isbnInput) {
    isbnInput.addEventListener('input', (e) => {
      e.target.value = formatISBN(e.target.value);
    });
  }

  // Money inputs (cost, fines)
  const moneyInputs = document.querySelectorAll('input[type="number"][id*="Cost"], input[type="number"][id*="Amount"]');
  moneyInputs.forEach(input => {
    input.addEventListener('blur', (e) => {
      if (e.target.value) {
        e.target.value = sanitizeMoneyInput(e.target.value);
      }
    });
    input.addEventListener('input', (e) => {
      // Prevent negative numbers in real-time
      if (e.target.value < 0) e.target.value = 0;
    });
  });

  // Integer inputs (days)
  const intInputs = document.querySelectorAll('input[id*="Days"]');
  intInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      let val = parseInt(e.target.value) || 0;
      if (val < 0) val = 0;
      if (val > 90) val = 90;
      e.target.value = val;
    });
  });

  // Address/text inputs - prevent spam
  const textInputs = document.querySelectorAll('input[id*="Address"], input[id*="Title"], input[id*="Author"]');
  textInputs.forEach(input => {
    // Prevent repeated characters
    input.addEventListener('input', (e) => {
      const val = e.target.value;
      if (/([a-zA-Z0-9])\1{10,}/.test(val)) {
        showToast('Too many repeated characters detected', 'error');
        e.target.value = val.replace(/([a-zA-Z0-9])\1{10,}/g, '$1$1');
      }
    });
    input.addEventListener('blur', (e) => {
      e.target.value = sanitizeText(e.target.value);
    });
  });

  // Email inputs
  const emailInputs = document.querySelectorAll('input[type="email"]');
  emailInputs.forEach(input => {
    input.addEventListener('blur', (e) => {
      if (e.target.value && !validateEmail(e.target.value)) {
        showToast('Invalid email format', 'error');
      }
    });
  });
});

const savedTheme = localStorage.getItem("theme");
// user saved theme preference
if (savedTheme) {
  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
  }
} else {
  // no saved preference
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (!prefersDark) {
    document.body.classList.add("light-mode");
  }
}
// click to toggle theme
const toggle = document.getElementById("theme-toggle");

toggle.addEventListener("click", () => {
  document.body.classList.toggle("light-mode");

  const isLight = document.body.classList.contains("light-mode");

  localStorage.setItem("theme", isLight ? "light" : "dark");
});

