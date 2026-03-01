# Territory Run - AI & Blockchain Integration Guide

## 🤖 AI/RAG Features Implemented

### RAG Bot Service (Python)
Located in `backend/rag-bot-service/`

#### Key Features:
1. **Document Ingestion** (`ingest.py`)
   - Loads and chunks documentation
   - Creates FAISS vector embeddings
   - Generates audit hashes for blockchain verification
   - Supports Markdown and text files

2. **Query Service** (`query.py`)
   - FastAPI-based REST API
   - Retrieves relevant context using vector similarity
   - Uses Groq LLM (Mixtral) for responses
   - Returns audit hashes for every query
   - Tracks sources and context used

3. **Daily Snapshots** (`snapshot.py`)
   - Exports MongoDB data for RAG ingestion
   - Creates knowledge documents from territories, leaderboard, and runs
   - Scheduled daily at 00:00 UTC
   - Updates bot's knowledge base automatically

#### Usage:
```bash
cd backend/rag-bot-service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Ingest documentation
python ingest.py

# Start query service
python query.py
# API available at http://localhost:8000
```

#### API Endpoints:
- `POST /query` - Ask questions to the bot
  ```json
  {
    "question": "How do I capture territory?",
    "user_address": "0x123..."
  }
  ```

- `GET /health` - Check service status

### Chat Integration
- Bot responds to messages starting with `@bot` or `?`
- Integrated with WebSocket chat service
- Context-aware responses based on game data
- Returns sources for verification

---

## 🔗 Blockchain Features Implemented

### Solana/Anchor Audit Trail
Located in `backend/blockchain-service/`

#### Key Features:
1. **Daily Proof Generation** (`anchor.sync.js`)
   - Creates Merkle root from all territory states
   - Generates audit hash from daily statistics
   - Commits proof to Solana blockchain
   - Stores proof record in MongoDB

2. **Automated Scheduling** (`cron.js`)
   - Runs daily at 00:00 UTC
   - Automatic blockchain commit
   - Error handling and logging

3. **Proof Verification** 
   - Verify historical proofs
   - Check on-chain data integrity
   - Audit trail for all territory changes

#### Data Structure:
```javascript
{
  date: Date,
  merkleRoot: "0x...",      // Hash of all territories
  auditHash: "0x...",        // Hash of daily stats
  transactionHash: "...",    // Solana tx signature
  territoryCount: 1234,
  playerCount: 567,
  runCount: 89
}
```

---

## 🔐 Authentication Features

### Dual Authentication System
Located in `backend/middleware/auth.js`

#### 1. JWT Authentication
- Standard bearer token auth
- 7-day access tokens
- 30-day refresh tokens
- Used for regular API calls

#### 2. Web3 Wallet Authentication
- Ethereum signature verification
- Support for MetaMask, WalletConnect, etc.
- Message signing for proof of ownership
- 5-minute signature validity (prevents replay attacks)
- Used for blockchain features

#### Usage:
```javascript
// JWT Auth
headers: {
  Authorization: 'Bearer <token>'
}

// Wallet Auth
POST /api/auth/wallet
{
  address: "0x123...",
  message: "{\"action\":\"login\",\"timestamp\":\"2026-03-01T12:00:00Z\"}",
  signature: "0xabc..."
}
```

---

## 🚦 Rate Limiting

### Multi-Tier Rate Limiting
Located in `backend/middleware/rateLimit.js`

Uses Redis for distributed rate limiting across multiple server instances.

#### Rate Limits:
1. **Standard API**: 100 req/15min per IP
2. **Auth Endpoints**: 5 req/15min per IP (strict)
3. **GPS Stream**: 360 req/min per user (6/sec)
4. **AI Queries**: 20 req/hour per user
5. **Blockchain Tx**: 10 req/hour per user

#### Features:
- Per-user tracking (authenticated users)
- IP-based fallback (anonymous users)
- Custom limits per endpoint
- Automatic retry-after headers

---

## 📊 Key Integrations

### 1. Chat with AI Bot
```
User: @bot How do I earn credits?
Bot: You earn credits by running and capturing hexagons...
     Sources: [docs/gameplay.md, snapshot_20260301.md]
```

### 2. Blockchain Audit Trail
```
Daily Cron (00:00 UTC)
  ↓
Collect all territories
  ↓
Generate Merkle root
  ↓
Create audit hash
  ↓
Commit to Solana
  ↓
Store proof in MongoDB
```

### 3. RAG Pipeline
```
User Question
  ↓
Embed question (sentence-transformers)
  ↓
Search vector store (FAISS)
  ↓
Retrieve top 5 contexts
  ↓
Send to Groq LLM (Mixtral)
  ↓
Return answer + sources + audit hash
```

---

## 🛠️ Configuration

### Environment Variables Required:

```env
# AI/RAG
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
RAG_BOT_URL=http://localhost:8000

# Blockchain
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WALLET_PRIVATE_KEY=<base58_private_key>

# Redis (for rate limiting)
UPSTASH_REDIS_URL=https://xxxx.upstash.io
UPSTASH_REDIS_TOKEN=your_token_here

# MongoDB
MONGODB_URI=mongodb+srv://...

# JWT
JWT_SECRET=your_64_char_secret
JWT_REFRESH_SECRET=another_64_char_secret
```

---

## 🚀 Running the Stack

### 1. Start Backend Services
```bash
cd backend
npm run dev
# API Gateway on port 5000
```

### 2. Start RAG Bot
```bash
cd backend/rag-bot-service
.\venv\Scripts\activate
python query.py
# RAG Bot on port 8000
```

### 3. Trigger Daily Proof (Manual)
```bash
node -e "require('./backend/blockchain-service/cron').triggerManually()"
```

---

## 📈 Monitoring & Logs

### Winston Logging
- All logs in `backend/logs/`
- Daily rotation (14 day retention)
- Separate error logs
- Structured JSON format

### Key Metrics to Monitor:
- RAG query response time
- Blockchain proof success rate
- Rate limit violations
- WebSocket connections
- GPS stream throughput

---

## 🔒 Security Features

1. **Audit Hashes** - Every AI response has verifiable hash
2. **Blockchain Proofs** - Daily immutable territory snapshots
3. **Signature Verification** - Wallet auth prevents impersonation
4. **Rate Limiting** - Prevents abuse and DDoS
5. **Token Expiry** - Short-lived access tokens
6. **Input Validation** - All endpoints validated

---

## 📚 Additional Resources

- **Groq API**: https://console.groq.com/
- **FAISS**: https://github.com/facebookresearch/faiss
- **Solana Docs**: https://docs.solana.com/
- **Upstash Redis**: https://upstash.com/

---

*Generated on March 1, 2026*
