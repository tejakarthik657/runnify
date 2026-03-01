# TERRITORY RUN — Complete Product Documentation
> Version 1.0 · 2024
>
> *A real-world territory-control game powered by GPS movement.*

---

## Table of Contents

| Chapter | Document | Purpose |
|---|---|---|
| 1 | Product Vision & Concept | What it is, who it's for, why it works |
| 2 | Technical Architecture | Backend, database, algorithms, APIs |
| 3 | UX & Psychology | Player psychology, engagement loops, personas |
| 4 | UI Design System | Visual language, components, page specs |
| 5 | Deployment & Infrastructure | CI/CD, hosting, environment management |
| 6 | Roadmap & Future | V1 → V2 feature planning |

---

# CHAPTER 1 — Product Vision
> What TerritoryRun is, who it's for, and why it wins

---

## 1.1 The One-Line Pitch

You run IRL. Your path becomes territory. Others invade it. You fight back. Repeat.

Think **Pokémon GO × Risk × Strava** — with none of the bloat and all of the psychological pull.

---

## 1.2 The Core Loop

| Step | What Happens | Why It Matters |
|---|---|---|
| 1. Run | User starts a GPS-tracked run | Physical action required — no passive play |
| 2. Claim | GPS path converts to H3 hex grid claims | Visual ownership appears immediately |
| 3. Earn | Credits earned per hex claimed | Tangible reward for movement |
| 4. Defend | Others invade your hexes | Loss aversion triggers return visits |
| 5. Compete | Leaderboard rank updates live | Social hierarchy creates status game |
| 6. Repeat | Decay + invasions force ongoing engagement | Game plays itself even when you're offline |

---

## 1.3 Target Audience

| Segment | Profile | Current Pain | How TerritoryRun Solves It |
|---|---|---|---|
| Lapsed Runners | Ran consistently, stopped. 25–35 age. | No motivation, pure fitness is boring | Competition and ownership create external motivation |
| Competitive Athletes | Strava users who want more | Strava is social but not competitive | Real stakes — someone takes your territory |
| Mobile Gamers | Play Pokémon GO, Ingress | Want more physical requirement in games | Pure GPS movement — no taps, no items |
| Urban Explorers | Run to discover new areas | No record of exploration | Territory map is a permanent log of everywhere they've been |

---

## 1.4 Competitive Positioning

| Product | Movement Required | Territory Mechanic | Social Competition | Open Source Map |
|---|---|---|---|---|
| **TerritoryRun** | ✅ Real GPS run | ✅ Hex grid ownership | ✅ Real-time invasions | ✅ Leaflet |
| Pokémon GO | ⚠️ Walk only | ❌ No territory | ⚠️ Team gyms | ❌ Google Maps |
| Strava | ✅ Full activity | ❌ No territory | ⚠️ Segments only | ✅ Various |
| Ingress | ✅ Required | ⚠️ Portal links | ✅ Faction war | ✅ Various |

---

## 1.5 V1 Scope — What We Ship First

V1 is a **game**, not a fitness revolution. These are the only features that matter:

- GPS run tracking (foreground only)
- H3 hex territory claiming and invasion
- Credit economy with decay
- Global + city leaderboards
- Invasion notifications
- Global map with color-coded territory
- Community chat (3 channels)
- RAG game assistant chatbot
- Daily blockchain proof anchor
- Rate limiting + free-tier guards

Everything else is V2. **Everything.**

---

# CHAPTER 2 — Technical Architecture
> Backend systems, algorithms, database schema, and API design

---

## 2.1 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14 + Tailwind CSS | SSR + client routing |
| Backend | Node.js + Express (Modular Monolith) | API gateway + service modules |
| Real-time | Socket.IO | Live GPS streaming during runs |
| Database | MongoDB Atlas (M0 Free) | Primary data store |
| Cache | Upstash Redis | Leaderboard caching + rate limiting |
| Map | Leaflet.js + H3-js | Hex grid on open map tiles |
| Auth | JWT (15min) + Refresh (7d) + OAuth | Stateless authentication |
| Blockchain | Solana (daily cron) | Immutable daily proof anchoring |
| AI Bot | Groq LLaMA-3 + LangChain RAG | Game assistant with live data |
| CI/CD | GitHub Actions + Vercel + Render | Automated pipeline, zero cost |

