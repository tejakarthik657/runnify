# TERRITORY RUN — Complete Setup Guide
> Folder Structure + All Dependency Install Commands

---

## PREREQUISITES (Install These First)

```bash
# Node.js 18+ (via nvm — recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Python 3.10+ (for RAG bot service)
# Already installed on most systems — verify:
python3 --version

# pip
python3 -m pip install --upgrade pip

# Git
git --version  # should already be installed

# Verify all
node --version   # v18.x.x
npm --version    # 9.x.x or 10.x.x
python3 --version # 3.10+
git --version
```

---

## STEP 1 — CLONE & ROOT SETUP

```bash
# Create monorepo
mkdir territory-run
cd territory-run
git init

# Create root .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
.env.production
__pycache__/
*.pyc
.next/
dist/
build/
vector_store/
*.log
.DS_Store
EOF

# Create root package.json (workspace manager)
cat > package.json << 'EOF'
{
  "name": "territory-run",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["frontend", "backend"],
  "scripts": {
    "dev:frontend": "npm run dev --workspace=frontend",
    "dev:backend": "npm run dev --workspace=backend",
    "build:frontend": "npm run build --workspace=frontend",
    "test:backend": "npm run test --workspace=backend"
  }
}
EOF
```

---

## STEP 2 — FULL FOLDER STRUCTURE

Run this entire block to create every file and folder:

