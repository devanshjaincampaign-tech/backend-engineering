// day5.js

/**
 * DAY 5 — PostgreSQL Connected API
 *
 * Everything from Day 3 (routing) but now
 * connected to a real database instead of
 * a hardcoded array.
 *
 * Key differences from Day 3:
 * - Data persists after server restart
 * - We use async/await for database queries
 * - We use try/catch to handle database errors
 * - We use parameterized queries to prevent SQL injection
 */

require('dotenv').config();

const express = require('express');
const pool    = require('./db'); // import our connection pool

const app  = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────

app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} → ${req.method} ${req.url}`);
  next();
});


// ─────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────

/**
 * GET /health
 * Check server + database are both working
 */
app.get('/health', async (req, res) => {
  try {
    // Run a simple query to verify DB connection works
    await pool.query('SELECT 1');

    res.status(200).json({
      status:    'ok',
      server:    'running',
      database:  'connected',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    res.status(500).json({
      status:   'error',
      server:   'running',
      database: 'disconnected',
      error:    err.message
    });
  }
});


/**
 * GET /api/users
 * Get all users from the database
 *
 * Optional query params:
 * ?name=rahul  → filter by name
 * ?age=20      → filter by age
 */
app.get('/api/users', async (req, res) => {
  try {
    const { name, age } = req.query;

    /**
     * We build the query dynamically based on
     * what query params were provided.
     *
     * We use parameterized queries ($1, $2, etc.)
     * NEVER build SQL by concatenating strings.
     *
     * BAD:  `SELECT * FROM users WHERE name = '${name}'`
     * GOOD: `SELECT * FROM users WHERE name = $1`, [name]
     *
     * The bad version allows SQL injection attacks.
     * The good version is always safe.
     */

    let query  = 'SELECT id, name, email, age, created_at FROM users';
    let params = [];
    let conditions = [];

    if (name) {
      // ILIKE = case-insensitive LIKE
      // % means "anything before or after"
      // So 'rahul' matches 'Rahul Singh', 'rahul kumar', etc.
      conditions.push(`name ILIKE $${params.length + 1}`);
      params.push(`%${name}%`);
    }

    if (age) {
      conditions.push(`age = $${params.length + 1}`);
      params.push(parseInt(age));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    res.status(200).json({
      count: result.rows.length,
      users: result.rows
    });

  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});


/**
 * GET /api/users/:id
 * Get one user by their ID
 */
app.get('/api/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'User ID must be a number'
      });
    }

    /**
     * $1 is replaced by the value in the array [id]
     * PostgreSQL handles the substitution safely
     */
    const result = await pool.query(
      'SELECT id, name, email, age, created_at FROM users WHERE id = $1',
      [id]
    );

    /**
     * result.rows is always an array.
     * If no user found, it's an empty array [].
     * We check length to know if user exists.
     */
    if (result.rows.length === 0) {
      return res.status(404).json({
        error:   'Not Found',
        message: `No user found with id ${id}`
      });
    }

    res.status(200).json({ user: result.rows[0] });

  } catch (err) {
    console.error('Error fetching user:', err.message);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});


/**
 * POST /api/users
 * Create a new user in the database
 */
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, age } = req.body;

    // Basic validation
    if (!name || !email) {
      return res.status(400).json({
        error:   'Validation Failed',
        message: 'name and email are required'
      });
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error:   'Validation Failed',
        message: 'Please provide a valid email address'
      });
    }

    /**
     * RETURNING *
     * After inserting, PostgreSQL returns the full
     * inserted row including the auto-generated id
     * and created_at timestamp.
     * Without RETURNING, you'd have to make a second
     * query to get the new user's data.
     */
    const result = await pool.query(
      `INSERT INTO users (name, email, age)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, age, created_at`,
      [name.trim(), email.toLowerCase().trim(), age || null]
    );

    res.status(201).json({
      message: 'User created successfully',
      user:    result.rows[0]
    });

  } catch (err) {
    /**
     * PostgreSQL error codes:
     * 23505 = unique constraint violation (duplicate email)
     *
     * We check for this specific error and return a
     * helpful message instead of a generic 500 error.
     */
    if (err.code === '23505') {
      return res.status(409).json({
        error:   'Conflict',
        message: 'A user with this email already exists'
      });
    }

    console.error('Error creating user:', err.message);
    res.status(500).json({ error: 'Failed to create user' });
  }
});


/**
 * PUT /api/users/:id
 * Update an existing user
 */
app.put('/api/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error:   'Invalid ID',
        message: 'User ID must be a number'
      });
    }

    const { name, email, age } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        error:   'Validation Failed',
        message: 'name and email are required'
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET name = $1, email = $2, age = $3
       WHERE id = $4
       RETURNING id, name, email, age, created_at`,
      [name.trim(), email.toLowerCase().trim(), age || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error:   'Not Found',
        message: `No user found with id ${id}`
      });
    }

    res.status(200).json({
      message: 'User updated successfully',
      user:    result.rows[0]
    });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        error:   'Conflict',
        message: 'A user with this email already exists'
      });
    }

    console.error('Error updating user:', err.message);
    res.status(500).json({ error: 'Failed to update user' });
  }
});


/**
 * DELETE /api/users/:id
 * Delete a user from the database
 */
app.delete('/api/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error:   'Invalid ID',
        message: 'User ID must be a number'
      });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, name, email',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error:   'Not Found',
        message: `No user found with id ${id}`
      });
    }

    res.status(200).json({
      message:     'User deleted successfully',
      deletedUser: result.rows[0]
    });

  } catch (err) {
    console.error('Error deleting user:', err.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});


// ─────────────────────────────────────────
// 404 HANDLER
// ─────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    error:   'Route Not Found',
    message: `Cannot ${req.method} ${req.url}`
  });
});


// ─────────────────────────────────────────
// ERROR HANDLER
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
  console.log('Routes:');
  console.log('  GET    /health');
  console.log('  GET    /api/users');
  console.log('  GET    /api/users/:id');
  console.log('  POST   /api/users');
  console.log('  PUT    /api/users/:id');
  console.log('  DELETE /api/users/:id');
});