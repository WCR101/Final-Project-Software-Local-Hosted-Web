const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../db');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /api/books  – list all, optional search
router.get('/', async (req, res, next) => {
  try {
    const { search, status } = req.query;
    let text = 'SELECT * FROM books WHERE 1=1';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      text += ` AND (title ILIKE $${params.length} OR author ILIKE $${params.length} OR isbn ILIKE $${params.length})`;
    }
    if (status) {
      params.push(status.toUpperCase());
      text += ` AND status = $${params.length}`;
    }
    text += ' ORDER BY id';

    const result = await db.query(text, params);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/books/:id
router.get('/:id', param('id').isInt(), validate, async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM books WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Book not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/books
router.post('/',
  body('title').trim().notEmpty().isLength({ min: 1, max: 255 }),
  body('author').trim().notEmpty().isLength({ min: 1, max: 255 }),
  body('isbn').optional().trim().isLength({ min: 0, max: 20 }).matches(/^[0-9-]*$/),
  body('cost').optional().isFloat({ min: 0, max: 9999.99 }).toFloat(),
  body('status').optional().isIn(['IN', 'OUT', 'LOST']),
  validate,
  async (req, res, next) => {
    try {
      const { title, author, isbn, cost = 0, status = 'IN' } = req.body;
      const { rows } = await db.query(
        `INSERT INTO books (title, author, isbn, cost, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [title, author, isbn || null, Math.max(0, Math.min(9999.99, parseFloat(cost))), status]
      );
      await db.query(
        `INSERT INTO audit_log (action, entity, entity_id, description)
         VALUES ('CREATE', 'book', $1, $2)`,
        [rows[0].id, `Added book: ${title}`]
      );
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  }
);

// PUT /api/books/:id
router.put('/:id',
  param('id').isInt(),
  body('title').optional().trim().notEmpty().isLength({ min: 1, max: 255 }),
  body('author').optional().trim().notEmpty().isLength({ min: 1, max: 255 }),
  body('isbn').optional().trim().isLength({ min: 0, max: 20 }).matches(/^[0-9-]*$/),
  body('cost').optional().isFloat({ min: 0, max: 9999.99 }).toFloat(),
  body('status').optional().isIn(['IN', 'OUT', 'LOST']),
  validate,
  async (req, res, next) => {
    try {
      const { title, author, isbn, cost, status } = req.body;
      const { rows: existing } = await db.query('SELECT * FROM books WHERE id = $1', [req.params.id]);
      if (!existing.length) return res.status(404).json({ error: 'Book not found' });

      const b = existing[0];
      const { rows } = await db.query(
        `UPDATE books SET title=$1, author=$2, isbn=$3, cost=$4, status=$5, updated_at=NOW()
         WHERE id=$6 RETURNING *`,
        [
          title  ?? b.title,
          author ?? b.author,
          isbn   !== undefined ? isbn : b.isbn,
          cost   !== undefined ? Math.max(0, Math.min(9999.99, parseFloat(cost))) : b.cost,
          status ?? b.status,
          req.params.id,
        ]
      );
      await db.query(
        `INSERT INTO audit_log (action, entity, entity_id, description) VALUES ('UPDATE','book',$1,$2)`,
        [rows[0].id, `Updated book: ${rows[0].title}`]
      );
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);

// DELETE /api/books/:id
router.delete('/:id', param('id').isInt(), validate, async (req, res, next) => {
  try {
    // Check for active loans
    const { rows: loans } = await db.query(
      `SELECT id FROM loans WHERE book_id=$1 AND status IN ('ACTIVE','OVERDUE')`,
      [req.params.id]
    );
    if (loans.length) return res.status(409).json({ error: 'Book has active loans and cannot be deleted' });

    const { rows } = await db.query('DELETE FROM books WHERE id=$1 RETURNING *', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Book not found' });

    await db.query(
      `INSERT INTO audit_log (action, entity, entity_id, description) VALUES ('DELETE','book',$1,$2)`,
      [req.params.id, `Deleted book: ${rows[0].title}`]
    );
    res.json({ message: 'Book deleted', book: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
