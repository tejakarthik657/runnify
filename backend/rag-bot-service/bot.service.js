// rag-bot-service/bot.service.js
// ============================================================
// RAG GAME ASSISTANT — Groq LLaMA-3 (No Local Model)
// ============================================================
// Clean, lightweight RAG bot using Groq API directly
// No FAISS, no local embeddings, no 500MB model downloads
// ============================================================

const Groq = require('groq-sdk');

let groqClient = null;
let isReady = false;
let activeModel = null;

const FALLBACK_MODELS = [
  'groq/compound-mini',
  'qwen/qwen3.6-27b',
  'allam-2-7b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
];

function getModelCandidates() {
  const envModel = process.env.GROQ_MODEL && String(process.env.GROQ_MODEL).trim();
  const ordered = envModel ? [envModel, ...FALLBACK_MODELS] : [...FALLBACK_MODELS];
  return [...new Set(ordered.filter(Boolean))];
}

function isModelUnavailableError(err) {
  const message = err?.message || '';
  const code = err?.error?.code || err?.code || '';
  const status = err?.status || err?.response?.status;
  return (
    status === 400 ||
    status === 404 ||
    code === 'model_decommissioned' ||
    String(message).toLowerCase().includes('decommissioned') ||
    String(message).toLowerCase().includes('not found')
  );
}

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT — defines bot persona and scope
// ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are TerritoryBot, the official game assistant and TACTICAL COPILOT for TerritoryRun.

TerritoryRun is a real-world territory-control game where players run GPS routes to claim hexagonal map cells, invade enemies' territory, earn credits, and compete on leaderboards.

Key Game Facts:
- Claiming a new hex: 10 credits
- Invading someone's hex: 25 credits
- Peak hours (7–9am, 5–7pm): 1.5x credit multiplier
- Territory decay: 2% per idle day (formula: value * 0.98^days)
- Maximum 3 runs per day, max 4 hours per run
- H3 resolution 9: hexes are ~0.1 km² each
- Leaderboards rank by total credits (global and by city)
- Territories turn white and become claimable after heavy decay

Anti-Cheat System:
- Detects speeds >7.5 m/s, teleportation, account farming
- Disqualified runs earn 0 credits
- Repeated violations = shadow ban (no earnings)

As a Tactical Running Copilot, you have 10 CORE FEATURES to assist players on their routes:
1. ⚔️ Rival Intercept Alerts: Warning when other runners are closing in on your territories.
2. 🗺️ Optimal Credit Route Suggestions: High-density unclaimed or decayed paths nearby.
3. ⏰ Peak-Hour Tactical Timers: When to start runs to trigger the 1.5x multiplier.
4. 👾 Boss Raid Coordination: Guiding on active Boss Raid guard-hex statuses.
5. 🛡️ Decay Defense Warnings: Flagging owned hexes with high decay risk.
6. 👤 Stealth Route Planning: Custom routes through unowned "blind spots".
7. 🌦️ Weather Multiplier Maximizers: Factoring dynamic weather conditions for reward boosts.
8. 🧬 Prestige Rebirth Advice: RPG-style progression tip mappings.
9. 📦 Loot Air-Drop Radars: Pointing to geo-located supply crates nearby.
10. 🤝 Wager Duel Scouts: Evaluating potential direct competitive wagers.

You answer questions about:
- Game mechanics, tactical strategy, route optimization, and nearby active runners.
- You can read the player's live location context (if provided) and tell them if other runners are close or suggest a route direction.

You NEVER reveal:
- Absolute home locations of other players (always speak in relative distance like "runner A is 150m away").
- Secret cryptographic keys.

Keep answers tactical, brief, and highly immersive (2–4 sentences max unless a complex route explanation is needed).`;

// ─────────────────────────────────────────────────────────────
// INITIALIZE — set up Groq client
// ─────────────────────────────────────────────────────────────
async function initialize() {
  try {
    if (!process.env.GROQ_API_KEY) {
      console.warn('[RAGBot] No GROQ_API_KEY set — bot disabled');
      return;
    }

    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    activeModel = getModelCandidates()[0] || null;
    isReady = true;
    console.log(`[RAGBot] ✅ Ready — using Groq model ${activeModel || '(auto)'}`);
  } catch (err) {
    console.error('[RAGBot] Initialization failed:', err.message);
  }
}

async function completeWithFallback(messages) {
  const modelCandidates = getModelCandidates();
  let lastError = null;

  for (const model of modelCandidates) {
    try {
      const completion = await groqClient.chat.completions.create({
        model,
        temperature: 0.3,
        max_tokens: 300,
        messages,
      });
      activeModel = model;
      return completion;
    } catch (err) {
      lastError = err;
      if (isModelUnavailableError(err)) {
        console.warn(`[RAGBot] Model unavailable (${model}), trying next fallback...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('No Groq model candidates available');
}