---

## 2.2 Backend Structure

```
backend/
├── api-gateway/        # index.js — single entry point
├── auth-service/
│   ├── routes.js
│   └── jwt.js
├── user-service/
│   └── profile.controller.js
├── run-service/
│   ├── gps.processor.js
│   ├── h3.service.js
│   └── credit.engine.js
├── map-service/
│   └── territory.query.js
├── leaderboard-service/
│   └── leaderboard.logic.js
├── chat-service/
│   └── socket.js
├── rag-bot-service/
│   ├── ingest.py
│   ├── query.py
│   └── vector_store/
├── blockchain-service/
│   └── anchor.sync.js
└── config/
```

---

## 2.3 H3 Hex Algorithm — The Core Engine

The entire game is built on Uber's H3 hexagonal grid system. At resolution 9, each hex covers ~0.1 km². Every GPS coordinate is converted to a hex ID — a 15-character string.

```js
const h3 = require('h3-js');

// Convert GPS → hex ID
const hexId = h3.latLngToCell(lat, lng, 9);
// e.g. '8928308280fffff'

// Territory document:
{ hexId: '8928308280fffff', ownerId: 'user_xyz',
  ownerColor: '#00FF88', claimedAt: ISODate() }
```

---

## 2.4 Credit Formula

```
credits = (hexesClaimed × 10)
        + (hexesInvaded × 25)     // bonus for invasions
        × peakHourMultiplier      // 1.5x during 6–9am, 5–8pm

// Decay: −2% per 24h of inactive hexes
decayedValue = hexCount × Math.pow(0.98, daysInactive)
```

---

## 2.5 MongoDB Schema

### Users
```json
{ "_id": "ObjectId", "username": "string", "color": "#FF6B35",
  "hashcode": "TR-A4F2", "credits": 1200, "totalHexes": 450,
  "totalKm": 78.4, "rank": 12, "schemaVersion": "v1" }
```

### Territories
```json
{ "_id": "ObjectId", "hexId": "8928308280fffff",
  "ownerId": "ObjectId", "ownerColor": "#00FF88",
  "claimedAt": "ISODate", "invasionCount": 3 }
```

### Runs
```json
{ "_id": "ObjectId", "userId": "ObjectId",
  "hexesClaimed": [], "hexesInvaded": [],
  "creditsEarned": 84, "kmDistance": 5.2,
  "blockchainProofHash": "string", "schemaVersion": "v1" }
```

---

## 2.6 API Reference

| Route | Method | Description |
|---|---|---|
| `/auth/register` | POST | Account creation + color/username selection |
| `/auth/login` | POST | JWT issue + refresh cookie |
| `/run/start` | POST | Begin GPS session |
| `/run/end` | POST | Process hexes, award credits, trigger notifications |
| `/map/territories` | GET | Bounding box hex query for map rendering |
| `/leaderboard/global` | GET | Top 100, cached 5 minutes |
| `/leaderboard/city/:city` | GET | City-scoped ranking |
| `/notifications/:id` | GET | Unread invasion + rank alerts |
| `/bot/query` | GET | RAG chatbot response |
| `/blockchain/proof/:date` | GET | On-chain hash retrieval |

---

## 2.7 Real-Time GPS Tracking

```js
// Client-side (foreground only — no background tracking)
navigator.geolocation.watchPosition((pos) => {
  socket.emit('gps_update', {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    timestamp: Date.now()
  });
}, null, { maximumAge: 0, enableHighAccuracy: true });
```

**Rate limits:** 1 point per 3 seconds, max 500 points per run, accuracy > 50m discarded.

