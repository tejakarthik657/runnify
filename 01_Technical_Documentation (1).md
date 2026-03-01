# TERRITORY RUN — Technical Development Documentation
> v1.0 — Full Stack Architecture & Implementation Guide

---

## 1. System Overview

TerritoryRun is a real-world territory-control game powered by GPS movement. This document covers every technical component from database schema to deployment pipeline.

---

## 2. Technology Stack

| Layer | Technology | Purpose | Tier |
|---|---|---|---|
| Frontend | Next.js 14 (App Router) | SSR + client routing | Free — Vercel |
| Backend | Node.js + Express | API Gateway & services | Free — Render |
| Database | MongoDB Atlas | Primary data store | Free — 512MB |
| Real-time | Socket.IO | Live GPS streaming | Bundled |
| Map Engine | Leaflet.js + H3-js | Hex grid rendering | Open Source |
| Cache | Upstash Redis | Leaderboard / sessions | Free tier |
| Blockchain | Solana Devnet → Mainnet | Daily proof anchoring | Minimal gas |
| AI Chatbot | Groq API + LangChain | RAG game assistant | Free tier |
| Auth | JWT + bcrypt + OAuth | Stateless auth | Bundled |
| CDN / DNS | Cloudflare | DDoS + edge caching | Free |
| CI/CD | GitHub Actions + Vercel + Render | Auto deploy pipeline | Free |

---

## 3. Monorepo Structure

```
territory-run/
├── frontend/          # Next.js app
│   ├── app/
│   ├── components/
│   ├── hooks/
│   └── services/
├── backend/
│   ├── api-gateway/   # index.js — single entry
│   ├── auth-service/
│   ├── user-service/
│   ├── run-service/   # GPS + H3 + credits
│   ├── map-service/
│   ├── leaderboard-service/
│   ├── chat-service/  # Socket.IO
│   ├── rag-bot-service/
│   ├── blockchain-service/
│   └── config/
├── contracts/         # Solana programs
├── .github/workflows/
└── README.md
```

---

## 4. MongoDB Schema Design

### 4.1 Users Collection

```json
{
  "_id": "ObjectId",
  "username": "string",
  "email": "string",
  "passwordHash": "string",
  "color": "#FF6B35",
  "hashcode": "TR-A4F2",
  "credits": 1200,
  "totalHexes": 450,
  "totalKm": 78.4,
  "rank": 12,
  "schemaVersion": "v1",
  "createdAt": "ISODate",
  "lastActiveAt": "ISODate",
  "privacySettings": {}
}
```

### 4.2 Territories Collection

```json
{
  "_id": "ObjectId",
  "hexId": "8928308280fffff",
  "ownerId": "ObjectId",
  "ownerColor": "#00FF88",
  "ownerUsername": "string",
  "claimedAt": "ISODate",
  "lastInvadedAt": "ISODate",
  "invasionCount": 3,
  "resolution": 8
}
```

**Indexes:** `hexId` (unique), `ownerId`, `claimedAt`

### 4.3 Runs Collection

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "startedAt": "ISODate",
  "endedAt": "ISODate",
  "gpsPoints": [],
  "hexesClaimed": [],
  "hexesInvaded": [],
  "creditsEarned": 84,
  "creditsLost": 0,
  "kmDistance": 5.2,
  "blockchainProofHash": "string",
  "schemaVersion": "v1"
}
```

### 4.4 Versioning Strategy

All documents carry `schemaVersion`. V1 and V2 share the same Atlas cluster but use separate collections (`territories_v1`, `territories_v2`) to eliminate migration headaches.

---

## 5. H3 Hex Engine (Core Algorithm)

### 5.1 Why H3

Uber's H3 library divides the globe into hexagonal cells. At resolution 9, each hex covers approximately 0.1 km². This gives us:

- Easy area math (count hexes)
- Fast lookups (string hex IDs)
- Equal neighbor distances
- Free-tier survivability with MongoDB indexed queries

### 5.2 GPS → Hex Pipeline

```js
// run-service/h3.service.js
const h3 = require('h3-js');

function gpsToHex(lat, lng, resolution = 9) {
  return h3.latLngToCell(lat, lng, resolution);
}

function processRunSegment(points) {
  const hexSet = new Set();
  for (const pt of points) {
    const hexId = gpsToHex(pt.lat, pt.lng);
    hexSet.add(hexId);
  }
  return [...hexSet];
}
```

### 5.3 Credit Engine

```js
// run-service/credit.engine.js
function calculateCredits(hexesClaimed, hexesInvaded, timeOfDay) {
  const base = hexesClaimed.length * 10;
  const invasionBonus = hexesInvaded.length * 25;
  const peakMultiplier = isPeakHour(timeOfDay) ? 1.5 : 1.0;
  return Math.floor((base + invasionBonus) * peakMultiplier);
}

