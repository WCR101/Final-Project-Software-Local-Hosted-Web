const express = require('express');
const db = require('../db');
const router = express.Router();

// GET /api/fines – all patrons with outstanding fines
router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT p.id, p.first_name, p.last_name, p.email, p.phone,
             p.fine_balance,
             COUNT(l.id) FILTER (WHERE l.status='OVERDUE') AS overdue_loans
      FROM   patrons p
      LEFT JOIN loans l ON l.patron_id = p.id
      WHERE  p.fine_balance > 0
      GROUP BY p.id
      ORDER BY p.fine_balance DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/fines/payments – payment history
router.get('/payments', async (_req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT fp.*, p.first_name || ' ' || p.last_name AS patron_name
      FROM   fine_payments fp
      JOIN   patrons p ON p.id = fp.patron_id
      ORDER  BY fp.paid_at DESC
      LIMIT  100
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
