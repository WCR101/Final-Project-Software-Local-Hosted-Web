// ── Base URL ─────────────────────────────────────────────────────────
const API = '/api';

// ── Generic fetch wrapper ────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const url = API + path;
  const defaults = {
    headers: { 'Content-Type': 'application/json' },
  };
  const res = await fetch(url, { ...defaults, ...options, headers: { ...defaults.headers, ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
}

// ── Health ───────────────────────────────────────────────────────────
const Health = {
  check: () => apiFetch('/health'),
};

// ── Stats ────────────────────────────────────────────────────────────
const Stats = {
  get: () => apiFetch('/stats'),
};

// ── Books ────────────────────────────────────────────────────────────
const Books = {
  list:   (params = {}) => apiFetch('/books?' + new URLSearchParams(params)),
  get:    (id)          => apiFetch(`/books/${id}`),
  create: (data)        => apiFetch('/books', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data)    => apiFetch(`/books/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id)          => apiFetch(`/books/${id}`, { method: 'DELETE' }),
};

// ── Patrons ──────────────────────────────────────────────────────────
const Patrons = {
  list:    (params = {}) => apiFetch('/patrons?' + new URLSearchParams(params)),
  get:     (id)          => apiFetch(`/patrons/${id}`),
  loans:   (id)          => apiFetch(`/patrons/${id}/loans`),
  create:  (data)        => apiFetch('/patrons', { method: 'POST', body: JSON.stringify(data) }),
  update:  (id, data)    => apiFetch(`/patrons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete:  (id)          => apiFetch(`/patrons/${id}`, { method: 'DELETE' }),
  payFine: (id, data)    => apiFetch(`/patrons/${id}/pay-fine`, { method: 'POST', body: JSON.stringify(data) }),
};

// ── Loans ────────────────────────────────────────────────────────────
const Loans = {
  list:            (params = {}) => apiFetch('/loans?' + new URLSearchParams(params)),
  overdue:         ()            => apiFetch('/loans/overdue'),
  checkout:        (data)        => apiFetch('/loans/checkout', { method: 'POST', body: JSON.stringify(data) }),
  checkin:         (loan_id)     => apiFetch('/loans/checkin',  { method: 'POST', body: JSON.stringify({ loan_id }) }),
  renew:           (id)          => apiFetch(`/loans/${id}/renew`, { method: 'POST' }),
  lost:            (id)          => apiFetch(`/loans/${id}/lost`,  { method: 'POST' }),
  found:           (id)          => apiFetch(`/loans/${id}/found`, { method: 'POST' }),
  testSimulateOverdue: (id)      => apiFetch('/loans/test/simulate-overdue', { method: 'POST', body: JSON.stringify({ id }) }),
};

// ── Fines ────────────────────────────────────────────────────────────
const Fines = {
  list:     () => apiFetch('/fines'),
  payments: () => apiFetch('/fines/payments'),
};