```bash
# ─────────────────────────────────────────
# FRONTEND
# ─────────────────────────────────────────
mkdir -p frontend/app/{landing,login,dashboard,map,leaderboard,profile,credits,notifications,community}
mkdir -p frontend/app/api
mkdir -p frontend/components/{ui,map,run,leaderboard,chat,notifications,layout}
mkdir -p frontend/hooks
mkdir -p frontend/services
mkdir -p frontend/styles
mkdir -p frontend/public/icons

# ─────────────────────────────────────────
# BACKEND SERVICES
# ─────────────────────────────────────────
mkdir -p backend/api-gateway
mkdir -p backend/auth-service
mkdir -p backend/user-service
mkdir -p backend/run-service
mkdir -p backend/map-service
mkdir -p backend/leaderboard-service
mkdir -p backend/chat-service
mkdir -p backend/rag-bot-service/vector_store
mkdir -p backend/blockchain-service
mkdir -p backend/config
mkdir -p backend/middleware
mkdir -p backend/utils
mkdir -p backend/tests/{unit,integration}

# ─────────────────────────────────────────
# CONTRACTS (Solana)
# ─────────────────────────────────────────
mkdir -p contracts/programs/territory-proof/src
mkdir -p contracts/scripts
mkdir -p contracts/tests

# ─────────────────────────────────────────
# GITHUB ACTIONS
# ─────────────────────────────────────────
mkdir -p .github/workflows

# ─────────────────────────────────────────
# CREATE ALL KEY FILES (touch)
# ─────────────────────────────────────────

# Frontend pages
touch frontend/app/layout.tsx
touch frontend/app/page.tsx
touch frontend/app/landing/page.tsx
touch frontend/app/login/page.tsx
touch frontend/app/dashboard/page.tsx
touch frontend/app/map/page.tsx
touch frontend/app/leaderboard/page.tsx
touch frontend/app/profile/page.tsx
touch frontend/app/credits/page.tsx
touch frontend/app/notifications/page.tsx
touch frontend/app/community/page.tsx

# Frontend components
touch frontend/components/map/HexOverlay.tsx
touch frontend/components/map/LeafletMap.tsx
touch frontend/components/map/TerritoryLayer.tsx
touch frontend/components/run/RunTracker.tsx
touch frontend/components/run/GpsStream.tsx
touch frontend/components/leaderboard/LeaderboardTable.tsx
touch frontend/components/leaderboard/RankBadge.tsx
touch frontend/components/chat/ChatWindow.tsx
touch frontend/components/chat/MessageBubble.tsx
touch frontend/components/notifications/InvasionAlert.tsx
touch frontend/components/notifications/NotificationFeed.tsx
touch frontend/components/ui/CreditDelta.tsx
touch frontend/components/ui/HexCard.tsx
touch frontend/components/ui/ColorPicker.tsx
touch frontend/components/layout/Navbar.tsx
touch frontend/components/layout/BottomNav.tsx

# Frontend hooks & services
touch frontend/hooks/useGps.ts
touch frontend/hooks/useSocket.ts
touch frontend/hooks/useTerritory.ts
touch frontend/hooks/useLeaderboard.ts
touch frontend/services/api.ts
touch frontend/services/socket.ts
touch frontend/services/h3.ts
touch frontend/styles/globals.css

# Frontend config
touch frontend/next.config.js
touch frontend/tailwind.config.js
touch frontend/tsconfig.json
touch frontend/.env.local

# Backend gateway & config
touch backend/api-gateway/index.js
touch backend/config/db.js
touch backend/config/redis.js
touch backend/config/constants.js
touch backend/middleware/auth.js
touch backend/middleware/rateLimit.js
touch backend/middleware/errorHandler.js
touch backend/utils/logger.js
touch backend/utils/hashcode.js

# Auth service
touch backend/auth-service/routes.js
touch backend/auth-service/controller.js
touch backend/auth-service/jwt.js
touch backend/auth-service/oauth.js

# User service
touch backend/user-service/routes.js
touch backend/user-service/profile.controller.js
touch backend/user-service/user.model.js

# Run service
touch backend/run-service/routes.js
touch backend/run-service/gps.processor.js
touch backend/run-service/h3.service.js
touch backend/run-service/credit.engine.js
touch backend/run-service/run.model.js

# Map service
touch backend/map-service/routes.js
touch backend/map-service/territory.query.js
touch backend/map-service/territory.model.js

# Leaderboard service
touch backend/leaderboard-service/routes.js
touch backend/leaderboard-service/leaderboard.logic.js

# Chat service
touch backend/chat-service/socket.js
touch backend/chat-service/routes.js
touch backend/chat-service/message.model.js

# RAG bot service (Python)
touch backend/rag-bot-service/ingest.py
touch backend/rag-bot-service/query.py
touch backend/rag-bot-service/snapshot.py
touch backend/rag-bot-service/requirements.txt

# Blockchain service
touch backend/blockchain-service/anchor.sync.js
touch backend/blockchain-service/proof.model.js
touch backend/blockchain-service/cron.js

# Tests
touch backend/tests/unit/h3.service.test.js
touch backend/tests/unit/credit.engine.test.js
touch backend/tests/unit/decay.test.js
touch backend/tests/integration/territory.test.js
touch backend/tests/integration/run.test.js

# Backend config files
touch backend/package.json
touch backend/.env

# Contracts
touch contracts/programs/territory-proof/src/lib.rs
touch contracts/scripts/deploy.js
touch contracts/scripts/daily-proof.js
touch contracts/Anchor.toml

# CI/CD
touch .github/workflows/frontend-ci.yml
touch .github/workflows/backend-ci.yml
touch .github/workflows/deploy-prod.yml

# Root files
touch .env.example
touch README.md

echo "✅ Full folder structure created"
```

---

## STEP 3 — FRONTEND DEPENDENCIES

```bash
cd frontend

# Init Next.js 14 with TypeScript + Tailwind + App Router
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --no-git

# ── MAP & HEX ──────────────────────────────
npm install leaflet react-leaflet          # Interactive maps
npm install h3-js                          # Uber H3 hex grid
npm install @types/leaflet                 # Leaflet TypeScript types

# ── REAL-TIME ──────────────────────────────
npm install socket.io-client               # WebSocket client

# ── HTTP CLIENT ────────────────────────────
npm install axios                          # API requests
npm install swr                            # Data fetching + caching

# ── STATE MANAGEMENT ───────────────────────
npm install zustand                        # Lightweight global state

# ── ANIMATIONS ─────────────────────────────
npm install framer-motion                  # UI animations (rank changes, credit deltas)

# ── CHARTS ─────────────────────────────────
npm install recharts                       # Credits earned/lost bar chart

# ── AUTH ───────────────────────────────────
npm install next-auth                      # OAuth (Google, Apple)

# ── FORMS ──────────────────────────────────
npm install react-hook-form zod            # Form handling + validation
npm install @hookform/resolvers            # Zod resolver for react-hook-form

# ── UI UTILITIES ───────────────────────────
npm install clsx tailwind-merge            # Conditional classnames
npm install lucide-react                   # Icon library

# ── NOTIFICATIONS ──────────────────────────
npm install react-hot-toast                # In-app toast notifications

# ── DATE HANDLING ──────────────────────────
npm install date-fns                       # Date formatting

# ── PWA (Progressive Web App) ──────────────
npm install next-pwa                       # PWA support for mobile install

# ── DEV DEPENDENCIES ───────────────────────
npm install -D @types/node @types/react @types/react-dom
npm install -D prettier eslint-config-prettier
npm install -D @playwright/test            # E2E testing

# Install Playwright browsers
npx playwright install

cd ..
echo "✅ Frontend dependencies installed"
```