// Decay: unclaimed territory loses 2% value per 24h of inactivity
function applyDecay(territory) {
  const hoursInactive = (Date.now() - territory.lastActiveAt) / 3600000;
  const decayFactor = Math.pow(0.98, Math.floor(hoursInactive / 24));
  return Math.floor(territory.creditValue * decayFactor);
}
```

---

## 6. Real-Time GPS Tracking

### 6.1 Socket.IO Architecture

GPS points stream from client every 3 seconds during an active run. The server batches these into hex IDs and broadcasts territory changes to nearby clients subscribed to the same H3 parent hex zone.

```js
// Client-side tracking (foreground only)
navigator.geolocation.watchPosition((pos) => {
  socket.emit('gps_update', {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    timestamp: Date.now()
  });
}, null, { maximumAge: 0, enableHighAccuracy: true });
```

### 6.2 Rate Limits & Compression

- Max 1 GPS point per 3 seconds per user
- Points with accuracy > 50m are discarded
- GPS coordinates rounded to 5 decimal places
- Max 500 points per run (enforced server-side)
- Run duration capped at 4 hours

---

## 7. REST API Reference

| Method | Route | Description | Auth |
|---|---|---|---|
| POST | /auth/register | Create account + color selection | Public |
| POST | /auth/login | JWT token issue | Public |
| GET | /user/:id/profile | User stats + territory heatmap | JWT |
| POST | /run/start | Begin GPS tracking session | JWT |
| POST | /run/end | Finalise run, process hexes | JWT |
| GET | /map/territories | Hex grid query by bounding box | Public |
| GET | /leaderboard/global | Top 100 users by credits | Public |
| GET | /leaderboard/city/:city | City-scoped leaderboard | Public |
| GET | /notifications/:userId | Invasion alerts + rank changes | JWT |
| POST | /chat/send | Community chat message | JWT |
| GET | /bot/query | RAG chatbot endpoint | Public |
| GET | /blockchain/proof/:date | Daily proof hash lookup | Public |

---

## 8. Authentication System

JWT-based stateless auth. Access tokens expire in 15 minutes; refresh tokens stored in httpOnly cookies with 7-day TTL. OAuth via Google and Apple handled by Passport.js.

Hashcodes (e.g., `TR-A4F2`) are auto-generated 6-character alphanumeric IDs for public identification without exposing usernames.

---

## 9. Blockchain Integration (Solana)

### 9.1 Scope

Blockchain is **NOT** used for live tracking. Its sole purpose is daily proof anchoring for fairness and anti-cheat.

### 9.2 Daily Proof Structure

```js
// blockchain-service/anchor.sync.js
const dailyProof = {
  date: '2024-01-15',
  totalUsers: 1204,
  totalHexesClaimed: 89402,
  topUserId: 'hash_of_userId',
  merkleRoot: sha256(allUserDailySummaries)
};
// Written once per day via cron job at 00:00 UTC
```

### 9.3 Anti-Cheat Value

Each user's daily summary is hashed into a Merkle tree. The root is anchored on-chain. Users can verify their score was not altered post-hoc by comparing their leaf hash against the on-chain root.

---

## 10. RAG Chatbot (Groq + LangChain)

### 10.1 Pipeline

MongoDB exports a daily snapshot of aggregate game data (total users, top territories, credit mechanics). This snapshot is chunked and embedded into a local vector store (FAISS). The Groq LLaMA-3 model queries this store to answer user questions about the game.

### 10.2 Permitted Queries

- How many total hexes have been claimed globally?
- What is the credit formula?
- Who are the current top 10 players?
- What colors are available?
- Explain territory decay mechanics

### 10.3 Blocked Queries

- Individual user live locations (GDPR compliance)
- Another user's exact credit count in real-time
- Live run data of any user

---

## 11. Rate Limiting & Free Tier Guards

| Limit Type | Value | Enforcement |
|---|---|---|
| Max runs per user per day | 3 runs | Redis counter, resets at midnight UTC |
| Max GPS points per run | 500 points | Server-side hard cap |
| Max run duration | 4 hours | Auto-end on server |
| API requests per IP | 100/min | Express rate-limit middleware |
| Chat messages per user | 60/hour | Redis sliding window |
| Blockchain writes | 1/day batch | Cron job, manual override disabled |
| Leaderboard cache TTL | 5 minutes | Upstash Redis |

---

## 12. Testing Strategy

### 12.1 Backend (Jest)

- **Unit:** H3 service, credit engine, decay algorithm
- **Integration:** MongoDB territory queries, Socket.IO room logic
- **Load:** Artillery — simulate 100 concurrent GPS streams

### 12.2 Frontend (Playwright)

- **E2E:** Login → start run → end run → verify hex on map
- **Visual regression** on leaderboard and profile pages

### 12.3 CI Gate

No PR merges to `main` without passing all unit + integration tests. Build failure on Render auto-rolls back to previous deployment.

---

## 13. Security Checklist

- All GPS data encrypted in transit (TLS 1.3)
- No raw coordinates stored beyond run duration
- User coordinates rounded to 5dp (prevents exact tracking)
- Admin endpoints behind separate JWT role
- MongoDB Atlas IP whitelist (Render egress IPs only)
- Rate limiting on all public endpoints
- CORS whitelist: `vercel.app` domain only
- Privacy toggle: users can hide territory from public map

---

*TerritoryRun — Technical Documentation v1.0 | Confidential*
