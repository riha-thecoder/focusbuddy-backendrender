// ✅ Load environment variables
require('dotenv').config();
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ Loaded' : '❌ MISSING');

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const sgMail = require('@sendgrid/mail');
const cron = require('node-cron');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Middlewares
app.use(cors({
  origin: 'http://localhost:3000', // adjust if needed
  credentials: true
}));
app.use(express.json());

// ✅ Load email template
const emailTemplate = fs.readFileSync('email_template.html', 'utf8');

// ✅ PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ✅ Setup SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ✅ Root route
app.get('/', (req, res) => {
  res.send('✅ FocusBuddy backend is running!');
});

// ✅ Session test route
app.get('/session', (req, res) => {
  res.json({ message: '✅ Session loaded successfully!' });
});

// ✅ GET all sessions
app.get('/sessions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sessions ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to load sessions.');
  }
});

// ✅ POST new session
app.post('/sessions', async (req, res) => {
  const { title, description, email } = req.body;
  if (!title || !email) return res.status(400).send('Title and email are required.');

  try {
    const result = await pool.query(
      'INSERT INTO sessions (title, description, email) VALUES ($1, $2, $3) RETURNING *',
      [title, description, email]
    );
    res.status(201).json(result.rows[0]); // ✅ Return the inserted session as JSON
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to add session.');
  }
});


// ✅ DELETE session by ID
app.delete('/sessions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
    res.send('Session deleted.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to delete session.');
  }
});

// ✅ TEST EMAIL route
app.get('/test-email', async (req, res) => {
  const msg = {
    to: 'rihashuaib0715@gmail.com',
    from: 'focusbuddy66@gmail.com',
    subject: 'FocusBuddy Test Email 🐥',
    html: emailTemplate,
  };

  try {
    await sgMail.send(msg);
    res.send('✅ Test email sent! Check your inbox.');
  } catch (err) {
    console.error('❌ Failed to send test email:', err);
    res.status(500).send('❌ Failed to send test email.');
  }
});

// ✅ DAILY REMINDER JOB
cron.schedule('0 8 * * *', async () => {
  console.log('⏰ Running daily reminder emails for all users...');
  try {
    const result = await pool.query('SELECT DISTINCT email FROM sessions');
    const users = result.rows;

    if (users.length === 0) {
      console.log('ℹ️ No users to remind.');
      return;
    }

    for (const user of users) {
      const msg = {
        to: user.email,
        from: 'focusbuddy66@gmail.com',
        subject: 'Your Daily FocusBuddy Reminder 🐥',
        html: emailTemplate,
      };

      await sgMail.send(msg);
      console.log(`✅ Reminder sent to: ${user.email}`);
    }

    console.log('🎉 All reminders sent successfully.');
  } catch (err) {
    console.error('❌ Failed to send reminders:', err);
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

