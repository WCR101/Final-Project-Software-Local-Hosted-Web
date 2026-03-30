// ── Load Books ────────────────────────────────────────────────────────
async function loadBooks() {
  const search = document.getElementById('bookSearch').value.trim();
  const status = document.getElementById('bookStatusFilter').value;
  const tbody  = document.getElementById('booksTable');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-3);padding:32px">Loading…</td></tr>';

  try {
    const params = {};
    if (search) params.search = search;
    if (status) params.status = status;
    const books = await Books.list(params);

    if (!books.length) { tbody.innerHTML = emptyRow(7); return; }

    tbody.innerHTML = books.map(b => `
      <tr>
        <td><span style="color:var(--text-3)">#${b.id}</span></td>
        <td><strong>${esc(b.title)}</strong></td>
        <td>${esc(b.author)}</td>
        <td style="color:var(--text-3);font-size:12px">${esc(b.isbn || '—')}</td>
        <td>${fmtMoney(b.cost)}</td>
        <td>${bookStatusBadge(b.status)}</td>
        <td>
          <div class="actions-cell">
            <button class="btn btn-ghost btn-sm" onclick="editBook(${b.id})">Edit</button>
            <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deleteBook(${b.id},'${esc(b.title)}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = emptyRow(7, '⚠ ' + err.message);
  }
}

// ── Edit Book ─────────────────────────────────────────────────────────
async function editBook(id) {
  try {
    const b = await Books.get(id);
    document.getElementById('bookModalTitle').textContent = 'Edit Book';
    document.getElementById('bookId').value     = b.id;
    document.getElementById('bookTitle').value  = b.title;
    document.getElementById('bookAuthor').value = b.author;
    document.getElementById('bookISBN').value   = b.isbn || '';
    document.getElementById('bookCost').value   = b.cost || 0;
    document.getElementById('bookStatus').value = b.status;
    openModal('bookModal');
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Open Add Modal ────────────────────────────────────────────────────
function openAddBookModal() {
  document.getElementById('bookModalTitle').textContent = 'Add Book';
  document.getElementById('bookForm').reset();
  document.getElementById('bookId').value = '';
  openModal('bookModal');
}

// Override the inline onclick
document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.querySelector('[onclick="openModal(\'bookModal\')"]');
  if (addBtn) addBtn.setAttribute('onclick', 'openAddBookModal()');
});

// ── Submit Book ───────────────────────────────────────────────────────
async function submitBook(e) {
  e.preventDefault();
  const id = document.getElementById('bookId').value;
  const data = {
    title:  document.getElementById('bookTitle').value.trim(),
    author: document.getElementById('bookAuthor').value.trim(),
    isbn:   document.getElementById('bookISBN').value.trim() || null,
    cost:   parseFloat(document.getElementById('bookCost').value) || 0,
    status: document.getElementById('bookStatus').value,
  };

  try {
    if (id) {
      await Books.update(id, data);
      showToast('Book updated successfully');
    } else {
      await Books.create(data);
      showToast('Book added successfully');
    }
    closeModal('bookModal');
    loadBooks();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Delete Book ───────────────────────────────────────────────────────
function deleteBook(id, title) {
  confirmAction('Delete Book', `Delete "${title}"? This cannot be undone.`, async () => {
    try {
      await Books.delete(id);
      showToast('Book deleted');
      loadBooks();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

// ── Escape HTML ───────────────────────────────────────────────────────
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
