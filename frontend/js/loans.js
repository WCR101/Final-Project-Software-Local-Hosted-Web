// ── Load Loans ────────────────────────────────────────────────────────
async function loadLoans(extraParams = {}) {
  const status = document.getElementById('loanStatusFilter').value;
  const tbody  = document.getElementById('loansTable');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-3);padding:32px">Loading…</td></tr>';

  try {
    const params = { ...extraParams };
    if (status) params.status = status;
    const loans = await Loans.list(params);

    if (!loans.length) { tbody.innerHTML = emptyRow(8); return; }

    tbody.innerHTML = loans.map(l => {
      const days     = daysUntil(l.due_date);
      const dueColor = l.status === 'OVERDUE' ? 'color:var(--red)' :
                       days <= 2 ? 'color:var(--orange)' : '';
      const fine     = parseFloat(l.fine_amount || 0);
      return `
        <tr>
          <td><span style="color:var(--text-3)">#${l.id}</span></td>
          <td><strong>${esc(l.book_title)}</strong><br><span style="font-size:11px;color:var(--text-3)">${esc(l.book_author)}</span></td>
          <td>${esc(l.patron_name)}<br><span style="font-size:11px;color:var(--text-3)">${esc(l.patron_email || '')}</span></td>
          <td style="font-size:12px">${fmtDate(l.checked_out)}</td>
          <td style="font-size:12px;${dueColor}">${fmtDate(l.due_date)}${l.status === 'ACTIVE' && days >= 0 ? `<br><span style="font-size:10px">${days}d left</span>` : ''}</td>
          <td>${loanStatusBadge(l.status)}</td>
          <td>${fine > 0 ? `<span class="fine-amount">${fmtMoney(fine)}</span>` : '—'}</td>
          <td>
            <div class="actions-cell">
              ${l.status === 'ACTIVE' || l.status === 'OVERDUE' ? `
                <button class="btn btn-ghost btn-sm" style="color:var(--green)" onclick="doCheckin(${l.id})">Check In</button>
                <button class="btn btn-ghost btn-sm" style="color:var(--blue)" onclick="doRenew(${l.id})">Renew</button>
                <button class="btn btn-ghost btn-sm" style="color:var(--orange)" onclick="doMarkLost(${l.id})">Lost</button>
              ` : ''}
            </div>
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = emptyRow(8, 'Error: ' + err.message);
  }
}

// ── Load Overdue ──────────────────────────────────────────────────────
async function loadOverdue() {
  const tbody = document.getElementById('overdueTable');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-3);padding:32px">Loading…</td></tr>';

  try {
    const loans = await Loans.overdue();

    if (!loans.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="8">No overdue books</td></tr>`;
      return;
    }

    tbody.innerHTML = loans.map(l => {
      const days = Math.abs(daysUntil(l.due_date));
      const fine = parseFloat(l.fine_amount || 0);
      return `
        <tr>
          <td><span style="color:var(--text-3)">#${l.id}</span></td>
          <td><strong>${esc(l.book_title)}</strong></td>
          <td>${esc(l.patron_name)}</td>
          <td style="font-size:12px">${esc(l.patron_email || '—')}</td>
          <td style="color:var(--red);font-size:12px">${fmtDate(l.due_date)}</td>
          <td><span class="badge badge-red">${days} day${days !== 1 ? 's' : ''}</span></td>
          <td><span class="fine-amount">${fmtMoney(fine)}</span></td>
          <td>
            <div class="actions-cell">
              <button class="btn btn-ghost btn-sm" style="color:var(--green)" onclick="doCheckin(${l.id})">Check In</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--blue)" onclick="doRenew(${l.id})">Renew</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--orange)" onclick="doMarkLost(${l.id})">Lost</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = emptyRow(8, 'Error: ' + err.message);
  }
}

// ── Load Fines ────────────────────────────────────────────────────────
async function loadFines() {
  const tbody = document.getElementById('finesTable');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-3);padding:32px">Loading…</td></tr>';

  try {
    const patrons = await Fines.list();

    if (!patrons.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No outstanding fines</td></tr>`;
      return;
    }

    tbody.innerHTML = patrons.map(p => `
      <tr>
        <td><strong>${esc(p.first_name)} ${esc(p.last_name)}</strong></td>
        <td style="font-size:12px;color:var(--text-3)">${esc(p.email || '—')}</td>
        <td style="font-size:12px">${esc(p.phone || '—')}</td>
        <td style="text-align:center">${parseInt(p.overdue_loans) || 0}</td>
        <td><span class="fine-amount">${fmtMoney(p.fine_balance)}</span></td>
        <td>
          <div class="actions-cell">
            <button class="btn btn-success btn-sm" onclick="openPayFine(${p.id},${p.fine_balance})">Record Payment</button>
          </div>
        </td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = emptyRow(6, 'Error: ' + err.message);
  }
}

// ── Open Checkout Modal ───────────────────────────────────────────────
async function openCheckoutModal() {
  try {
    const [patrons, books] = await Promise.all([
      Patrons.list({ active: 'true' }),
      Books.list({ status: 'IN' }),
    ]);

    const pSel = document.getElementById('checkoutPatron');
    const bSel = document.getElementById('checkoutBook');

    pSel.innerHTML = '<option value="">Select a patron…</option>' +
      patrons.map(p => {
        const disabled = p.num_books >= 6 || parseFloat(p.fine_balance) > 0;
        const label    = `${p.first_name} ${p.last_name}${disabled ? ' (ineligible)' : ''}`;
        return `<option value="${p.id}" ${disabled ? 'disabled' : ''}>${label}</option>`;
      }).join('');

    bSel.innerHTML = '<option value="">Select a book…</option>' +
      books.map(b => `<option value="${b.id}">${b.title} — ${b.author}</option>`).join('');

    document.getElementById('checkoutDays').value = 14;
    openModal('checkoutModal');
  } catch (err) { showToast(err.message, 'error'); }
}

// Override the add button onclick
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('[onclick="openModal(\'checkoutModal\')"]');
  if (btn) btn.setAttribute('onclick', 'openCheckoutModal()');
});

// ── Submit Checkout ───────────────────────────────────────────────────
async function submitCheckout(e) {
  e.preventDefault();
  const book_id   = parseInt(document.getElementById('checkoutBook').value);
  const patron_id = parseInt(document.getElementById('checkoutPatron').value);
  const loan_days = parseInt(document.getElementById('checkoutDays').value);

  if (!book_id || !patron_id) { showToast('Please select both a patron and a book', 'error'); return; }

  try {
    await Loans.checkout({ book_id, patron_id, loan_days });
    showToast('Book checked out successfully!');
    closeModal('checkoutModal');
    loadLoans();
    loadDashboard();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Check In ──────────────────────────────────────────────────────────
function doCheckin(loanId) {
  confirmAction('Check In Book', 'Mark this book as returned? Any overdue fines will be applied.', async () => {
    try {
      const res = await Loans.checkin(loanId);
      const msg = res.fine_charged > 0
        ? `Book returned. Fine charged: ${fmtMoney(res.fine_charged)}`
        : 'Book returned successfully!';
      showToast(msg, res.fine_charged > 0 ? 'info' : 'success');
      // Reload whichever table is visible
      const activePage = document.querySelector('.page.active')?.id;
      if (activePage === 'page-loans')   loadLoans();
      if (activePage === 'page-overdue') loadOverdue();
      loadDashboard();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

// ── Renew ─────────────────────────────────────────────────────────────
function doRenew(loanId) {
  confirmAction('Renew Loan', 'Extend this loan by 14 days from today?', async () => {
    try {
      await Loans.renew(loanId);
      showToast('Loan renewed for 14 more days');
      const activePage = document.querySelector('.page.active')?.id;
      if (activePage === 'page-loans')   loadLoans();
      if (activePage === 'page-overdue') loadOverdue();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

// ── Mark Lost ─────────────────────────────────────────────────────────
function doMarkLost(loanId) {
  confirmAction('Report Book Lost', 'Mark this book as lost? The replacement cost will be charged to the patron.', async () => {
    try {
      const res = await Loans.lost(loanId);
      showToast(`Book marked as lost. Replacement fee: ${fmtMoney(res.replacement_fee)}`, 'info');
      const activePage = document.querySelector('.page.active')?.id;
      if (activePage === 'page-loans')   loadLoans();
      if (activePage === 'page-overdue') loadOverdue();
      loadDashboard();
    } catch (err) { showToast(err.message, 'error'); }
  });
}
