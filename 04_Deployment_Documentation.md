# TERRITORY RUN — Deployment & Connectivity Documentation
> CI/CD · Infrastructure · Environment Management · Rollback Procedures

---

## 1. Infrastructure Overview

| Component | Platform | Tier | Region | URL Pattern |
|---|---|---|---|---|
| Frontend | Vercel | Free | Edge (global) | territoryrun.vercel.app |
| Backend API | Render | Free | Oregon (US-W) | api.territoryrun.onrender.com |
| Backend Staging | Render | Free | Oregon (US-W) | api-staging.territoryrun.onrender.com |
| Database | MongoDB Atlas | Free (512MB) | AWS us-east-1 | cluster0.xxxxx.mongodb.net |
| Cache | Upstash Redis | Free (10k cmds/day) | AWS us-east-1 | via Upstash SDK |
| CDN / DNS | Cloudflare | Free | Global edge | Custom domain proxy |
| Blockchain RPC | QuickNode / Helius | Free tier | Solana Mainnet-Beta | RPC endpoint |
| AI / RAG | Groq API | Free (limited) | Global | api.groq.com/openai/v1 |

---

## 2. Repository & Branch Strategy

### 2.1 Monorepo Layout

```
territory-run/
├── frontend/
├── backend/
├── contracts/
├── .github/
│   └── workflows/
│       ├── frontend-ci.yml
│       ├── backend-ci.yml
│       └── deploy-prod.yml
└── .env.example
```

### 2.2 Branch Rules

| Branch | Purpose | Deploy Target | Direct Push Allowed |
|---|---|---|---|
| `main` | Production — live users | Vercel prod + Render prod | No — PR only |
| `develop` | Staging — pre-production testing | Vercel preview + Render staging | No — PR only |
| `feature/*` | Feature development | PR preview URL only | Yes (own branch) |
| `hotfix/*` | Emergency production fixes | Fast-track to main via PR | Yes (own branch) |

---

## 3. GitHub Actions CI Pipelines

### 3.1 Frontend CI (`frontend-ci.yml`)

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
      # Playwright E2E on PR to main only
      - if: github.base_ref == 'main'
        run: cd frontend && npx playwright test
```

### 3.2 Backend CI (`backend-ci.yml`)

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
      - run: cd backend && npm run test:integration
```

### 3.3 CI Gate Rules

- No PR merges to `main` or `develop` without CI passing
- Frontend build failure = PR blocked
- Backend test failure = PR blocked
- Lint warnings allowed; lint errors block

---

## 4. Continuous Deployment

### 4.1 Frontend (Vercel)

Vercel connects directly to the GitHub monorepo with root directory set to `frontend/`.

- `main` branch → **production** deployment (`territoryrun.vercel.app` + custom domain)
- `develop` branch → **staging** deployment (`territoryrun-develop.vercel.app`)
- Every PR → unique **preview URL** (shared in PR comments automatically)
- Build command: `npm run build`
- Output directory: `.next`

Environment variables set in Vercel Project Settings (never in code).

### 4.2 Backend (Render)

Two Render services, both connected to the same GitHub repo:

| Service Name | Branch | Start Command | Purpose |
|---|---|---|---|
| `territoryrun-api-prod` | `main` | `node backend/api-gateway/index.js` | Live production traffic |
| `territoryrun-api-staging` | `develop` | `node backend/api-gateway/index.js` | Pre-prod testing + previews |

Render auto-deploys on every push to the connected branch. Zero manual steps.

Health check endpoint: `GET /health` → `{status: 'ok', version: '1.x.x'}`

---

## 5. Environment Variables

### 5.1 Required Variables

| Variable | Example Value | Platform | Description |
|---|---|---|---|
| `MONGODB_URI` | `mongodb+srv://...` | Render + Vercel | Atlas connection string |
| `JWT_SECRET` | random 64-char string | Render | JWT signing secret |
| `JWT_REFRESH_SECRET` | random 64-char string | Render | Refresh token secret |
| `UPSTASH_REDIS_URL` | `https://...upstash.io` | Render | Redis cache URL |
| `UPSTASH_REDIS_TOKEN` | `AXxx...` | Render | Redis auth token |
| `GROQ_API_KEY` | `gsk_xxx...` | Render | Groq AI API key |
| `SOLANA_RPC_URL` | `https://xxx.quiknode.pro/` | Render | Blockchain RPC endpoint |
| `SOLANA_WALLET_PRIVATE_KEY` | base58 encoded key | Render | Wallet for daily proofs |
| `NEXT_PUBLIC_API_URL` | `https://api.territoryrun.com` | Vercel | Backend URL for frontend |
| `NEXT_PUBLIC_SOCKET_URL` | `https://api.territoryrun.com` | Vercel | Socket.IO URL |

> **Security Rule:** All secrets stored in Render Environment tab and Vercel Project Settings. Never committed to git. `.env.example` file shows variable names without values.

---

## 6. Database Configuration

### 6.1 MongoDB Atlas Setup

