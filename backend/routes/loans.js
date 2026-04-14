const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../db');

const router = express.Router();
const FINE_PER_DAY  = 0.50;
const LOAN_DAYS     = 14;
const MAX_BOOKS     = 6;

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// Shared: mark overdue loans & recalculate fines
async function syncOverdue(client) {
  await client.query(`
    UPDATE loans
    SET    status      = 'OVERDUE',
           fine_amount = ROUND((CURRENT_DATE - due_date)::numeric * $1, 2),
           updated_at  = NOW()
    WHERE  status IN ('ACTIVE','OVERDUE')
    AND    due_date < CURRENT_DATE
  `, [FINE_PER_DAY]);
}

// GET /api/loans  – list with optional filters
router.get('/', async (req, res, next) => {
  try {
    const { status, patron_id, book_id } = req.query;
    let text = `
      SELECT l.*,
             b.title  AS book_title,
             b.author AS book_author,
             b.isbn   AS book_isbn,
             p.first_name || ' ' || p.last_name AS patron_name,
             p.email AS patron_email
      FROM   loans l
      JOIN   books   b ON b.id = l.book_id
      JOIN   patrons p ON p.id = l.patron_id
      WHERE  1=1`;
    const params = [];

    if (status) {
      params.push(status.toUpperCase());
      text += ` AND l.status = $${params.length}`;
    }
    if (patron_id) {
      params.push(patron_id);
      text += ` AND l.patron_id = $${params.length}`;
    }
    if (book_id) {
      params.push(book_id);
      text += ` AND l.book_id = $${params.length}`;
    }
    text += ' ORDER BY l.due_date';

    await syncOverdue(db);
    const { rows } = await db.query(text, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/loans/overdue
router.get('/overdue', async (req, res, next) => {
  try {
    await syncOverdue(db);
    const { rows } = await db.query(`
      SELECT l.*,
             b.title AS book_title, b.author AS book_author,
             p.first_name || ' ' || p.last_name AS patron_name,
             p.email AS patron_email, p.phone AS patron_phone
      FROM   loans l
      JOIN   books b   ON b.id = l.book_id
      JOIN   patrons p ON p.id = l.patron_id
      WHERE  l.status IN ('OVERDUE', 'LOST')
      ORDER  BY l.due_date`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/loans/checkout
router.post('/checkout',
  body('book_id').isInt({ min: 1 }),
  body('patron_id').isInt({ min: 1 }),
  body('loan_days').optional().isInt({ min: 1, max: 90 }).toInt(),
  validate,
  async (req, res, next) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await syncOverdue(client);

      const { book_id, patron_id, loan_days = LOAN_DAYS } = req.body;

      // Validate patron
      const { rows: patronRows } = await client.query('SELECT * FROM patrons WHERE id=$1 FOR UPDATE', [patron_id]);
      if (!patronRows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Patron not found' }); }
      const patron = patronRows[0];

      if (!patron.is_active)             { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Patron account is inactive' }); }
      if (patron.num_books >= MAX_BOOKS) { await client.query('ROLLBACK'); return res.status(400).json({ error: `Patron already has ${MAX_BOOKS} books checked out (maximum)` }); }
      if (parseFloat(patron.fine_balance) > 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: `Patron has an outstanding fine of $${patron.fine_balance}` }); }

      // Validate book
      const { rows: bookRows } = await client.query('SELECT * FROM books WHERE id=$1 FOR UPDATE', [book_id]);
      if (!bookRows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Book not found' }); }
      const book = bookRows[0];

      if (book.status !== 'IN') { await client.query('ROLLBACK'); return res.status(400).json({ error: `Book is not available (status: ${book.status})` }); }

      // Create loan
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + parseInt(loan_days));
      const { rows: loanRows } = await client.query(
        `INSERT INTO loans (book_id, patron_id, due_date) VALUES ($1,$2,$3) RETURNING *`,
        [book_id, patron_id, dueDate.toISOString().split('T')[0]]
      );

      // Update book and patron
      await client.query(`UPDATE books   SET status='OUT', updated_at=NOW() WHERE id=$1`, [book_id]);
      await client.query(`UPDATE patrons SET num_books=num_books+1, updated_at=NOW() WHERE id=$1`, [patron_id]);
      await client.query(
        `INSERT INTO audit_log (action,entity,entity_id,description) VALUES ('CHECKOUT','loan',$1,$2)`,
        [loanRows[0].id, `${patron.first_name} ${patron.last_name} checked out "${book.title}"`]
      );

      await client.query('COMMIT');
      res.status(201).json({ message: 'Book checked out successfully', loan: loanRows[0] });
    } catch (err) { await client.query('ROLLBACK'); next(err); }
    finally { client.release(); }
  }
);

// POST /api/loans/checkin
router.post('/checkin',
  body('loan_id').isInt(),
  validate,
  async (req, res, next) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await syncOverdue(client);

      const { rows: loanRows } = await client.query(
        `SELECT l.*, b.title, p.first_name, p.last_name
         FROM loans l JOIN books b ON b.id=l.book_id JOIN patrons p ON p.id=l.patron_id
         WHERE l.id=$1 FOR UPDATE`,
        [req.body.loan_id]
      );
      if (!loanRows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Loan not found' }); }
      const loan = loanRows[0];

      if (loan.status === 'RETURNED') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Book already returned' }); }

      // Calculate final fine if overdue
      let fine = 0;
      const today = new Date();
      const due   = new Date(loan.due_date);
      if (today > due) {
        const daysLate = Math.ceil((today - due) / 86400000);
        fine = parseFloat((daysLate * FINE_PER_DAY).toFixed(2));
      }

      // Update loan
      await client.query(
        `UPDATE loans SET status='RETURNED', returned_at=NOW(), fine_amount=$1, updated_at=NOW() WHERE id=$2`,
        [fine, loan.id]
      );

      // Update book → back to IN
      await client.query(`UPDATE books SET status='IN', updated_at=NOW() WHERE id=$1`, [loan.book_id]);

      // Decrease patron book count, add fine if any
      await client.query(
        `UPDATE patrons SET num_books=GREATEST(num_books-1,0), fine_balance=fine_balance+$1, updated_at=NOW() WHERE id=$2`,
        [fine, loan.patron_id]
      );

      await client.query(
        `INSERT INTO audit_log (action,entity,entity_id,description) VALUES ('CHECKIN','loan',$1,$2)`,
        [loan.id, `${loan.first_name} ${loan.last_name} returned "${loan.title}"${fine > 0 ? ` — Fine: $${fine}` : ''}`]
      );

      await client.query('COMMIT');
      res.json({ message: 'Book returned successfully', fine_charged: fine, loan_id: loan.id });
    } catch (err) { await client.query('ROLLBACK'); next(err); }
    finally { client.release(); }
  }
);

// ═══════════════════════════════════════════════════════════════════════
// IMPORTANT: Specific routes (like /test/simulate-overdue) MUST come BEFORE
// parameterized routes (like /:id/renew). Express matches routes in order.
// ═══════════════════════════════════════════════════════════════════════

// POST /api/loans/test/simulate-overdue - TEST ENDPOINT: mark a loan as overdue for testing
router.post('/test/simulate-overdue', async (req, res, next) => {
  const loanId = req.body.id || req.query.id;
  if (!loanId || isNaN(loanId)) {
    return res.status(400).json({ error: 'Loan ID is required in body or query' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM loans WHERE id=$1 FOR UPDATE', [parseInt(loanId)]);
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Loan not found' }); }
    const loan = rows[0];

    if (loan.status === 'RETURNED') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Cannot mark returned loan as overdue' }); }
    if (loan.status === 'LOST') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Cannot mark lost loan as overdue' }); }

    // Calculate fine as if today is 7 days past due
    const DAYS_OVERDUE = 7;
    const calculatedFine = parseFloat((DAYS_OVERDUE * FINE_PER_DAY).toFixed(2));

    // Set due date to 7 days in the past
    const newDueDate = new Date();
    newDueDate.setDate(newDueDate.getDate() - DAYS_OVERDUE);

    await client.query(
      `UPDATE loans SET status='OVERDUE', due_date=$1, fine_amount=$2, updated_at=NOW() WHERE id=$3`,
      [newDueDate.toISOString().split('T')[0], calculatedFine, loan.id]
    );

    // Add fine to patron's balance
    await client.query(
      `UPDATE patrons SET fine_balance=fine_balance+$1, updated_at=NOW() WHERE id=$2`,
      [calculatedFine, loan.patron_id]
    );

    // Get patron and book names for audit
    const { rows: patronRows } = await client.query('SELECT * FROM patrons WHERE id=$1', [loan.patron_id]);
    const { rows: bookRows } = await client.query('SELECT * FROM books WHERE id=$1', [loan.book_id]);
    const patron = patronRows[0];
    const book = bookRows[0];

    // Audit log
    await client.query(
      'INSERT INTO audit_log (action,entity,entity_id,description) VALUES ($1,$2,$3,$4)',
      ['TEST_OVERDUE', 'loan', loan.id, `[TEST] ${patron.first_name} ${patron.last_name} - "${book.title}" simulated as ${DAYS_OVERDUE} days overdue. Fine: $${calculatedFine}`]
    );

    await client.query('COMMIT');
    res.json({ 
      message: 'Loan simulated as overdue (testing)', 
      days_overdue: DAYS_OVERDUE,
      fine_calculated: calculatedFine,
      new_due_date: newDueDate.toISOString().split('T')[0]
    });
  } catch (err) { await client.query('ROLLBACK'); next(err); }
  finally { client.release(); }
});

// POST /api/loans/:id/renew
router.post('/:id/renew', param('id').isInt(), validate, async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM loans WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Loan not found' });
    const loan = rows[0];
    if (loan.status === 'RETURNED') return res.status(400).json({ error: 'Cannot renew a returned loan' });
    if (loan.status === 'LOST') return res.status(400).json({ error: 'Cannot renew a lost loan' });

    const newDue = new Date(loan.due_date);
    newDue.setDate(newDue.getDate() + LOAN_DAYS);

    const { rows: updated } = await db.query(
      `UPDATE loans SET due_date=$1, status='ACTIVE', fine_amount=0, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [newDue.toISOString().split('T')[0], req.params.id]
    );
    res.json({ message: 'Loan renewed', loan: updated[0] });
  } catch (err) { next(err); }
});

// POST /api/loans/:id/lost
router.post('/:id/lost', param('id').isInt(), validate, async (req, res, next) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM loans WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Loan not found' }); }
    const loan = rows[0];

    if (loan.status === 'RETURNED') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Cannot mark returned loan as lost' }); }
    if (loan.status === 'LOST') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Book already marked as lost' }); }

    // Get book cost to charge patron
    const { rows: bookRows } = await client.query('SELECT * FROM books WHERE id=$1', [loan.book_id]);
    const book = bookRows[0];
    const replacementFee = parseFloat(book?.cost || 0);

    // Get patron info for audit
    const { rows: patronRows } = await client.query('SELECT * FROM patrons WHERE id=$1', [loan.patron_id]);
    const patron = patronRows[0];

    await client.query(`UPDATE loans SET status='LOST', updated_at=NOW() WHERE id=$1`, [loan.id]);
    await client.query(`UPDATE books SET status='LOST', updated_at=NOW() WHERE id=$1`, [loan.book_id]);
    await client.query(
      `UPDATE patrons SET fine_balance=fine_balance+$1, num_books=GREATEST(num_books-1,0), updated_at=NOW() WHERE id=$2`,
      [replacementFee, loan.patron_id]
    );

    // Audit log
    await client.query(
      'INSERT INTO audit_log (action,entity,entity_id,description) VALUES ($1,$2,$3,$4)',
      ['LOST', 'loan', loan.id, `${patron.first_name} ${patron.last_name} reported "${book.title}" lost. Replacement fee: $${replacementFee}`]
    );

    await client.query('COMMIT');
    res.json({ message: 'Book marked as lost', replacement_fee: replacementFee });
  } catch (err) { await client.query('ROLLBACK'); next(err); }
  finally { client.release(); }
});

// POST /api/loans/:id/found - patron found a lost book, reduce fine by 50%
router.post('/:id/found', param('id').isInt(), validate, async (req, res, next) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT l.*, b.title, p.first_name, p.last_name FROM loans l 
       JOIN books b ON b.id=l.book_id JOIN patrons p ON p.id=l.patron_id WHERE l.id=$1 FOR UPDATE`,
      [req.params.id]
    );
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Loan not found' }); }
    const loan = rows[0];

    if (loan.status !== 'LOST') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Only lost books can be marked as found' }); }

    const originalFine = parseFloat(loan.fine_amount || 0);
    const reducedFine = parseFloat((originalFine * 0.5).toFixed(2));
    const refund = originalFine - reducedFine;

    // Update loan to RETURNED
    await client.query('UPDATE loans SET status=$1, updated_at=NOW() WHERE id=$2', ['RETURNED', loan.id]);

    // Reduce patron's fine balance by refund amount
    await client.query('UPDATE patrons SET fine_balance=GREATEST(fine_balance - $1, 0), updated_at=NOW() WHERE id=$2', [refund, loan.patron_id]);

    // Book status back to IN
    await client.query('UPDATE books SET status=$1, updated_at=NOW() WHERE id=$2', ['IN', loan.book_id]);

    // Audit log
    await client.query(
      'INSERT INTO audit_log (action,entity,entity_id,description) VALUES ($1,$2,$3,$4)',
      ['FOUND', 'loan', loan.id, `${loan.first_name} ${loan.last_name} found lost book "${loan.title}". Fine reduced from $${originalFine} to $${reducedFine}`]
    );

    await client.query('COMMIT');
    res.json({ message: 'Book found! Fine reduced by 50%', original_fine: originalFine, new_fine: reducedFine, refund: refund });
  } catch (err) { await client.query('ROLLBACK'); next(err); }
  finally { client.release(); }
});

module.exports = router;