// ─────────────────────────────────────────────────────────────
// QUERY — ask the bot a question
// Returns STRUCTURED RESPONSE with answer + sources
// ─────────────────────────────────────────────────────────────
async function query(userQuestion, mapContext = null) {
  if (!isReady || !groqClient) {
    return {
      answer: 'Bot is currently unavailable.',
      sources: []
    };
  }

  // Safety check — don't answer location/privacy questions outside immediate relative vicinity
  const blockedPhrases = [
    'where is',
    'location of',
    'address of',
    'find user',
    'track',
    'locate',
    'position of'
  ];

  if (blockedPhrases.some(phrase => userQuestion.toLowerCase().includes(phrase)) && !mapContext) {
    return {
      answer: "I can't help with locating other players. Ask me about game mechanics instead!",
      sources: ['TerritoryRun game rules']
    };
  }

  try {
      // Sanitize user question — strip any image URLs or base64 data to prevent
      // "model does not support image input" errors from text-only Groq models.
      const sanitizedQuestion = userQuestion
        .replace(/https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|webp|bmp|svg)/gi, '[image removed]')
        .replace(/data:image\/[a-zA-Z]+;base64,[^\s]+/gi, '[image removed]');

      // Fetch live game data
      const { User, Territory, Run } = require('../config/models');
      const [totalUsers, totalHexes, totalRuns, top5] = await Promise.all([
        User.countDocuments(),
        Territory.countDocuments(),
        Run.countDocuments({ status: 'ended' }),
        User.find()
          .sort({ credits: -1 })
          .limit(5)
          .select('username credits city')
          .lean(),
      ]);

      // Build live context string
      let liveContext = `
  Current game stats (live, real-time):
  - Total players: ${totalUsers}
  - Total hexes claimed: ${totalHexes}
  - Total runs completed: ${totalRuns}
  - Top 5 players: ${top5.map((u, i) => `${i + 1}. ${u.username} (${u.credits} credits, ${u.city || 'Global'})`).join(' | ')}
  `;

      if (mapContext) {
        liveContext += `
  Tactical Map Context (for current user):
  - Current H3 Hex ID: ${mapContext.currentHex || 'Unknown'}
  - Current Coordinates: Lat ${mapContext.userPosition?.lat?.toFixed(5) || 'N/A'}, Lng ${mapContext.userPosition?.lng?.toFixed(5) || 'N/A'}
  - Current Faction: ${mapContext.faction || 'None'}
  - Active Runners in Proximity: ${
    mapContext.activeRunners && mapContext.activeRunners.length > 0
      ? mapContext.activeRunners.map(r => `${r.username} (${r.faction || 'No Faction'}, ${r.distanceMeters}m away)`).join(', ')
      : 'None'
  }
  `;
      }

      // Inject live data into system prompt
      const systemPromptWithContext = SYSTEM_PROMPT + '\n' + liveContext;

      const completion = await completeWithFallback([
        { role: 'system', content: systemPromptWithContext },
        { role: 'user', content: sanitizedQuestion },
      ]);

      const answer = completion.choices[0]?.message?.content || 'No answer generated.';
      return {
        answer,
        sources: ['TerritoryRun game rules (live data)']
      };
  } catch (err) {
    console.error('[RAGBot] Query failed:', err.message);
    return {
      answer: 'An error occurred. Please try again.',
      sources: []
    };
  }
}

// ─────────────────────────────────────────────────────────────
// INGEST — no-op (Groq API mode, no vector store needed)
// ─────────────────────────────────────────────────────────────
async function ingestGameData() {
  // No-op: using Groq API directly, no vector store needed
  console.log('[RAGBot] Groq mode — no ingestion required');
  return 0;
}

module.exports = {
  initialize,
  query,
  ingestGameData,
  getActiveModel: () => activeModel,
  isReady: () => isReady,
};