---

## STEP 4 — BACKEND DEPENDENCIES

```bash
cd backend

# Init package.json
npm init -y

# ── CORE FRAMEWORK ─────────────────────────
npm install express                        # Web framework
npm install cors                           # Cross-origin requests
npm install helmet                         # Security headers
npm install compression                    # Gzip responses
npm install morgan                         # HTTP request logging

# ── REAL-TIME ──────────────────────────────
npm install socket.io                      # WebSocket server

# ── DATABASE ───────────────────────────────
npm install mongoose                       # MongoDB ODM
npm install @upstash/redis                 # Redis cache client

# ── AUTH ───────────────────────────────────
npm install jsonwebtoken                   # JWT creation & verification
npm install bcryptjs                       # Password hashing
npm install passport passport-google-oauth20 passport-apple  # OAuth
npm install cookie-parser                  # Parse httpOnly cookies

# ── RATE LIMITING ──────────────────────────
npm install express-rate-limit             # IP-based rate limiting
npm install rate-limit-redis               # Redis-backed rate limit store

# ── HEX GRID ───────────────────────────────
npm install h3-js                          # H3 hex grid (same as frontend)

# ── VALIDATION ─────────────────────────────
npm install joi                            # Request body validation
npm install express-validator              # Alternative validator

# ── CRON JOBS ──────────────────────────────
npm install node-cron                      # Scheduled tasks (decay, blockchain)

# ── BLOCKCHAIN (Solana) ────────────────────
npm install @solana/web3.js                # Solana SDK
npm install @project-serum/anchor          # Anchor framework client
npm install bs58                           # Base58 encoding for keypairs

# ── ENVIRONMENT ────────────────────────────
npm install dotenv                         # .env loading

# ── UTILITIES ──────────────────────────────
npm install uuid                           # Unique ID generation
npm install lodash                         # Utility functions
npm install axios                          # HTTP client (for internal calls)

# ── LOGGING ────────────────────────────────
npm install winston                        # Structured logging
npm install winston-daily-rotate-file      # Log rotation

# ── DEV DEPENDENCIES ───────────────────────
npm install -D nodemon                     # Auto-restart on file change
npm install -D jest                        # Unit testing
npm install -D supertest                   # HTTP integration testing
npm install -D @types/jest                 # Jest types
npm install -D artillery                   # Load testing (GPS stream simulation)

# Add scripts to backend/package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts = {
  'start': 'node api-gateway/index.js',
  'dev': 'nodemon api-gateway/index.js',
  'test': 'jest --testPathPattern=tests/unit',
  'test:integration': 'jest --testPathPattern=tests/integration',
  'test:load': 'artillery run tests/load/gps-stream.yml'
};
pkg.main = 'api-gateway/index.js';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('package.json updated');
"

cd ..
echo "✅ Backend dependencies installed"
```

---

## STEP 5 — PYTHON RAG BOT DEPENDENCIES

```bash
cd backend/rag-bot-service

# Create virtual environment
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# ── AI / RAG ───────────────────────────────
pip install langchain                      # RAG orchestration
pip install langchain-groq                 # Groq LLM integration
pip install langchain-community            # Community loaders
pip install faiss-cpu                      # Vector store (local, free)
pip install sentence-transformers          # Text embeddings

# ── DATA / MONGODB ─────────────────────────
pip install pymongo                        # MongoDB Python client
pip install python-dotenv                  # .env loading

# ── UTILITIES ──────────────────────────────
pip install schedule                       # Python cron for daily snapshot
pip install httpx                          # Async HTTP requests
pip install pydantic                       # Data validation

# Write requirements.txt
pip freeze > requirements.txt

deactivate
cd ../..
echo "✅ Python RAG dependencies installed"
```

