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
      WHERE  l.status = 'OVERDUE'
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

// POST /api/loans/:id/renew
router.post('/:id/renew', param('id').isInt(), validate, async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM loans WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Loan not found' });
    const loan = rows[0];
    if (loan.status === 'RETURNED') return res.status(400).json({ error: 'Cannot renew a returned loan' });

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

    // Get book cost to charge patron
    const { rows: bookRows } = await client.query('SELECT * FROM books WHERE id=$1', [loan.book_id]);
    const book = bookRows[0];
    const replacementFee = parseFloat(book?.cost || 0);

    await client.query(`UPDATE loans SET status='LOST', updated_at=NOW() WHERE id=$1`, [loan.id]);
    await client.query(`UPDATE books SET status='LOST', updated_at=NOW() WHERE id=$1`, [loan.book_id]);
    await client.query(
      `UPDATE patrons SET fine_balance=fine_balance+$1, num_books=GREATEST(num_books-1,0), updated_at=NOW() WHERE id=$2`,
      [replacementFee, loan.patron_id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Book marked as lost', replacement_fee: replacementFee });
  } catch (err) { await client.query('ROLLBACK'); next(err); }
  finally { client.release(); }
});

module.exports = router;

 / /   P O S T   / a p i / l o a n s / : i d / f o u n d   -   p a t r o n   f o u n d   a   l o s t   b o o k ,   r e d u c e   f i n e   b y   5 0 % 
 r o u t e r . p o s t ( ' / : i d / f o u n d ' ,   p a r a m ( ' i d ' ) . i s I n t ( ) ,   v a l i d a t e ,   a s y n c   ( r e q ,   r e s ,   n e x t )   = >   { 
     c o n s t   c l i e n t   =   a w a i t   d b . c o n n e c t ( ) ; 
     t r y   { 
         a w a i t   c l i e n t . q u e r y ( ' B E G I N ' ) ; 
         c o n s t   {   r o w s   }   =   a w a i t   c l i e n t . q u e r y ( ' S E L E C T   l . * ,   p . f i r s t _ n a m e ,   p . l a s t _ n a m e   F R O M   l o a n s   l   J O I N   p a t r o n s   p   O N   p . i d = l . p a t r o n _ i d   W H E R E   l . i d = \   F O R   U P D A T E ' ,   [ r e q . p a r a m s . i d ] ) ; 
         i f   ( ! r o w s . l e n g t h )   {   a w a i t   c l i e n t . q u e r y ( ' R O L L B A C K ' ) ;   r e t u r n   r e s . s t a t u s ( 4 0 4 ) . j s o n ( {   e r r o r :   ' L o a n   n o t   f o u n d '   } ) ;   } 
         c o n s t   l o a n   =   r o w s [ 0 ] ; 
 
         i f   ( l o a n . s t a t u s   ! = =   ' L O S T ' )   {   a w a i t   c l i e n t . q u e r y ( ' R O L L B A C K ' ) ;   r e t u r n   r e s . s t a t u s ( 4 0 0 ) . j s o n ( {   e r r o r :   ' O n l y   l o s t   b o o k s   c a n   b e   m a r k e d   a s   f o u n d '   } ) ;   } 
 
         c o n s t   o r i g i n a l F i n e   =   p a r s e F l o a t ( l o a n . f i n e _ a m o u n t   | |   0 ) ; 
         c o n s t   r e d u c e d F i n e   =   p a r s e F l o a t ( ( o r i g i n a l F i n e   *   0 . 5 ) . t o F i x e d ( 2 ) ) ;   / /   5 0 %   r e d u c t i o n 
         c o n s t   r e f u n d   =   o r i g i n a l F i n e   -   r e d u c e d F i n e ; 
 
         / /   U p d a t e   l o a n   t o   R E T U R N E D 
         a w a i t   c l i e n t . q u e r y ( ' U P D A T E   l o a n s   S E T   s t a t u s = \ ,   u p d a t e d _ a t = N O W ( )   W H E R E   i d = \ ' ,   [ ' R E T U R N E D ' ,   l o a n . i d ] ) ; 
 
         / /   R e d u c e   p a t r o n ' s   f i n e   b a l a n c e   b y   r e f u n d   a m o u n t 
         a w a i t   c l i e n t . q u e r y ( ' U P D A T E   p a t r o n s   S E T   f i n e _ b a l a n c e = G R E A T E S T ( f i n e _ b a l a n c e   -   \ ,   0 ) ,   u p d a t e d _ a t = N O W ( )   W H E R E   i d = \ ' ,   [ r e f u n d ,   l o a n . p a t r o n _ i d ] ) ; 
 
         / /   B o o k   s t a t u s   b a c k   t o   I N 
         a w a i t   c l i e n t . q u e r y ( ' U P D A T E   b o o k s   S E T   s t a t u s = \ ,   u p d a t e d _ a t = N O W ( )   W H E R E   i d = \ ' ,   [ ' I N ' ,   l o a n . b o o k _ i d ] ) ; 
 
         a w a i t   c l i e n t . q u e r y ( ' I N S E R T   I N T O   a u d i t _ l o g   ( a c t i o n , e n t i t y , e n t i t y _ i d , d e s c r i p t i o n )   V A L U E S   ( \ , \ , \ , \ ) ' ,   [ ' F O U N D ' ,   ' l o a n ' ,   l o a n . i d ,   \ \   \   f o u n d   l o s t   b o o k .   F i n e   r e d u c e d   f r o m   \ $ \   t o   \ $ \ \ ] ) ; 
 
         a w a i t   c l i e n t . q u e r y ( ' C O M M I T ' ) ; 
         r e s . j s o n ( {   m e s s a g e :   ' B o o k   f o u n d !   F i n e   r e d u c e d   b y   5 0 % ' ,   o r i g i n a l _ f i n e :   o r i g i n a l F i n e ,   n e w _ f i n e :   r e d u c e d F i n e ,   r e f u n d :   r e f u n d   } ) ; 
     }   c a t c h   ( e r r )   {   a w a i t   c l i e n t . q u e r y ( ' R O L L B A C K ' ) ;   n e x t ( e r r ) ;   } 
     f i n a l l y   {   c l i e n t . r e l e a s e ( ) ;   } 
 } ) ; 
  
 