1. Create M0 (Free) cluster in AWS us-east-1
2. Create database user: `territoryrun_app` with `readWrite` role
3. IP Access List: Add Render service egress IPs (found in Render service logs)
4. Enable connection string in environment variables
5. Create indexes on: `territories.hexId` (unique), `territories.ownerId`, `runs.userId`, `users.username` (unique)

### 6.2 Collections (V1)

```
users_v1            — main user accounts
territories_v1      — hex ownership
runs_v1             — run history
notifications_v1    — unread alerts
chat_messages_v1    — community chat
daily_proofs_v1     — blockchain anchoring records
```

### 6.3 Backup Strategy

MongoDB Atlas free tier includes automatic daily snapshots with 2-day retention. For critical data (user accounts), also export daily to a JSON backup stored in Cloudflare R2 (free tier: 10GB).

---

## 7. Custom Domain Setup (Cloudflare)

### 7.1 DNS Records

| Type | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `@` | `cname.vercel-dns.com` | Proxied (orange cloud) |
| CNAME | `www` | `cname.vercel-dns.com` | Proxied |
| CNAME | `api` | `territoryrun-api-prod.onrender.com` | Proxied |

### 7.2 Cloudflare Settings

- SSL/TLS: **Full (Strict)**
- Always Use HTTPS: **ON**
- HTTP/2: **ON**
- Brotli Compression: **ON**
- Browser Cache TTL: 4 hours for static assets
- Firewall Rule: Rate limit — 100 requests/10s per IP to `/api/*` routes

---

## 8. Socket.IO Connectivity

Socket.IO requires persistent connections. Render's free tier supports WebSockets, but connections are terminated after 90 seconds of inactivity and on dyno sleep (after 15 mins of no HTTP traffic).

### 8.1 Mitigation Strategy

- Client-side auto-reconnect: `socket.io-client` with exponential backoff
- Keep-alive ping: client emits `'ping'` every 25 seconds during active run
- Render service: upgrade to Starter ($7/mo) when user base exceeds 100 active users to prevent dyno sleeping
- Fallback: if socket disconnects during run, client buffers GPS points locally and flushes via REST API on reconnect

```js
// Client reconnect config
const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
});
```

---

## 9. Rollback Procedures

### 9.1 Frontend Rollback (Vercel)

Vercel retains all previous deployment builds.

1. Open Vercel dashboard → **Deployments**
2. Find last stable deployment
3. Click `...` → **"Promote to Production"**
4. Done — zero downtime, completes in < 30 seconds

### 9.2 Backend Rollback (Render)

1. Open Render dashboard → service → **Manual Deploy**
2. Select previous commit hash from dropdown
3. Click **Deploy** — Render rebuilds from that commit

Alternative: `git revert` on `main` branch triggers auto-deploy.

### 9.3 Database Rollback

Cannot "rollback" MongoDB writes — only restore from snapshot. For non-destructive schema changes (adding fields), no rollback needed. For destructive changes, always maintain `schemaVersion` field and write migration scripts before deploying.

### 9.4 Emergency Contact Plan

| Service Down | Detection | First Action | Escalation |
|---|---|---|---|
| Frontend (Vercel) | UptimeRobot alert | Check Vercel deployment logs | Rollback to previous deployment |
| Backend (Render) | Health check failure | Check Render service logs | Manual redeploy or rollback |
| Database (Atlas) | MongoDB alerts | Check Atlas monitoring dashboard | Restore from snapshot |
| Redis (Upstash) | Cache miss spike | App continues without cache (graceful degrade) | Flush + rebuild cache |

---

## 10. Monitoring & Alerts (Free)

| Tool | What It Monitors | Alert Method |
|---|---|---|
| UptimeRobot (free) | Frontend + backend URL health checks every 5 min | Email on downtime |
| Render Logs | Backend error rate, response times | Manual log inspection |
| MongoDB Atlas Alerts | Database connections, disk usage (alert at 80%) | Email + Atlas dashboard |
| Vercel Analytics | Frontend performance, error rates | Vercel dashboard |
| Sentry (free tier) | Frontend JS errors + backend uncaught exceptions | Email digest |

---

## 11. Scaling Triggers

V1 targets: < 500 daily active users, < 100 concurrent GPS streams. These are the exact points where free tiers will strain:

| Trigger | Symptom | Solution | Cost |
|---|---|---|---|
| 100+ concurrent runs | Socket.IO lag, Render CPU throttling | Upgrade Render to Starter | $7/month |
| 400MB MongoDB usage | Near free tier cap (512MB) | Archive old runs to Cloudflare R2 | $0 |
| 10k+ Redis cmds/day | Cache misses, Upstash limit hit | Upgrade to Pay-As-You-Go | $0.2/100k cmds |
| 500+ daily users | Render dyno sleeping during off-peak | Render Starter plan | $7/month |
| Custom domain email | No transactional email | Add Resend.com (3k emails/month free) | $0 |

> **Total cost to scale to 1,000 DAU: approximately $14/month.** Plan accordingly.

---

*TerritoryRun — Deployment Documentation v1.0 | Confidential*