---

## 2.8 Rate Limiting & Free Tier Guards

| Limit | Value | Enforcement |
|---|---|---|
| Max runs per user/day | 3 | Redis counter |
| Max GPS points per run | 500 | Server-side cap |
| Max run duration | 4 hours | Auto-end |
| API requests per IP | 100/min | Express middleware |
| Leaderboard cache TTL | 5 minutes | Upstash Redis |
| Blockchain writes | 1/day | Cron job only |

---

# CHAPTER 3 — UX & Psychology
> Why players come back, behavioral mechanics, and ethical guardrails

---

## 3.1 Three Core Psychological Levers

| Lever | Mechanism | Feature That Activates It |
|---|---|---|
| Ownership Bias | People value what they've built. Losing it hurts. | Territory visible on public map in user's color |
| Loss Aversion | Loss hurts 2× more than equivalent gain feels good. | Invasion notification with exact credit loss |
| Social Visibility | Status is only real if others see it. | City map dominated by top player's color |

---

## 3.2 The Habit Loop

| Phase | Trigger | Reward | Retention Driver |
|---|---|---|---|
| Day 1 | App discovery + curiosity | First territory claimed | Identity investment (my color) |
| Day 2-7 | Invasion notification | Reclaim run, credits restored | Revenge motivation |
| Week 2-4 | Rank visibility | Leaderboard climb | Competitive drive |
| Month 2+ | Named rivalry with specific opponent | Community recognition | Social bonds |

---

## 3.3 Player Personas

| Persona | Primary Drive | Key Feature Need |
|---|---|---|
| The Expander | Maximize claimed area | Large-scale map view, km stats |
| The Defender | Protect home turf | Instant invasion alerts, quick reclaim flow |
| The Rival | Beat specific opponents | Player search, head-to-head history |
| The Social Player | Community recognition | Chat, profile visibility, shareable stats |
| The Completionist | Full city coverage | Coverage percentage tracker |
| The Casual | Light activity motivation | Weekly summary, low-pressure dashboard |

---

## 3.4 Notification Strategy

| Type | Message | Psychology |
|---|---|---|
| Invasion Alert | ⚠ [User] just took 3 of your hexes in [Area] | Loss aversion trigger |
| Rank Drop | 📉 You dropped to #14. [Name] overtook you. | Competitive threat |
| Streak Reminder | 🔥 You've run 4 days straight. Don't break it. | Commitment consistency |
| Weekly Summary | 📊 This week: 12km, 45 hexes, rank #9 in [City] | Progress affirmation |
| Achievement | 🏆 First 100 hexes claimed. You're a Trailblazer. | Identity reinforcement |

**Rules:** Max 3 push notifications/day · No notifications 11pm–7am · Invasion alerts always shown

---

## 3.5 Ethical Design Guardrails

- No dark patterns — no fake timers, no manufactured scarcity
- Run cap (3/day) prevents obsessive behavior
- No location sharing — territory shown, not exact GPS position
- Push notifications default OFF except invasion alerts
- Privacy toggles on all profile data
- No ads, no pay-to-win credit purchases

---

# CHAPTER 4 — UI Design System
> Visual language, components, and page-by-page specifications

---

## 4.1 Design Principles

- **Dark-mode exclusive** — map colors only work on dark backgrounds
- **Data density without clutter** — the map is complex, the chrome is minimal
- **Speed signals trust** — every animation < 700ms
- **Color = identity, not decoration**

---

## 4.2 Color Palette

| Token | Hex | Usage |
|---|---|---|
| Background | `#0D0D1A` | App background — near-black with blue undertone |
| Primary / Brand | `#00C896` | CTAs, active states, positive credits |
| Accent | `#FF6B35` | Alerts, streaks, secondary actions |
| Text Primary | `#E8E8F0` | Main text on dark backgrounds |
| Text Secondary | `#6B7280` | Labels, timestamps, metadata |
| Danger | `#FF2244` | Invasion alerts, credit losses, errors |

