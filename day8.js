// day8.js
// Day 8 — Authentication with bcrypt and JWT
// Complete auth system from scratch

require('dotenv').config();

const express   = require('express');
const pool      = require('./db');
const authRoutes = require('./auth/authRoutes');
const verifyToken = require('./auth/authMiddleware');

const app  = express();
const PORT = process.env.PORT || 3000;


// ─────────────────────────────────────────
// GLOBAL MIDDLEWARE
// ─────────────────────────────────────────

app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString().slice(11,19)} ${req.method} ${req.url}`);
  next();
});


// ─────────────────────────────────────────
// PUBLIC ROUTES
// No authentication needed
// ─────────────────────────────────────────

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      status:   'ok',
      database: 'connected'
    });
  } catch (err) {
    res.status(500).json({
      status:   'error',
      database: 'disconnected'
    });
  }
});

// All auth routes mounted at /api/auth
// So register becomes /api/auth/register
// And login becomes /api/auth/login
app.use('/api/auth', authRoutes);


// ─────────────────────────────────────────
// PROTECTED ROUTES
// verifyToken middleware runs first
// If token is invalid, route handler never runs
// ─────────────────────────────────────────

// Get all users — only logged in users can see this
app.get('/api/users', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, created_at FROM users ORDER BY created_at DESC'
    );
    res.status(200).json({
      count: result.rows.length,
      users: result.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get one user by id — protected
app.get('/api/users/:id', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID must be a number' });
    }

    const result = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user: result.rows[0] });

  } catch (err) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});


// ─────────────────────────────────────────
// 404 HANDLER — must be after all routes
// ─────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    error:   'Route Not Found',
    message: `${req.method} ${req.url} does not exist`
  });
});


// ─────────────────────────────────────────
// ERROR HANDLER — must be very last
// ─────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Something went wrong' });
});


// ─────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('Auth routes (public):');
  console.log('  POST /api/auth/register');
  console.log('  POST /api/auth/login');
  console.log('  POST /api/auth/refresh');
  console.log('  POST /api/auth/logout');
  console.log('  GET  /api/auth/me  (protected)');
  console.log('');
  console.log('Protected routes (need token):');
  console.log('  GET  /api/users');
  console.log('  GET  /api/users/:id');
});