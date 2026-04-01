const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const booksRouter   = require('./routes/books');
const patronsRouter = require('./routes/patrons');
const loansRouter   = require('./routes/loans');
const statsRouter   = require('./routes/stats');
const finesRouter   = require('./routes/fines');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ──────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────
app.use('/api/books',   booksRouter);
app.use('/api/patrons', patronsRouter);
app.use('/api/loans',   loansRouter);
app.use('/api/stats',   statsRouter);
app.use('/api/fines',   finesRouter);

// ── Health check ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

// ── 404 ─────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Error handler ────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => console.log(`📚 Library API running on port ${PORT}`));
