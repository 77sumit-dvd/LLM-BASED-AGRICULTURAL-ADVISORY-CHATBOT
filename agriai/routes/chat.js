const express = require('express');

const { processQuery } = require('../services/queryProcessor');
const { retrieve } = require('../services/retriever');
const { generateAnswer } = require('../services/llm');

const router = express.Router();

const MAX_LENGTH = Number(process.env.MAX_QUESTION_LENGTH) || 500;
const TOP_K = Number(process.env.TOP_K) || 3;
const MAX_HISTORY = 6;

// Keep only well-formed recent turns sent by the frontend
function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim()
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
}

function lastUserMessage(history) {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'user') return history[i].content;
  }
  return '';
}

// POST /api/chat   body: { message: string, history?: [{role, content}] }
router.post('/chat', async (req, res) => {
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';

  if (!message) {
    return res.status(400).json({ error: 'Please type a question first.' });
  }
  if (message.length > MAX_LENGTH) {
    return res
      .status(400)
      .json({ error: `Please keep your question under ${MAX_LENGTH} characters.` });
  }

  const history = cleanHistory(req.body.history);

  try {
    // 1. Query processing: understand the question
    let query = processQuery(message);

    // Short follow-ups ("and for rice?") borrow context from the previous question
    const previous = lastUserMessage(history);
    if (!query.isGreeting && query.tokens.length <= 3 && previous) {
      query = processQuery(`${previous} ${message}`);
    }

    // 2. Knowledge retrieval: find the relevant entries (skipped for greetings)
    const context = query.isGreeting ? [] : retrieve(query, TOP_K);

    // 3. LLM-based advisory: write the answer from question + retrieved context
    const reply = await generateAnswer({ message, history, context });

    // 4. Response generation: send the answer and what it was drawn from
    const sources = [...new Set(context.map((c) => c.label))];
    res.json({ reply, sources });
  } catch (err) {
    if (err.code === 'NO_API_KEY') {
      console.error(err.message);
      return res
        .status(503)
        .json({ error: 'The advisory service is not set up yet. Please contact the administrator.' });
    }
    if (err.status === 429) {
      console.error('LLM rate limit reached:', err.message);
      return res
        .status(429)
        .json({ error: 'Too many questions right now. Please wait a minute and try again.' });
    }
    if (err.status) {
      // Error returned by the LLM API
      console.error(`LLM API error (${err.status}):`, err.message);
      return res
        .status(502)
        .json({ error: 'The advisory service is busy right now. Please try again in a moment.' });
    }
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
  }
});

module.exports = router;