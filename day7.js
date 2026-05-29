// day7.js
// Complete CRUD API with PostgreSQL
// Day 7 — Adding PUT (update) and DELETE

// Load environment variables from .env file
// This must be the very first line
require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');

const app  = express();
const PORT = process.env.PORT || 3000;


// ─────────────────────────────────────────
// DATABASE CONNECTION
//
// Pool = a group of database connections
// kept open and reused. Much faster than
// creating a new connection every request.
// ─────────────────────────────────────────

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test connection when server starts
pool.connect((err, client, release) => {
  if (err) {
    console.error('Failed to connect to database:', err.message);
    return;
  }
  console.log('Connected to PostgreSQL successfully');
  release();
});


// ─────────────────────────────────────────
// MIDDLEWARE
//
// Middleware runs before your routes.
// express.json() reads the JSON body
// from requests like POST and PUT.
// Without this, req.body is undefined.
// ─────────────────────────────────────────

app.use(express.json());

// Simple request logger
// Prints every request to your terminal
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});


// ─────────────────────────────────────────
// ROUTE 1 — GET /health
//
// Always have a health check route.
// Used to verify server + DB are working.
// ─────────────────────────────────────────

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1'); // simple query to test DB
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


// ─────────────────────────────────────────
// ROUTE 2 — GET /api/users
//
// Returns all users from the database.
// Also supports optional filtering:
//   ?name=rahul  → users whose name contains "rahul"
//   ?age=20      → users who are exactly 20 years old
// ─────────────────────────────────────────

app.get('/api/users', async (req, res) => {
  try {

    const { name, age } = req.query;

    // Start with a base query
    let query      = 'SELECT * FROM users';
    let params     = [];
    let conditions = [];

    // If name was provided in URL → add a filter
    if (name) {
      conditions.push(`name ILIKE $${params.length + 1}`);
      params.push(`%${name}%`);
      // ILIKE = case insensitive search
      // %rahul% means "anything before or after rahul"
    }

    // If age was provided → add a filter
    if (age) {
      conditions.push(`age = $${params.length + 1}`);
      params.push(parseInt(age));
    }

    // Join conditions with AND if any exist
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Always sort by newest first
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    res.status(200).json({
      count: result.rows.length,
      users: result.rows
    });

  } catch (err) {
    console.error('Error getting users:', err.message);
    res.status(500).json({ error: 'Failed to get users' });
  }
});


// ─────────────────────────────────────────
// ROUTE 3 — GET /api/users/:id
//
// Returns one specific user by their ID.
// :id is a placeholder — Express fills it
// with whatever is in the URL.
//
// Example: GET /api/users/3
// req.params.id will be the string "3"
// ─────────────────────────────────────────

app.get('/api/users/:id', async (req, res) => {
  try {

    // req.params.id is always a STRING
    // "3" not 3 — so convert it to a number
    const id = parseInt(req.params.id);

    // If someone sends /api/users/abc
    // parseInt("abc") returns NaN
    // We catch that here
    if (isNaN(id)) {
      return res.status(400).json({
        error:   'Bad Request',
        message: 'ID must be a number'
      });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
      // $1 gets replaced by the value in the array
      // This prevents SQL injection — never concatenate strings
    );

    // result.rows is always an array
    // Empty array [] if no user found
    if (result.rows.length === 0) {
      return res.status(404).json({
        error:   'Not Found',
        message: `No user found with id ${id}`
      });
    }

    // .rows[0] because we want the first (and only) result
    res.status(200).json({ user: result.rows[0] });

  } catch (err) {
    console.error('Error getting user:', err.message);
    res.status(500).json({ error: 'Failed to get user' });
  }
});


// ─────────────────────────────────────────
// ROUTE 4 — POST /api/users
//
// Creates a brand new user.
// Client sends name, email, age in the body.
// We validate, then insert into database.
// ─────────────────────────────────────────

