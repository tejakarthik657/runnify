// utils/rag.ingest.cron.js
// ============================================================
// RAG BOT INGESTION CRON (NO-OP)
// Migrated to use Groq API directly — no vector store needed
// ============================================================
const mongoose = require('mongoose');
require('dotenv').config();

let cronInterval = null;

async function runIngest() {
  // No-op: using Groq API directly, no ingestion required
  console.log('[RAGIngest] Groq mode — no ingestion required');
  return 0;
}

// ── ONE-TIME RUN (for scheduled jobs like GitHub Actions) ────
async function runOnce() {
  console.log('[RAGIngest] Groq mode — nothing to ingest');
}

// ── SCHEDULED RUN (for background processes) ────────────────
async function startRagIngestCron(intervalHours = 6) {
  console.log('[RAGIngest] Groq mode — no cron needed (Groq API mode)');
  return null;
}

// ── STOP THE CRON ──────────────────────────────────────────
function stopRagIngestCron() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
  }
}

// ── EXPORT ─────────────────────────────────────────────────
module.exports = {
  runOnce,
  runIngest,
  startRagIngestCron,
  stopRagIngestCron,
};

// ── RUN DIRECTLY IF CALLED AS SCRIPT ──────────────────────
if (require.main === module) {
  console.log('[RAGIngest] Groq mode — no ingestion task needed');
  process.exit(0);
}
