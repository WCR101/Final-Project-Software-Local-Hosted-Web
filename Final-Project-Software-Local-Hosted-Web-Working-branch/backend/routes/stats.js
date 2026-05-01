const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/stats  – dashboard summary
router.get('/', async (_req, res, next) => {
  try {
    const [books, patrons, loans, overdue, fines, recentActivity] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*)                                    AS total,
          COUNT(*) FILTER (WHERE status='IN')         AS available,
          COUNT(*) FILTER (WHERE status='OUT')        AS checked_out,
          COUNT(*) FILTER (WHERE status='LOST')       AS lost
        FROM books
      `),
      db.query(`
        SELECT
          COUNT(*)                                    AS total,
          COUNT(*) FILTER (WHERE is_active=TRUE)      AS active,
          COUNT(*) FILTER (WHERE fine_balance > 0)    AS with_fines,
          COALESCE(SUM(fine_balance),0)               AS total_fines_owed
        FROM patrons
      `),
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('ACTIVE','OVERDUE'))   AS active,
          COUNT(*) FILTER (WHERE status='RETURNED')                AS returned_total,
          COUNT(*) FILTER (WHERE status='OVERDUE')                 AS overdue
        FROM loans
      `),
      db.query(`
        SELECT COUNT(*) AS count, COALESCE(SUM(fine_amount),0) AS total_fines
        FROM loans WHERE status='OVERDUE'
      `),
      db.query(`SELECT COALESCE(SUM(amount),0) AS total_collected FROM fine_payments`),
      db.query(`
        SELECT action, entity, description, created_at
        FROM audit_log ORDER BY created_at DESC LIMIT 10
      `),
    ]);

    res.json({
      books:           books.rows[0],
      patrons:         patrons.rows[0],
      loans:           loans.rows[0],
      overdue:         overdue.rows[0],
      fines_collected: fines.rows[0].total_collected,
      recent_activity: recentActivity.rows,
    });
  } catch (err) { next(err); }
});

module.exports = router;
