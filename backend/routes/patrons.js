const express = require('express');
const { body, param, validationResult, check } = require('express-validator');
const db = require('../db');

const router = express.Router();

// Phone formatter: removes non-digits and formats as XXX-XXX-XXXX
function formatPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '').substring(0, 10);
  if (digits.length !== 10) return null;
  return digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6);
}

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// Auto-format phone numbers in database

router.get('/', async (req, res, next) => {
  try {
    const { search, active } = req.query;
    let text = 'SELECT * FROM patrons WHERE 1=1';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      text += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }
    if (active !== undefined) {
      params.push(active === 'true');
      text += ` AND is_active = $${params.length}`;
    }
    text += ' ORDER BY last_name, first_name';

    const { rows } = await db.query(text, params);
    // Format all phone numbers for display
    rows.forEach(row => {
      if (row.phone) {
        const formatted = formatPhone(row.phone);
        if (formatted) row.phone = formatted;
      }
    });
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/patrons/:id
router.get('/:id', param('id').isInt(), validate, async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM patrons WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Patron not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/patrons/:id/loans – all loans for a patron
router.get('/:id/loans', param('id').isInt(), validate, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT l.*, b.title, b.author, b.isbn
       FROM   loans l
       JOIN   books b ON b.id = l.book_id
       WHERE  l.patron_id = $1
       ORDER  BY l.checked_out DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/',
  body('first_name').trim().notEmpty().isLength({ min: 1, max: 100 }),
  body('last_name').trim().notEmpty().isLength({ min: 1, max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone')
    .optional({ nullable: true })
    .trim()
    .custom((phone) => {
      if (!phone) return true;
      const digits = phone.replace(/\D/g, '');
      if (digits.length !== 10) throw new Error('Phone must be 10 digits');
      return true;
    })
    .customSanitizer((phone) => formatPhone(phone)),
  body('address').optional().trim().isLength({ min: 0, max: 255 }),
  body('membership_type').optional().isIn(['STANDARD','PREMIUM','STUDENT','SENIOR']),
  validate,
  async (req, res, next) => {
    try {
      const { first_name, last_name, email, phone, address, membership_type = 'STANDARD' } = req.body;
      const { rows } = await db.query(
        `INSERT INTO patrons (first_name, last_name, email, phone, address, membership_type)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [first_name, last_name, email || null, phone || null, address || null, membership_type]
      );
      await db.query(
        `INSERT INTO audit_log (action, entity, entity_id, description) VALUES ('CREATE','patron',$1,$2)`,
        [rows[0].id, `Added patron: ${first_name} ${last_name}`]
      );
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  }
);

// PUT /api/patrons/:id
router.put('/:id',
  param('id').isInt(),
  body('first_name').optional().trim().notEmpty(),
  body('last_name').optional().trim().notEmpty(),
  body('email').optional({ nullable: true }).isEmail().normalizeEmail(),
  body('phone')
    .optional({ nullable: true })
    .trim()
    .custom((phone) => {
      if (!phone) return true;
      const digits = phone.replace(/\D/g, '');
      if (digits.length !== 10) throw new Error('Phone must be 10 digits');
      return true;
    })
    .customSanitizer((phone) => formatPhone(phone)),
  body('address').optional({ nullable: true }).trim(),
  body('membership_type').optional().isIn(['STANDARD','PREMIUM','STUDENT','SENIOR']),
  body('is_active').optional().isBoolean(),
  validate,
  async (req, res, next) => {
    try {
      const { rows: existing } = await db.query('SELECT * FROM patrons WHERE id=$1', [req.params.id]);
      if (!existing.length) return res.status(404).json({ error: 'Patron not found' });
      const p = existing[0];

      const { first_name, last_name, email, phone, address, membership_type, is_active } = req.body;
      const { rows } = await db.query(
        `UPDATE patrons
         SET first_name=$1, last_name=$2, email=$3, phone=$4, address=$5,
             membership_type=$6, is_active=$7, updated_at=NOW()
         WHERE id=$8 RETURNING *`,
        [
          first_name       ?? p.first_name,
          last_name        ?? p.last_name,
          email            !== undefined ? email : p.email,
          phone            !== undefined ? phone : p.phone,
          address          !== undefined ? address : p.address,
          membership_type  ?? p.membership_type,
          is_active        !== undefined ? is_active : p.is_active,
          req.params.id,
        ]
      );
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);

// DELETE /api/patrons/:id
router.delete('/:id', param('id').isInt(), validate, async (req, res, next) => {
  try {
    const { rows: loans } = await db.query(
      `SELECT id FROM loans WHERE patron_id=$1 AND status IN ('ACTIVE','OVERDUE')`,
      [req.params.id]
    );
    if (loans.length) return res.status(409).json({ error: 'Patron has active loans and cannot be deleted' });

    const { rows } = await db.query('DELETE FROM patrons WHERE id=$1 RETURNING *', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Patron not found' });
    res.json({ message: 'Patron deleted', patron: rows[0] });
  } catch (err) { next(err); }
});

// POST /api/patrons/:id/pay-fine  – record a fine payment
router.post('/:id/pay-fine',
  param('id').isInt(),
  body('amount').isFloat({ min: 0.01, max: 99999.99 }).toFloat(),
  body('note').optional().trim().isLength({ min: 0, max: 255 }),
  validate,
  async (req, res, next) => {
    try {
      const { rows: patronRows } = await db.query('SELECT * FROM patrons WHERE id=$1', [req.params.id]);
      if (!patronRows.length) return res.status(404).json({ error: 'Patron not found' });
      const patron = patronRows[0];

      let { amount, note } = req.body;
      // Ensure amount is valid
      amount = Math.max(0.01, Math.min(99999.99, parseFloat(amount)));
      const payment = Math.min(amount, parseFloat(patron.fine_balance));
      if (payment <= 0) return res.status(400).json({ error: 'No outstanding fines' });

      const newBalance = Math.max(0, parseFloat(patron.fine_balance) - payment);
      await db.query('UPDATE patrons SET fine_balance=$1, updated_at=NOW() WHERE id=$2', [newBalance.toFixed(2), req.params.id]);
      await db.query(
        'INSERT INTO fine_payments (patron_id, amount, note) VALUES ($1,$2,$3)',
        [req.params.id, payment.toFixed(2), note || null]
      );

      res.json({ message: 'Payment recorded', paid: payment.toFixed(2), new_balance: newBalance.toFixed(2) });
    } catch (err) { next(err); }
  }
);

module.exports = router;
