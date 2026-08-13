// rag-bot-service/routes.js
// ============================================================
// RAG BOT REST API ENDPOINTS
// Provides access to TerritoryBot assistant powered by Groq
// ============================================================
const express = require('express');
const { query, isReady, getActiveModel } = require('./bot.service');
const { authenticateJWT, optionalAuth } = require('../middleware/auth');
const { aiRateLimit } = require('../middleware/rateLimit');

const router = express.Router();

/**
 * GET /bot/health
 * Check if RAG bot is initialized and ready
 */
router.get('/health', (req, res) => {
  const ready = isReady();

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'initializing',
    initialized: ready,
    service: 'RAGBot',
    model: 'Groq LLaMA-3',
  });
});

/**
 * POST /bot/ask
 * Query the RAG bot with a question
 * Returns answer + source information
 */
router.post('/ask', optionalAuth, aiRateLimit, async (req, res, next) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'question (string) required' });
    }

    if (!isReady()) {
      return res.status(503).json({
        error: 'RAG bot not yet initialized. Check /bot/health',
      });
    }

    const maxLength = 500;
    if (question.length > maxLength) {
      return res.status(400).json({
        error: `Question exceeds ${maxLength} characters`,
      });
    }

    const result = await query(question);

    res.json({
      question,
      answer: result.answer,
      sources: result.sources || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /bot/info
 * Get information about the RAG bot
 */
router.get('/info', (req, res) => {
  res.json({
    name: 'TerritoryBot',
    description: 'AI assistant for TerritoryRun game knowledge',
    model: `Groq (${getActiveModel() || process.env.GROQ_MODEL || 'auto-fallback'})`,
    architecture: 'Pure API-based (no local models, no vector store)',
    capabilities: [
      'Answer questions about territory control mechanics',
      'Explain credit calculations and bonuses',
      'Clarify game rules and strategies',
      'Discuss anti-cheat and decay mechanics',
    ],
    limitations: [
      'Does not reveal player locations',
      'Does not leak personal information',
      'Does not provide real-time game statistics',
      'Focuses on game mechanics, not user data',
    ],
  });
});

module.exports = router;

