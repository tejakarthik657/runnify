# TerritoryRun — Complete End-to-End Feature Flows

This document details **all 31 features** implemented in TerritoryRun. Each feature is broken down into **how it works**, its **under-the-hood technical implementation (flows & files)**, and **CTO-level talking points** to demonstrate technical competence in design reviews or interviews.

---

## 📂 Category 1: User Identity & Security

### Feature 01: Stateless JWT-Based Session Management
*   **How it Works:** Symmetrically signs access tokens on login and issues refresh cookies. When the 15-minute access token expires, the client silently hits `/auth/refresh` using the secure HTTP-only refresh cookie to renew the session without logging the user out.
*   **Technical Implementation:** Located in [auth-service/jwt.js](file:///c:/Programming/Projects/05_Social-Impact/runni5/backend/auth-service/jwt.js) and routed in [auth-service/routes.js](file:///c:/Programming/Projects/05_Social-Impact/runni5/backend/auth-service/routes.js). Uses the `jsonwebtoken` library. Refresh tokens are tracked in a `sessions_v1` collection to enable administrative session revocation.
*   **CTO Talking Points:** *"We chose stateless access tokens to minimize database queries on API gateways, while keeping refresh tokens stateful in MongoDB to permit immediate session revocation if an anomaly is detected."*

### Feature 02: Google OAuth 2.0 Integration
*   **How it Works:** Client triggers Google login. The gateway handles the callback, maps the profile info (email, googleId) to our user schema, assigns a random username/color, and redirects to the dashboard with access keys.
*   **Technical Implementation:** Configured in [auth-service/oauth.js](file:///c:/Programming/Projects/05_Social-Impact/runni5/backend/auth-service/oauth.js) utilizing `passport-google-oauth20`.
*   **CTO Talking Points:** *"Reduces onboarding friction by delegating credential management to trusted identity providers, eliminating database storage of raw passwords."*

### Feature 03: Apple Sign-In Integration
*   **How it Works:** Client posts credentials from Apple services. The gateway processes the Apple identity token, verifies signature tokens via Apple's public key sets, registers the user, and signs them in.
*   **Technical Implementation:** Handled in [auth-service/oauth.js](file:///c:/Programming/Projects/05_Social-Impact/runni5/backend/auth-service/oauth.js) using `passport-apple`.
*   **CTO Talking Points:** *"We support Apple's form-post mechanism and verify signatures against Apple public key sets using standard cryptography parameters."*

### Feature 04: Unique Avatar Identicon & Color Selection
*   **How it Works:** During sign-up, users choose one of 7 default colors (crimson, electric blue, neon green, etc.). A geometric avatar (identicon) is generated deterministically based on their unique username.
*   **Technical Implementation:** Programmed in the user profile router and user-service controllers. Uses custom color-locking checks to restrict special colors.
*   **CTO Talking Points:** *"Deterministic geometric avatars are generated on-the-fly, saving S3/Cloudinary storage costs while maintaining unique player identities."*

---

## 📂 Category 2: Real-Time Run Tracking & Mapping

### Feature 05: Socket.IO Real-Time GPS Streaming
*   **How it Works:** The client-side PWA tracks live position coordinates via `navigator.geolocation.watchPosition` and streams updates to the server every 3 seconds via the namespace `io.sockets`.
*   **Technical Implementation:** Handled by [run-service/socket.handlers.js](file:///c:/Programming/Projects/05_Social-Impact/runni5/backend/run-service/socket.handlers.js).
*   **CTO Talking Points:** *"Streams GPS coordinates over WebSockets instead of batching REST posts. This enables instant server-side validation and immediate anti-cheat detection during runs."*

### Feature 06: GPS Coordinate to H3 Index Conversion
*   **How it Works:** Converts raw `(latitude, longitude)` coordinates into a 15-character base-16 spatial index string.
*   **Technical Implementation:** Coded in [run-service/h3.service.js](file:///c:/Programming/Projects/05_Social-Impact/runni5/backend/run-service/h3.service.js) using `h3-js` at H3 Resolution 9.
*   **CTO Talking Points:** *"Instead of performing CPU-heavy spatial geometry intersection calculations, we partition the globe into H3 indices, changing complex geometry operations into simple string matches."*

### Feature 07: Spatial Path Claiming Logic
*   **How it Works:** As the runner crosses the map, the system maps their coordinates to H3 hexes. If a hex is currently unowned, the runner claims it, coloring it on the public map.
*   **Technical Implementation:** Located in [run-service/gps.processor.js](file:///c:/Programming/Projects/05_Social-Impact/runni5/backend/run-service/gps.processor.js). It inserts new claims into the `territories_v1` database.
*   **CTO Talking Points:** *"Uses string matching on hex IDs to claim territory. The database uses a unique index on `hexId` to handle race conditions atomically."*

### Feature 08: Spatial Path Invasion Logic
*   **How it Works:** When a runner enters a hex owned by another player, the system logs it as an invasion. The original owner loses territory ownership, and the invader receives bonus credits.
*   **Technical Implementation:** Handled during post-run analysis in [run-service/gps.processor.js](file:///c:/Programming/Projects/05_Social-Impact/runni5/backend/run-service/gps.processor.js), generating records in the `invasions_v1` collection.
*   **CTO Talking Points:** *"We track invasions in a separate collection, making it easy to analyze regional player conflicts and feed our social rivalry engine."*

### Feature 09: Hex Retouching (Re-running Home Turf)
*   **How it Works:** If a runner traverses a hex they already own, the system registers a 'retouch', resetting the inactivity timer for that hex and awarding a small credit bonus.
*   **Technical Implementation:** Controlled in [run-service/gps.processor.js](file:///c:/Programming/Projects/05_Social-Impact/runni5/backend/run-service/gps.processor.js).
*   **CTO Talking Points:** *"Encourages home-turf maintenance by awarding small credit bonuses for re-running existing routes."*

### Feature 10: Dynamic Credit Multiplier (Peak Hours)
*   **How it Works:** Runs conducted during peak commuting times (6:00 AM - 9:00 AM, 5:00 PM - 8:00 PM local time) receive a **1.5x credit multiplier**.
*   **Technical Implementation:** Implemented in [run-service/credit.engine.js](file:///c:/Programming/Projects/05_Social-Impact/runni5/backend/run-service/credit.engine.js).
*   **CTO Talking Points:** *"Applies time-of-day multipliers on the server side to incentivize running during high-traffic windows, driving community engagement."*

---

## 📂 Category 3: Game Economy & Dynamics

### Feature 11: Inactive Territory Credit Decay
*   **How it Works:** Hexes decay at **-2% per 24 hours** of owner inactivity, decreasing their value and making them easier for other players to invade.
*   **Technical Implementation:** Managed by a background script: [utils/decay.warning.cron.js](file:///c:/Programming/Projects/05_Social-Impact/runni5/package.json#L12).
*   **CTO Talking Points:** *"Uses decay algorithms to prevent inactive players from locking down territory indefinitely. This keeps the map competitive for active players."*

### Feature 12: Midnight Sweep / Daily Map Reset
*   **How it Works:** Wipes all territory claims at 23:59 UTC daily, resets the world map, awards permanent bonus credits to the top 10 players, and notifies active clients.
*   **Technical Implementation:** Driven by the cron reset handler in [api-gateway/index.js:L153-L198](file:///c:/Programming/Projects/05_Social-Impact/runni5/backend/api-gateway/index.js#L153-L198).
*   **CTO Talking Points:** *"Features a daily reset loop that levels the playing field for new players every morning, while rewarding veterans with permanent credits."*

### Feature 13: Global Leaderboard (Cached)
*   **How it Works:** Displays the top 100 players globally, ordered by active credit counts.
*   **Technical Implementation:** Managed in [leaderboard-service/routes.js](file:///c:/Programming/Projects/05_Social-Impact/runni5/backend/leaderboard-service/routes.js). Uses Redis cached sorted sets.
*   **CTO Talking Points:** *"Reads global leaderboards from Upstash Redis sorted sets to ensure fast response times and keep database load minimal."*

### Feature 14: City-Scoped Leaderboards
*   **How it Works:** Displays player rankings scoped to specific municipal areas (e.g., London, Hyderabad).
*   **Technical Implementation:** Uses compound database indexes: `{ city: 1, credits: -1 }`.
*   **CTO Talking Points:** *"Filters and sorts rankings using compound indexes, ensuring fast queries for localized competition."*

### Feature 15: Immutable Credit Ledger Auditing
*   **How it Works:** Every credit transaction (run claims, invasions, decay, prestige bonuses) is logged as an immutable entry. Balance totals must match the user profile.
*   **Technical Implementation:** Writes to `credits_ledger_v1` are restricted to insert-only via database rules.
*   **CTO Talking Points:** *"We use an insert-only credit ledger audit trail to prevent database manipulation and ensure financial data integrity."*

---

## 📂 Category 4: Real-Time Social & Engagement Features

### Feature 16: Live Chat Sockets (Global & City Channels)
*   **How it Works:** Users converse in multi-channel chatrooms. Senders' names are rendered in their active territory color.
*   **Technical Implementation:** Located in [chat-service/socket.js](file:///c:/Programming/Projects/05_Social-Impact/runni5/backend/chat-service/socket.js).Saves messages to the `chat_messages_v1` database.
*   **CTO Talking Points:** *"Decouples chat traffic from core gameplay API routes by using custom Socket.IO namespaces."*

### Feature 17: Player-to-Player Direct Messaging (DMs)
*   **How it Works:** Secure private messaging rooms mapped to users' cryptographic hashes.
*   **Technical Implementation:** Managed in `chat-service` using private room routes.
*   **CTO Talking Points:** *"Secures direct messaging by validating member arrays on the server before dispatching events."*

### Feature 18: Notification Dispatch Engine
*   **How it Works:** Generates in-app notifications and system alerts (e.g., `[User] took 3 of your hexes!`).
*   **Technical Implementation:** Built in [notification-service/push.js](file:///c:/Programming/Projects/05_Social-Impact/runni5/backend/api-gateway/index.js#L57) and uses Socket.IO emitters.
*   **CTO Talking Points:** *"Dispatches push alerts and notifications in real time. We auto-expire records after 60 days using a TTL index to limit database growth."*

### Feature 19: Named Rivals System
*   **How it Works:** When two players invade each other's territory 3 or more times, they are labeled "Named Rivals". This adds a visual glow to their profiles in the UI.
*   **Technical Implementation:** Logged in the user schema's `rivals` array and updated during post-run processing.
*   **CTO Talking Points:** *"Maintains a local array of recent conflicts to drive user interaction through custom rivalry features."*

### Feature 20: Faction Selection & Territory Battles
*   **How it Works:** Users align with one of three factions: Red, Blue, or Green. Hexes display color modifications based on faction dominance.
*   **Technical Implementation:** Contained in the user model and queried in `territory-service`.
*   **CTO Talking Points:** *"Aggregates territory ownership by faction to enable team-based competition and group metrics."*

### Feature 21: Dynamic Achievement Engine
*   **How it Works:** Checks running statistics against pre-set rules on run upload, unlocking badges and granting credit rewards.
*   **Technical Implementation:** Uses an idempotent seeding script: [user-service/achievements.js](file:///c:/Programming/Projects/05_Social-Impact/runni5/backend/user-service/achievements.js).
*   **CTO Talking Points:** *"Achievement checks are run asynchronously after runs are saved, preventing write-blocking during gameplay."*

---

## 📂 Category 5: Blockchain, AI, & Analytics

### Feature 22: Daily Blockchain Proof Anchoring
*   **How it Works:** Aggregates verified runs, computes a daily Merkle Root, and anchors it to the Sepolia testnet via a 0 ETH transaction.
*   **Technical Implementation:** Programmed in [blockchain-service/anchor.sync.js](file:///c:/Programming/Projects/05_Social-Impact/runni5/backend/blockchain-service/anchor.sync.js).
*   **CTO Talking Points:** *"Anchors daily activity logs to Ethereum Sepolia. This provides a public, verifiable audit trail at zero transaction cost."*

### Feature 23: Decentralized Run Verification Auditor
*   **How it Works:** Compares a date and run ID against the daily Merkle Root anchored on Sepolia, verifying the legitimacy of the run.
*   **Technical Implementation:** Uses cryptography verification in [blockchain-service/verify.js](file:///c:/Programming/Projects/05_Social-Impact/runni5/backend/blockchain-service/verify.js).
*   **CTO Talking Points:** *"Enables users to verify their runs against the blockchain, providing a trustless way to audit leaderboard rankings."*

### Feature 24: AI RAG Assistant Bot
*   **How it Works:** An AI bot that answers gameplay questions using live database statistics.
*   **Technical Implementation:** Located in [rag-bot-service/routes.js](file:///c:/Programming/Projects/05_Social-Impact/runni5/backend/api-gateway/index.js#L93) and powered by Groq LLaMA-3.
*   **CTO Talking Points:** *"Updates a markdown knowledge base every 6 hours and uses vector similarity search to feed real-time context to the LLM."*

### Feature 25: Python Run Statistics Calculator
*   **How it Works:** An analytics API that estimates calorie burn and analyzes speed trends for completed runs.
*   **Technical Implementation:** FastAPI service in `python-services/01-run-statistics`.
*   **CTO Talking Points:** *"We route analytical math and statistical evaluations to a lightweight Python service to keep the main gateway responsive."*

### Feature 26: Python Hex expansion Recommendations
*   **How it Works:** Analyzes a runner's territory map and suggests optimal next directions to maximize claimed area.
*   **Technical Implementation:** FastAPI service in `python-services/02-hex-analyzer` using the H3 library.
*   **CTO Talking Points:** *"Suggests routes using nearest-neighbor search, helping users expand their territory efficiently."*

### Feature 27: Python User Churn & Engagement Risk Predictor
*   **How it Works:** Estimates churn risk based on user running frequency and streak deltas.
*   **Technical Implementation:** FastAPI service in `python-services/03-engagement-engine` using scikit-learn.
*   **CTO Talking Points:** *"Uses logistic regression on user logs to predict churn risk, allowing us to send notifications to at-risk players."*

### Feature 28: Python Leaderboard Predictor
*   **How it Works:** Forecasts rank changes and estimates the credits needed to climb on the leaderboards.
*   **Technical Implementation:** FastAPI service in `python-services/04-leaderboard-predictor`.
*   **CTO Talking Points:** *"Uses numpy trend analysis to forecast leaderboard shifts, adding a predictive layer to the UI."*

### Feature 29: Python Route Optimizer (Max Hex Capture)
*   **How it Works:** Generates route paths to maximize hex claims while avoiding overlaps.
*   **Technical Implementation:** FastAPI service in `python-services/06-route-optimization` using NetworkX.
*   **CTO Talking Points:** *"Generates optimized loops back to starting points using graph pathfinding, helping runners plan routes."*

### Feature 30: Python Elevation & Climb Analyzer
*   **How it Works:** Analyzes elevation profiles and highlights significant climbs.
*   **Technical Implementation:** FastAPI service in `python-services/07-elevation-analyzer` using Open-Elevation APIs.
*   **CTO Talking Points:** *"Uses Open-Elevation APIs to calculate route difficulty, adjusting credit rewards based on climbs."*

### Feature 31: Python Dynamic Badge PNG Generator
*   **How it Works:** Generates custom badge PNGs dynamically when players unlock achievements.
*   **Technical Implementation:** FastAPI service in `python-services/11-badge-generator` using Pillow.
*   **CTO Talking Points:** *"Generates shareable badge PNGs dynamically on the server side using python image libraries."*
