require('dotenv').config();

const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');

const chatRouter = require('./routes/chat');
const { loadKnowledge } = require('./services/retriever');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

// Protect the API (and your LLM bill) from being flooded
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_PER_MINUTE) || 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many questions in a short time. Please wait a minute and try again.' },
  })
);

// API routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', chatRouter);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Frontend (index.html, style.css, script.js)
app.use(express.static(path.join(__dirname, 'public')));

// Last-resort error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The request could not be read.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'The request is too large.' });
  }
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

// Load the knowledge base once at startup, then listen
const entries = loadKnowledge();
console.log(`Knowledge base loaded: ${entries} entries`);

if (!process.env.GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY is not set. Add it to your .env file to get answers.');
}

app.listen(PORT, () => {
  console.log(`AgriAI is running at http://localhost:${PORT}`);
});