---

## STEP 6 — SOLANA / ANCHOR SETUP

```bash
# Install Rust (required for Anchor)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install latest
avm use latest

# Verify
solana --version
anchor --version

# Generate a wallet for daily proofs (save the output!)
solana-keygen new --outfile ~/.config/solana/territory-run.json
solana config set --keypair ~/.config/solana/territory-run.json
solana config set --url devnet

# Airdrop devnet SOL for testing
solana airdrop 2

cd contracts
anchor build
anchor test

cd ..
echo "✅ Solana/Anchor setup complete"
```

---

## STEP 7 — ENV FILES SETUP

### Root `.env.example`

```bash
cat > .env.example << 'EOF'
# ── BACKEND ────────────────────────────────
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/territory-run
JWT_SECRET=your_64_char_random_secret_here
JWT_REFRESH_SECRET=another_64_char_random_secret_here

# Upstash Redis
UPSTASH_REDIS_URL=https://xxxx.upstash.io
UPSTASH_REDIS_TOKEN=your_token_here

# Groq AI
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WALLET_PRIVATE_KEY=your_base58_private_key

# OAuth
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_secret

# App
PORT=5000
NODE_ENV=development

# ── FRONTEND ───────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
EOF

# Copy for backend
cp .env.example backend/.env

# Copy for frontend
cp .env.example frontend/.env.local

echo "✅ .env files created — fill in your actual values"
```

---

## STEP 8 — CI/CD FILES

```bash
# Frontend CI
cat > .github/workflows/frontend-ci.yml << 'EOF'
name: Frontend CI
on:
  pull_request:
    paths: ["frontend/**"]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
      - run: cd frontend && npm run lint
      - name: Playwright E2E (main only)
        if: github.base_ref == 'main'
        run: cd frontend && npx playwright test
EOF

# Backend CI
cat > .github/workflows/backend-ci.yml << 'EOF'
name: Backend CI
on:
  pull_request:
    paths: ["backend/**"]
jobs:
  test:
    runs-on: ubuntu-latest
    env:
      MONGODB_URI: ${{ secrets.MONGO_URI_TEST }}
      JWT_SECRET: test_secret_for_ci
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: "npm"
          cache-dependency-path: backend/package-lock.json
      - run: cd backend && npm ci
      - run: cd backend && npm test
      - run: cd backend && npm run test:integration
EOF

echo "✅ GitHub Actions workflows created"
```

---

## STEP 9 — RUN LOCALLY

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# → Running on http://localhost:5000

# Terminal 2 — Frontend
cd frontend
npm run dev
# → Running on http://localhost:3000