app.post('/api/users', async (req, res) => {
  try {

    const { name, email, age } = req.body;

    // Validation — check required fields exist
    if (!name || !email) {
      return res.status(400).json({
        error:   'Validation Failed',
        message: 'name and email are required'
      });
    }

    // Check email format with a simple regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error:   'Validation Failed',
        message: 'Email is not valid'
      });
    }

    // RETURNING * means:
    // after inserting, give me back the full row
    // including the auto-generated id and created_at
    const result = await pool.query(
      `INSERT INTO users (name, email, age)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), email.toLowerCase().trim(), age || null]
    );

    res.status(201).json({
      message: 'User created successfully',
      user:    result.rows[0]
    });

  } catch (err) {
    // Error code 23505 = duplicate unique value
    // This happens when someone uses an email that already exists
    if (err.code === '23505') {
      return res.status(409).json({
        error:   'Conflict',
        message: 'This email is already registered'
      });
    }

    console.error('Error creating user:', err.message);
    res.status(500).json({ error: 'Failed to create user' });
  }
});


// ─────────────────────────────────────────
// ROUTE 5 — PUT /api/users/:id
//
// THIS IS NEW TODAY.
//
// Updates an existing user.
// Client sends the new name, email, age.
// We find the user, then replace their data.
//
// PUT = full replacement
// You send all fields, even ones you don't change
//
// Example:
// PUT /api/users/1
// Body: { "name": "Rahul Kumar", "email": "rahul@example.com", "age": 25 }
// ─────────────────────────────────────────

app.put('/api/users/:id', async (req, res) => {
  try {

    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error:   'Bad Request',
        message: 'ID must be a number'
      });
    }

    const { name, email, age } = req.body;

    // Validate that required fields are present
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
        message: 'Email is not valid'
      });
    }

    // UPDATE the user in the database
    // SET   → which columns to change and what values
    // WHERE → which row to update (by id)
    // RETURNING * → give back the updated row
    const result = await pool.query(
      `UPDATE users
       SET   name  = $1,
             email = $2,
             age   = $3
       WHERE id = $4
       RETURNING *`,
      [name.trim(), email.toLowerCase().trim(), age || null, id]
    );

    // If no rows returned → that id doesn't exist
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
    // Duplicate email error
    if (err.code === '23505') {
      return res.status(409).json({
        error:   'Conflict',
        message: 'This email is already used by another user'
      });
    }

    console.error('Error updating user:', err.message);
    res.status(500).json({ error: 'Failed to update user' });
  }
});


// ─────────────────────────────────────────
// ROUTE 6 — DELETE /api/users/:id
//
// THIS IS NEW TODAY.
//
// Removes a user permanently from database.
// Once deleted, they are gone forever.
//
// Example:
// DELETE /api/users/2
// ─────────────────────────────────────────

app.delete('/api/users/:id', async (req, res) => {
  try {

    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error:   'Bad Request',
        message: 'ID must be a number'
      });
    }

    // DELETE the row WHERE id matches
    // RETURNING * → gives back the deleted row
    // This lets us confirm what was deleted
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [id]
    );

    // If nothing was deleted → that id didn't exist
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
// ROUTE 7 — PATCH /api/users/:id
//
// BONUS — this is the difference between PUT and PATCH.
//
// PUT   = full replacement (send all fields)
// PATCH = partial update (send only what changed)
//
// Example:
// PATCH /api/users/1
// Body: { "age": 25 }
// Only age changes. Name and email stay the same.
// ─────────────────────────────────────────

app.patch('/api/users/:id', async (req, res) => {
  try {

    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error:   'Bad Request',
        message: 'ID must be a number'
      });
    }

    // At least one field must be provided
    const { name, email, age } = req.body;

    if (!name && !email && age === undefined) {
      return res.status(400).json({
        error:   'Validation Failed',
        message: 'Provide at least one field to update'
      });
    }

    // First check if user exists
    const existing = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        error:   'Not Found',
        message: `No user found with id ${id}`
      });
    }

    const currentUser = existing.rows[0];

    // Use provided value OR fall back to existing value
    // This is what makes PATCH different from PUT
    const updatedName  = name  ? name.trim()                  : currentUser.name;
    const updatedEmail = email ? email.toLowerCase().trim()   : currentUser.email;
    const updatedAge   = age !== undefined ? age              : currentUser.age;

    const result = await pool.query(
      `UPDATE users
       SET   name  = $1,
             email = $2,
             age   = $3
       WHERE id = $4
       RETURNING *`,
      [updatedName, updatedEmail, updatedAge, id]
    );

    res.status(200).json({
      message: 'User partially updated',
      user:    result.rows[0]
    });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        error:   'Conflict',
        message: 'This email is already used by another user'
      });
    }

    console.error('Error patching user:', err.message);
    res.status(500).json({ error: 'Failed to update user' });
  }
});


// ─────────────────────────────────────────
// 404 HANDLER
//
// If someone hits a URL that doesn't exist
// in your routes above, this catches it.
// Must be AFTER all routes.
// ─────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    error:   'Route Not Found',
    message: `${req.method} ${req.url} does not exist`
  });
});


// ─────────────────────────────────────────
// ERROR HANDLER
//
// Catches any error that was not handled above.
// Must be the very last middleware.
// Must have exactly 4 parameters.
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
  console.log('Available routes:');
  console.log('  GET    /health');
  console.log('  GET    /api/users');
  console.log('  GET    /api/users/:id');
  console.log('  POST   /api/users');
  console.log('  PUT    /api/users/:id');
  console.log('  PATCH  /api/users/:id');
  console.log('  DELETE /api/users/:id');
});