### Player Colors (8 Selectable)

| Color | Hex | Notes |
|---|---|---|
| Neon Green | `#00FF88` | Default for new users |
| Electric Blue | `#0080FF` | High contrast on dark backgrounds |
| Crimson Red | `#FF2244` | Aggressive, dominant |
| Amber Gold | `#FFB300` | Prestige feel |
| Magenta | `#FF00AA` | Maximum visibility |
| Cyan | `#00DDFF` | Cool, strategic feel |
| Deep Orange | `#FF5500` | Warm aggression |
| **Prestige White** | `#FFFFFF` | **Unlocked at City Rank #1 only** |

---

## 4.3 Typography

| Role | Font | Size | Usage |
|---|---|---|---|
| Display | Space Grotesk 800 | 48–72px | Rank numbers, credit totals, KPI stats |
| Headings | Space Grotesk 700 | 24–36px | Page titles, card headers |
| Body | Inter 400 | 14–16px | Descriptions, chat, general text |
| Code / Hash | JetBrains Mono 500 | 13–14px | Hashcodes, hex IDs, blockchain hashes |

---

## 4.4 Page Specs

| Page | Primary Element | Key Design Rule |
|---|---|---|
| Landing | Full-viewport live map + minimal copy | One CTA only. Map is the hook. |
| Dashboard | 4 KPI numbers + mini map + Start Run CTA | Start Run must be the most prominent element |
| Global Map | Full-screen Leaflet + collapsible bottom drawer | Map first, search/filters as secondary layer |
| Leaderboard | Rank list with live credit delta animations | Current user's row always highlighted |
| Credits | Radial progress ring + invasion history table | Show decay clock to create urgency |
| Profile | Stats grid + territory heatmap | Heatmap = brag surface — make it beautiful |
| Notifications | Typed alerts with colored left borders | Invasion alerts always shown first |
| Community | 3-tab chat with color-coded senders | Sender color = territory color |

---

## 4.5 Motion Rules

- Hex claim animation: 200ms fill from center, ease-out
- Credit counter: 600ms animated count-up
- Rank change: 400ms slide + bounce
- Map fly-to: 1200ms smooth zoom
- Page transitions: 150ms fade

> **Rule: All animations must complete in under 700ms.**

---

# CHAPTER 5 — Deployment
> Infrastructure, CI/CD pipeline, environment management, and rollback

---

## 5.1 Infrastructure Stack (₹0)

| Service | Platform | Cost | What It Hosts |
|---|---|---|---|
| Frontend | Vercel Free | ₹0 | Next.js app |
| Backend (Prod) | Render Free | ₹0 | Express API from `main` |
| Backend (Staging) | Render Free | ₹0 | Express API from `develop` |
| Database | MongoDB Atlas M0 | ₹0 | All collections (512MB cap) |
| Cache | Upstash Redis | ₹0 | Leaderboard + rate limiting |
| CDN + DNS | Cloudflare Free | ₹0 | Domain proxy + DDoS protection |
| Monitoring | UptimeRobot Free | ₹0 | Uptime checks every 5 minutes |
| Error Tracking | Sentry Free | ₹0 | JS errors + backend exceptions |

---

## 5.2 Branch → Deploy Map

| Branch | CI Action | Deploy Target | URL |
|---|---|---|---|
| `main` | Test + Build + Lint | Vercel Prod + Render Prod | territoryrun.com |
| `develop` | Test + Build + Lint | Vercel Preview + Render Staging | `*.vercel.app` + staging |
| `feature/*` | Test + Build | Vercel PR Preview URL only | `feature-xxx.vercel.app` |
| `hotfix/*` | Fast-path to main via PR | Same as main on merge | territoryrun.com |

---

## 5.3 GitHub Actions Pipelines

### Frontend CI

```yaml
name: Frontend CI
on:
  pull_request:
    paths: ['frontend/**']
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 18 }
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
      - run: cd frontend && npm run lint
```

