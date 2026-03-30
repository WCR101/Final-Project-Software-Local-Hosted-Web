// ── Load Patrons ──────────────────────────────────────────────────────
async function loadPatrons() {
  const search = document.getElementById('patronSearch').value.trim();
  const active = document.getElementById('patronActiveFilter').value;
  const tbody  = document.getElementById('patronsTable');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-3);padding:32px">Loading…</td></tr>';

  try {
    const params = {};
    if (search) params.search = search;
    if (active) params.active = active;
    const patrons = await Patrons.list(params);

    if (!patrons.length) { tbody.innerHTML = emptyRow(8); return; }

    tbody.innerHTML = patrons.map(p => {
      const name      = `${esc(p.first_name)} ${esc(p.last_name)}`;
      const fineStyle = parseFloat(p.fine_balance) > 0 ? 'class="fine-amount"' : '';
      return `
        <tr>
          <td><span style="color:var(--text-3)">#${p.id}</span></td>
          <td><strong>${name}</strong>${p.is_active ? '' : ' <span class="badge badge-grey">Inactive</span>'}</td>
          <td style="font-size:12px;color:var(--text-3)">${esc(p.email || '—')}</td>
          <td style="font-size:12px">${esc(p.phone || '—')}</td>
          <td style="text-align:center">${p.num_books} / 6</td>
          <td ${fineStyle}>${fmtMoney(p.fine_balance)}</td>
          <td>${memberBadge(p.membership_type)}</td>
          <td>
            <div class="actions-cell">
              <button class="btn btn-ghost btn-sm" onclick="editPatron(${p.id})">Edit</button>
              ${parseFloat(p.fine_balance) > 0
                ? `<button class="btn btn-ghost btn-sm" style="color:var(--green)" onclick="openPayFine(${p.id},${p.fine_balance})">Pay Fine</button>`
                : ''}
              <button class="btn btn-ghost btn-sm" onclick="viewPatronLoans(${p.id},'${name}')" style="color:var(--blue)">Loans</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deletePatron(${p.id},'${name}')">Delete</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = emptyRow(8, '⚠ ' + err.message);
  }
}

// ── Edit Patron ───────────────────────────────────────────────────────
async function editPatron(id) {
  try {
    const p = await Patrons.get(id);
    document.getElementById('patronModalTitle').textContent = 'Edit Patron';
    document.getElementById('patronId').value         = p.id;
    document.getElementById('patronFirstName').value  = p.first_name;
    document.getElementById('patronLastName').value   = p.last_name;
    document.getElementById('patronEmail').value      = p.email || '';
    document.getElementById('patronPhone').value      = p.phone || '';
    document.getElementById('patronAddress').value    = p.address || '';
    document.getElementById('patronMembership').value = p.membership_type;
    openModal('patronModal');
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Open Add Patron Modal ─────────────────────────────────────────────
function openAddPatronModal() {
  document.getElementById('patronModalTitle').textContent = 'Add Patron';
  document.getElementById('patronForm').reset();
  document.getElementById('patronId').value = '';
  openModal('patronModal');
}

document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.querySelector('[onclick="openModal(\'patronModal\')"]');
  if (addBtn) addBtn.setAttribute('onclick', 'openAddPatronModal()');
});

// ── Submit Patron ─────────────────────────────────────────────────────
async function submitPatron(e) {
  e.preventDefault();
  const id = document.getElementById('patronId').value;
  const data = {
    first_name:      document.getElementById('patronFirstName').value.trim(),
    last_name:       document.getElementById('patronLastName').value.trim(),
    email:           document.getElementById('patronEmail').value.trim() || null,
    phone:           document.getElementById('patronPhone').value.trim() || null,
    address:         document.getElementById('patronAddress').value.trim() || null,
    membership_type: document.getElementById('patronMembership').value,
  };

  try {
    if (id) {
      await Patrons.update(id, data);
      showToast('Patron updated successfully');
    } else {
      await Patrons.create(data);
      showToast('Patron added successfully');
    }
    closeModal('patronModal');
    loadPatrons();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Delete Patron ─────────────────────────────────────────────────────
function deletePatron(id, name) {
  confirmAction('Delete Patron', `Remove "${name}" from the system? This cannot be undone.`, async () => {
    try {
      await Patrons.delete(id);
      showToast('Patron deleted');
      loadPatrons();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

// ── Pay Fine Modal ────────────────────────────────────────────────────
function openPayFine(patronId, balance) {
  document.getElementById('payFinePatronId').value = patronId;
  document.getElementById('payFineAmount').value   = parseFloat(balance).toFixed(2);
  document.getElementById('payFineNote').value     = '';
  openModal('payFineModal');
}

async function submitPayFine(e) {
  e.preventDefault();
  const id     = document.getElementById('payFinePatronId').value;
  const amount = parseFloat(document.getElementById('payFineAmount').value);
  const note   = document.getElementById('payFineNote').value.trim();

  try {
    const res = await Patrons.payFine(id, { amount, note });
    showToast(`Payment of ${fmtMoney(res.paid)} recorded. New balance: ${fmtMoney(res.new_balance)}`);
    closeModal('payFineModal');
    loadPatrons();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── View Patron Loans (quick info toast) ──────────────────────────────
async function viewPatronLoans(id, name) {
  try {
    const loans = await Patrons.loans(id);
    const active = loans.filter(l => l.status === 'ACTIVE' || l.status === 'OVERDUE');
    if (!active.length) {
      showToast(`${name} has no active loans`, 'info');
      return;
    }
    showToast(`${name} has ${active.length} active loan(s) — see Loans tab`, 'info');
    // Switch to loans page filtered by patron
    navigateTo('loans');
    setTimeout(() => {
      document.getElementById('loanStatusFilter').value = '';
      loadLoans({ patron_id: id });
    }, 100);
  } catch (err) { showToast(err.message, 'error'); }
}
