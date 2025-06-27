const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const port = 5050;

// Enable CORS for all origins (for frontend localhost:5501)
app.use(cors());
app.use(bodyParser.json());

// PostgreSQL connection setup
const pool = new Pool({
  user: 'postgres',           // change if your db user is different
  host: 'localhost',
  database: 'focusbuddy',     // make sure this DB exists
  password: 'yourpassword',   // update with your actual PostgreSQL password
  port: 5432,
});

// Test DB connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Connected to PostgreSQL');
  release();
});

// Routes

// Get all sessions
app.get('/sessions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sessions ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching sessions:', err.message);
    res.status(500).send('Server error fetching sessions');
  }
});

// Add new session
app.post('/sessions', async (req, res) => {
  try {
    const { title, description, email, category, date } = req.body;
    const result = await pool.query(
      'INSERT INTO sessions (title, description, email, category, date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, email, category, date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error saving session:', err.message);
    res.status(500).send('Server error saving session');
  }
});
// Update session by ID
app.put('/sessions/:id', async (req, res) => {
  try {
    const { title, description, email, category, date } = req.body;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE sessions
       SET title = $1, description = $2, email = $3, category = $4, date = $5
       WHERE id = $6
       RETURNING *`,
      [title, description, email, category, date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Session not found');
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating session:', err.message);
    res.status(500).send('Server error updating session');
  }
});

// Delete session by ID
app.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM sessions WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Session not found');
    }

    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting session:', err.message);
    res.status(500).send('Server error deleting session');
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