### Backend CI

```yaml
name: Backend CI
on:
  pull_request:
    paths: ['backend/**']
jobs:
  test:
    runs-on: ubuntu-latest
    env:
      MONGO_URI: ${{ secrets.MONGO_URI_TEST }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 18 }
      - run: cd backend && npm ci
      - run: cd backend && npm test
```

---

## 5.4 Environment Variables

| Variable | Platform | Description |
|---|---|---|
| `MONGODB_URI` | Render + Vercel | Atlas connection string |
| `JWT_SECRET` | Render | JWT signing secret |
| `UPSTASH_REDIS_URL` | Render | Redis cache URL |
| `GROQ_API_KEY` | Render | Groq AI API key |
| `SOLANA_RPC_URL` | Render | Blockchain RPC endpoint |
| `NEXT_PUBLIC_API_URL` | Vercel | Backend URL for frontend |
| `NEXT_PUBLIC_SOCKET_URL` | Vercel | Socket.IO URL |

> Never commit `.env`. Use `.env.example` with variable names only.

---

## 5.5 Rollback Procedures

**Frontend (Vercel):** Dashboard → Deployments → Find last stable → `...` → "Promote to Production". Time: < 30 seconds.

**Backend (Render):** Dashboard → Service → Manual Deploy → Select previous commit → Deploy. Or: `git revert` on main triggers auto-deploy.

---

## 5.6 Scaling Triggers

| When | Symptom | Action | Cost |
|---|---|---|---|
| 100+ concurrent runs | Socket latency / CPU throttling | Upgrade Render to Starter | $7/month |
| 400MB MongoDB | Near 512MB cap | Archive old runs to Cloudflare R2 | $0 |
| 500+ DAU | Render dyno sleeping off-peak | Render Starter plan | $7/month |

> **Total cost to reach 1,000 daily active users: approximately $14/month.**

---

# CHAPTER 6 — Roadmap

---

## 6.1 V1 Launch Checklist

| Item | Priority |
|---|---|
| GPS run tracking (foreground, 3-sec interval) | P0 — Must ship |
| H3 hex claiming + invasion logic | P0 — Must ship |
| Credit engine + decay algorithm | P0 — Must ship |
| JWT auth + color + hashcode selection | P0 — Must ship |
| Global map with hex overlays (Leaflet) | P0 — Must ship |
| Invasion notifications (push + in-app) | P0 — Must ship |
| Leaderboard (global + city) | P0 — Must ship |
| Rate limiting + free-tier guards | P0 — Must ship before any users |
| Community chat (3 channels) | P1 — Ship in first week |
| RAG chatbot (Groq) | P1 — Ship in first week |
| Daily blockchain proof (Solana) | P1 — Ship in first week |
| Privacy toggles on profile | P1 — Ship in first week |

---

## 6.2 V2 Feature Candidates

| Feature | User Value | Complexity |
|---|---|---|
| Seasonal city tournaments (weekly resets) | Massive re-engagement spike | Medium |
| Alliance / team territory claiming | Group competition layer | High |
| Route replay (animate your run on map) | Personal brag surface | Low |
| Territory trading / gifting between users | Social economy mechanics | High |
| Color unlocks / prestige system | Long-term progression | Low |
| Bike + walk mode (different credit rates) | Wider user base | Low |
| In-app challenges ("Claim 50 hexes this week") | Guided engagement | Medium |

---

## 6.3 Final Principles

- **V1 must be a game, not a platform.** Ship fast, get real users, learn.
- **The map IS the product.** Everything else serves the map.
- **Psychology > Features.** One well-designed notification beats five new screens.
- **Free-tier survivability is an engineering constraint, not a compromise.**
- **Main branch is sacred.** Broken prod destroys trust. CI gates are mandatory.

---

*TerritoryRun — Complete Product Documentation v1.0 | Confidential*
*All chapters: Technical · UX & Psychology · UI Design · Deployment · Roadmap*