# Terminal 3 — RAG Bot (optional for dev)
cd backend/rag-bot-service
source venv/bin/activate
python3 query.py
```

---

## COMPLETE FINAL FOLDER STRUCTURE

```
territory-run/
│
├── .github/
│   └── workflows/
│       ├── frontend-ci.yml
│       ├── backend-ci.yml
│       └── deploy-prod.yml
│
├── frontend/                          # Next.js 14
│   ├── app/
│   │   ├── layout.tsx                 # Root layout (navbar, providers)
│   │   ├── page.tsx                   # Redirect to /landing
│   │   ├── landing/
│   │   │   └── page.tsx               # Hero map + CTA
│   │   ├── login/
│   │   │   └── page.tsx               # Auth screen
│   │   ├── dashboard/
│   │   │   └── page.tsx               # KPIs + mini map + Start Run
│   │   ├── map/
│   │   │   └── page.tsx               # Full global map
│   │   ├── leaderboard/
│   │   │   └── page.tsx               # Global / City / Weekly tabs
│   │   ├── profile/
│   │   │   └── page.tsx               # Stats + heatmap + run history
│   │   ├── credits/
│   │   │   └── page.tsx               # Credits + invasion history + decay
│   │   ├── notifications/
│   │   │   └── page.tsx               # Alert feed
│   │   └── community/
│   │       └── page.tsx               # Chat (Global / City / DMs)
│   │
│   ├── components/
│   │   ├── map/
│   │   │   ├── LeafletMap.tsx         # Base Leaflet instance
│   │   │   ├── HexOverlay.tsx         # H3 hex SVG rendering
│   │   │   └── TerritoryLayer.tsx     # Color-coded ownership layer
│   │   ├── run/
│   │   │   ├── RunTracker.tsx         # Live run overlay
│   │   │   └── GpsStream.tsx          # GPS watchPosition handler
│   │   ├── leaderboard/
│   │   │   ├── LeaderboardTable.tsx   # Rank table with animations
│   │   │   └── RankBadge.tsx          # Gold/Silver/Bronze/Green rings
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx         # Message list + input
│   │   │   └── MessageBubble.tsx      # Color-bordered message
│   │   ├── notifications/
│   │   │   ├── InvasionAlert.tsx      # Loss-framed alert card
│   │   │   └── NotificationFeed.tsx   # Scrollable feed
│   │   ├── ui/
│   │   │   ├── CreditDelta.tsx        # Animated +/- credit number
│   │   │   ├── HexCard.tsx            # Hexagonal territory card
│   │   │   └── ColorPicker.tsx        # 8-color selector on signup
│   │   └── layout/
│   │       ├── Navbar.tsx             # Desktop top nav
│   │       └── BottomNav.tsx          # Mobile bottom tab bar
│   │
│   ├── hooks/
│   │   ├── useGps.ts                  # Geolocation + accuracy filter
│   │   ├── useSocket.ts               # Socket.IO connection + reconnect
│   │   ├── useTerritory.ts            # Territory query + cache
│   │   └── useLeaderboard.ts          # Leaderboard SWR fetch
│   │
│   ├── services/
│   │   ├── api.ts                     # Axios instance + interceptors
│   │   ├── socket.ts                  # Socket.IO client config
│   │   └── h3.ts                      # Client-side H3 helpers
│   │
│   ├── styles/
│   │   └── globals.css                # Tailwind base + dark theme vars
│   │
│   ├── public/icons/                  # PWA icons
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── .env.local
│
├── backend/                           # Node.js + Express (Modular Monolith)
│   │
│   ├── api-gateway/
│   │   └── index.js                   # Entry point — mounts all service routers
│   │
│   ├── config/
│   │   ├── db.js                      # Mongoose connect
│   │   ├── redis.js                   # Upstash Redis client
│   │   └── constants.js               # H3 resolution, credit rates, limits
│   │
│   ├── middleware/
│   │   ├── auth.js                    # JWT verify middleware
│   │   ├── rateLimit.js               # express-rate-limit + Redis store
│   │   └── errorHandler.js            # Global error handler
│   │
│   ├── utils/
│   │   ├── logger.js                  # Winston logger
│   │   └── hashcode.js                # TR-XXXX generator
│   │
│   ├── auth-service/
│   │   ├── routes.js                  # POST /auth/register, /login, /refresh
│   │   ├── controller.js              # Register + login logic
│   │   ├── jwt.js                     # Sign/verify access + refresh tokens
│   │   └── oauth.js                   # Passport Google/Apple config
│   │
│   ├── user-service/
│   │   ├── routes.js                  # GET /user/:id, PATCH /user/:id
│   │   ├── profile.controller.js      # Profile read/update
│   │   └── user.model.js              # Mongoose User schema
│   │
│   ├── run-service/
│   │   ├── routes.js                  # POST /run/start, /run/end
│   │   ├── gps.processor.js           # Filter + validate GPS points
│   │   ├── h3.service.js              # latLng → hexId, batch processing
│   │   ├── credit.engine.js           # Credit calc + decay formula
│   │   └── run.model.js               # Mongoose Run schema
│   │
│   ├── map-service/
│   │   ├── routes.js                  # GET /map/territories?bbox=...
│   │   ├── territory.query.js         # Bounding box hex lookup
│   │   └── territory.model.js         # Mongoose Territory schema
│   │
│   ├── leaderboard-service/
│   │   ├── routes.js                  # GET /leaderboard/global, /city/:city
│   │   └── leaderboard.logic.js       # Redis cache + rank computation
│   │
│   ├── chat-service/
│   │   ├── socket.js                  # Socket.IO rooms (global/city/dm)
│   │   ├── routes.js                  # REST fallback for chat history
│   │   └── message.model.js           # Mongoose Message schema
│   │
│   ├── rag-bot-service/               # Python microservice
│   │   ├── ingest.py                  # MongoDB snapshot → vector store
│   │   ├── query.py                   # FastAPI endpoint for bot queries
│   │   ├── snapshot.py                # Daily data export job
│   │   ├── vector_store/              # FAISS index (gitignored)
│   │   └── requirements.txt
│   │
│   ├── blockchain-service/
│   │   ├── cron.js                    # node-cron: runs daily at 00:00 UTC
│   │   ├── anchor.sync.js             # Build Merkle root + write to Solana
│   │   └── proof.model.js             # Mongoose DailyProof schema
│   │
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── h3.service.test.js
│   │   │   ├── credit.engine.test.js
│   │   │   └── decay.test.js
│   │   └── integration/
│   │       ├── territory.test.js
│   │       └── run.test.js
│   │
│   ├── package.json
│   └── .env
│
├── contracts/                         # Solana programs
│   ├── programs/
│   │   └── territory-proof/
│   │       └── src/
│   │           └── lib.rs             # Anchor program (store daily hash)
│   ├── scripts/
│   │   ├── deploy.js                  # Deploy to devnet/mainnet
│   │   └── daily-proof.js             # Manual proof trigger script
│   ├── tests/
│   │   └── territory-proof.ts
│   └── Anchor.toml
│
├── .env.example                       # All env var names (no values)
├── .gitignore
├── package.json                       # Root workspace config
└── README.md
```

---

## QUICK REFERENCE — All NPM Packages

### Frontend (`frontend/`)

| Package | Purpose |
|---|---|
| `next` | Framework |
| `react`, `react-dom` | UI |
| `typescript` | Types |
| `tailwindcss` | Styling |
| `leaflet`, `react-leaflet` | Maps |
| `h3-js` | Hex grid |
| `socket.io-client` | Real-time |
| `axios` | HTTP client |
| `swr` | Data fetching + cache |
| `zustand` | State management |
| `framer-motion` | Animations |
| `recharts` | Charts |
| `next-auth` | OAuth |
| `react-hook-form`, `zod` | Forms + validation |
| `clsx`, `tailwind-merge` | Classname utilities |
| `lucide-react` | Icons |
| `react-hot-toast` | Toast notifications |
| `date-fns` | Date formatting |
| `next-pwa` | PWA support |
| `@playwright/test` | E2E testing (dev) |

### Backend (`backend/`)

| Package | Purpose |
|---|---|
| `express` | Web framework |
| `cors`, `helmet`, `compression` | Security + perf |
| `morgan` | Request logging |
| `socket.io` | Real-time |
| `mongoose` | MongoDB ODM |
| `@upstash/redis` | Redis cache |
| `jsonwebtoken` | JWT |
| `bcryptjs` | Password hash |
| `passport`, `passport-google-oauth20` | OAuth |
| `cookie-parser` | Cookie parsing |
| `express-rate-limit`, `rate-limit-redis` | Rate limiting |
| `h3-js` | Hex grid |
| `joi` | Validation |
| `node-cron` | Scheduled tasks |
| `@solana/web3.js`, `@project-serum/anchor` | Blockchain |
| `bs58` | Base58 encoding |
| `dotenv` | Env vars |
| `uuid`, `lodash` | Utilities |
| `winston` | Logging |
| `nodemon` | Dev auto-reload |
| `jest`, `supertest` | Testing |
| `artillery` | Load testing |

### Python RAG (`backend/rag-bot-service/`)

| Package | Purpose |
|---|---|
| `langchain` | RAG orchestration |
| `langchain-groq` | Groq LLM |
| `langchain-community` | Document loaders |
| `faiss-cpu` | Vector store |
| `sentence-transformers` | Embeddings |
| `pymongo` | MongoDB |
| `python-dotenv` | Env vars |
| `schedule` | Python cron |
| `httpx` | HTTP client |
| `pydantic` | Validation |

---

*TerritoryRun — Setup Guide v1.0*
