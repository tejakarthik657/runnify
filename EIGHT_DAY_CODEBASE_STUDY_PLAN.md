# TerritoryRun — 8-Day Master Codebase Reverse-Engineering & Technical Curriculum

> **Target Profile:** Software Engineer / Computer Science Graduate with foundational programming knowledge seeking complete mastery of the TerritoryRun production system.  
> **Commitment:** 8 Days × 2 Hours per day = 16 Intensive Hours of Structured Engineering Analysis.  
> **Ultimate Goal:** Understand every architectural decision, folder, file, function, data schema, mathematical formula, network packet, and security gate. Speak fluently at senior engineer, tech lead, and CTO interview levels.

---

## Curriculum Overview & Schedule Matrix

| Day | Focus Area | Files & Subsystems Explored | Key Technical Output |
| :--- | :--- | :--- | :--- |
| **Day 1** | **Genesis, Architecture & Environment Blueprint** | `package.json`, `render.yaml`, `vercel.json`, `backend/server.js`, `backend/config/db.js` | Complete System Topology Diagram, Monorepo Setup, Bootstrapping |
| **Day 2** | **Data Modeling, Schema Design & Auth Lifecycles** | `backend/config/models.js`, `backend/auth-service/`, `frontend/store/authStore.ts`, `frontend/services/offlineStore.ts` | Entity Relationship Diagram, Bcrypt/JWT Token Lifecycle, Offline Queue |
| **Day 3** | **Geospatial Engine: Uber H3 & CARTO Basemaps** | `frontend/components/map/LeafletMap.tsx`, `MapContent.tsx`, `MapControls.tsx`, `FogOfWarLayer.tsx` | Hexagonal Discrete Global Grid Math, Great-Circle Haversine, Basemap Auth |
| **Day 4** | **Hardware Sensor Fusion & 4-Tier Anti-Cheat Engine** | `frontend/hooks/useGps.ts`, `useStepCounter.ts`, `backend/run-service/antiCheat.js`, `frontend/app/map/page.tsx` | Kinematic Velocity Gates, Accelerometer Cross-Validation Math |
| **Day 5** | **Real-Time Multiplayer: WebSockets & Spatial Sharding** | `backend/run-service/socket.handlers.js`, `frontend/hooks/useSocket.ts`, `frontend/store/socketStore.ts`, `p2pRadar.ts` | $O(N^2)$ Broadcast Mitigation, Res-6 Parental Sharding, React Immutability |
| **Day 6** | **Game Mechanics, Economy & Autonomous Decay** | `backend/territory-service/`, `backend/territory-service/decay.cron.js`, `contracts/TerritoryCreditToken.sol` | Hex Conquest Matrix, Compounding Decay Formula $V(t) = V_0(0.98)^n$, ERC-20 |
| **Day 7** | **Search, OSRM Routing & Groq AI Tactical Copilot** | `frontend/services/routing.service.ts`, `places.service.ts`, `geocoding.service.ts`, `backend/rag-bot-service/` | Zero-Hallucination Intent Extraction, Overpass QL, Groq LPU Cascade |
| **Day 8** | **Full Chronological Reverse-Engineering & CTO Defense** | Full Codebase, V2 Microservices Roadmap, Interview Simulation | 8-Sprint Evolution Timeline, High-Scale Distributed System Design Defense |

---

```mermaid
flowchart LR
    D1["Day 1: Genesis & System Design"] --> D2["Day 2: Data Schemas & Auth"]
    D2 --> D3["Day 3: H3 Spatial & CARTO"]
    D3 --> D4["Day 4: Sensors & Anti-Cheat"]
    D4 --> D5["Day 5: WebSockets & Sharding"]
    D5 --> D6["Day 6: Economy & Decay"]
    D6 --> D7["Day 7: Routing & Groq AI"]
    D7 --> D8["Day 8: Full History & CTO Defense"]
```

---

## Day 1 — Genesis, Architecture & Environment Blueprint
*Objective: Understand how and why TerritoryRun was conceived, map the end-to-end distributed system topology, and trace the configuration bootstrapping from bare metal to running servers.*

### Hour 1: The Product Conception & High-Level System Design (60 mins)
1. **The Core Thesis:** Why Strava, Nike Run Club, and Pokémon GO fail modern fitness users:
   * Strava/Nike: Static telemetry logs (distance, pace, heart rate) lack real-time intrinsic motivation, collective gamification, and tactical competition.
   * Pokémon GO/Ingress: Requires physical stoppage, screen tapping, and looking down—inherently dangerous and disruptive to sustained running cadence.
   * TerritoryRun Solution: Hands-free GPS tracking in the pocket; physical movement directly captures hexagonal map sectors, ignites faction warfare, and accrues economic tokens.
2. **System Architecture Topology Analysis:**
   * Trace how a packet travels: Mobile GPS Receiver $\rightarrow$ HTML5 Geolocation API $\rightarrow$ Next.js 16 Client Component $\rightarrow$ WebSocket Frame $\rightarrow$ Node.js/Express Cluster $\rightarrow$ Spatial Room Shard $\rightarrow$ MongoDB Atlas / Upstash Redis.
3. **Monorepo Folder Organization:**
   * Break down the file tree:
     ```
     runni5/
     ├── frontend/          # Next.js 16.1.6 App Router, React 19, Tailwind CSS
     ├── backend/           # Node.js 20, Express, Socket.IO, Mongoose
     │   ├── auth-service/
     │   ├── run-service/
     │   ├── territory-service/
     │   ├── rag-bot-service/
     │   └── config/
     ├── contracts/         # Solidity ERC-20 Smart Contracts (Hardhat/Foundry)
     └── render.yaml        # Infrastructure as Code (IaC) deployment definition
     ```

### Hour 2: Environment Bootstrap, Secrets & Database Handshakes (60 mins)
1. **Infrastructure as Code (`render.yaml` & `vercel.json`):**
   * Inspect `render.yaml`: How backend web services, workers, and Redis dependencies are declared declaratively.
   * Inspect `frontend/vercel.json`: Edge routing rules and serverless function boundaries.
2. **Configuration & Security Secret Injection:**
   * Inspect `.env.example` vs `backend/.env` vs `frontend/.env.local`:
     * `MONGODB_URI`: Replica Set SRV connection string with TLS certificate validation.
     * `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`: Serverless HTTP-based Redis caching client.
     * `JWT_SECRET`: 256-bit entropy HMAC secret key for stateless session signing.
     * `NEXT_PUBLIC_CARTO_API_KEY`: Domain-restricted client key for authenticated basemap tile streaming.
     * `GROQ_API_KEY`: High-throughput LPU inference credential for tactical reasoning.
3. **Database Connection Initialization (`backend/config/db.js`):**
   * Analyze the connection retry logic, socket timeout settings (10,000ms buffer timeout guard), and Mongoose connection pool parameters (`maxPoolSize: 50`).

---

## Day 2 — Data Modeling, Schema Design & Auth Lifecycles
*Objective: Master every MongoDB collection schema, field type, B-Tree index, session lifecycle, and the offline-first IndexedDB queue.*

### Hour 3: Mongoose Domain Schemas & Indexing Strategies (`backend/config/models.js`) (60 mins)
1. **`User` Schema Deep-Dive:**
   * Fields: `username`, `email`, `password` (hashed), `credits`, `faction` (`'red' | 'blue' | 'green'`), `color`, `totalDistanceKm`, `totalSteps`, `unfoggedHexes` (array of H3 Res-9 strings), `isShadowBanned`.
   * Indexing Strategy: Unique single-field indices on `username` and `email` for $O(1)$ lookups during authentication; compound index on `{ credits: -1, faction: 1 }` for sub-millisecond global leaderboard aggregation.
2. **`Territory` Schema Deep-Dive:**
   * Fields: `hexId` (H3 Resolution 9 index, primary spatial key), `ownerId` (ObjectId ref to `User`), `faction`, `health` (0–100), `initialValue`, `currentValue`, `lastClaimedAt`, `lastDecayedAt`.
   * Indexing Strategy: Unique index on `hexId`. Secondary index on `ownerId` for calculating a runner's active territory kingdom size.
3. **`Run` Schema Deep-Dive:**
   * Fields: `userId`, `startedAt`, `endedAt`, `status` (`'active' | 'ended' | 'disqualified'`), `distanceKm`, `steps`, `creditsEarned`, `path` (array of subdocuments: `{ lat, lng, timestamp }`), `claimedHexes` (array of strings), `disqualificationReason`.
   * Storage Optimization: Path coordinate compression and why GeoJSON arrays are truncated to avoid exceeding the 16MB BSON document limit.

### Hour 4: Authentication & Offline State Sync (60 mins)
1. **Stateless JWT Auth Flow (`backend/auth-service/`):**
   * User Registration: Bcrypt password hashing with 10 salt rounds (`bcrypt.hash(password, 10)`).
   * User Login: Password verification (`bcrypt.compare`), followed by signing a JWT containing `{ userId, username, faction }` with a 7-day expiration.
   * Auth Middleware: Extracting `Authorization: Bearer <token>`, validating via `jwt.verify`, and decorating `req.user`.
2. **Client State Persistence (`frontend/store/authStore.ts`):**
   * Zustand store configuration with `persist` middleware backed by `localStorage`.
   * Automatic token synchronization across browser tabs and Axios API request interceptors (`frontend/services/api.ts`).
3. **Offline Telemetry Queue (`frontend/services/offlineStore.ts`):**
   * How runners passing through cellular dead zones continue recording runs without packet loss.
   * Local storage queueing of claimed hexes and automatic drain/replay upon network reconnection (`navigator.onLine` event listener).

---

## Day 3 — The Spatial Computing Engine: Uber H3 & CARTO Basemaps
*Objective: Dissect the mathematical underpinnings of the discrete global grid system, coordinate projections, and the high-performance map rendering pipeline.*

### Hour 5: Hexagonal Mathematics & The Uber H3 Engine (60 mins)
1. **Why Hexagons over Squares and Geohashes?**
   * **The Diagonal Distortion Problem:** On a square grid (or Geohash), a cell has 8 neighbors. 4 orthogonal neighbors are at distance $D$, while 4 diagonal neighbors are at distance $\sqrt{2}D \approx 1.414D$. This introduces severe distortion when calculating territory radiuses and player proximity.
   * **The Hexagonal Invariant:** Hexagons have exactly 6 neighbors. The distance between the centroid of a hexagon and each of its 6 neighbors is identical ($D$). This symmetry makes continuous movement calculations uniform in all directions.
   * **Resolution 9 Specifications:**
     * Average Hexagon Area: **0.107 km²** (~107,000 m²).
     * Average Edge Length: **174 meters**.
     * Human Running Relevance: Traversed in 45–90 seconds at standard running paces (5:00–6:00 min/km), making it the ideal granularity for a real-time game loop.
2. **Mathematical Formulas in Code:**
   * Great-Circle **Haversine Distance**:
     $$a = \sin^2\left(\frac{\Delta\text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta\text{lon}}{2}\right)$$
     $$c = 2\arctan2\left(\sqrt{a}, \sqrt{1-a}\right), \quad D = R \cdot c \quad (R = 6,371,000\text{ m})$$
   * `latLngToCell(lat, lng, 9)`: Projecting continuous spherical coordinates into a 64-bit integer H3 cell identifier.
   * `gridDisk(originCell, k)`: Topological $k$-ring neighbor expansion for calculating territory influence and boundary clashes.
   * `cellToBoundary(hexId)`: Converting the discrete H3 string into 6 vertex coordinate pairs `[lat, lng]` for polygon rendering.

### Hour 6: Map Rendering Pipeline & CARTO Integration (60 mins)
1. **Leaflet 1.9 Architecture (`frontend/components/map/LeafletMap.tsx`):**
   * Dynamic SSR-disabled import via `next/dynamic` to prevent `window is not defined` errors during Next.js Node compilation.
   * `MapContainer` configuration with `zoomControl={false}`, `attributionControl={false}`, and custom CSS overrides for light pastel styling.
2. **CARTO Basemaps Layer Switcher:**
   * Inspect [`MapControls.tsx`](file:///c:/Programming/Projects/05_Social-Impact/runni5/frontend/components/map/MapControls.tsx):
     * CARTO Voyager (Light pastel gaming style): `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`
     * CARTO Dark Matter (Night tactical style): `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`
     * Subdomain round-robin (`a`, `b`, `c`, `d`) for parallel HTTP/2 tile streaming.
3. **High-Performance Hexagon Overlays (`MapContent.tsx` & `FogOfWarLayer.tsx`):**
   * Rendering 500+ dynamic polygons without frame drops: why Leaflet SVG path elements are optimized and how Fog of War masks unvisited territories using inverted clipping polygons.

---

## Day 4 — Live Telemetry, Sensor Fusion & 4-Tier Anti-Cheat Engine
*Objective: Reverse-engineer the client sensor listeners and the multi-layer mathematical validation engine that blocks GPS spoofers, car commuters, and packet replay attacks.*

### Hour 7: Hardware Sensor Acquisition (60 mins)
1. **GPS Telemetry Ingestion (`frontend/hooks/useGps.ts`):**
   * `navigator.geolocation.watchPosition` configuration:
     * `enableHighAccuracy: true` (forces GPS chip rather than Wi-Fi/Cell tower trilateration).
     * `maximumAge: 0` (bypasses stale cached coordinate buffers).
     * `timeout: 10000` (10s timeout triggers connection reconnect).
   * Adaptive Accuracy Filtering: Dropping raw points with `accuracy > 80m` or points where accuracy degrades by $>3\times$ suddenly.
2. **Hardware Accelerometer Step Counter (`frontend/hooks/useStepCounter.ts`):**
   * Listening to `devicemotion` events:
     $$\text{Magnitude} = \sqrt{a_x^2 + a_y^2 + a_z^2} - 9.81\text{ m/s}^2$$
   * Bandpass filtering and dynamic peak detection to count true physical heel strikes and calculate step cadence (steps per minute).

### Hour 8: The 4-Tier Anti-Cheat Gate (`frontend/app/map/page.tsx` & Backend) (60 mins)
1. **The 4 Validation Checkpoints:**
   ```
   Raw Point (lat, lng, acc, ts)
        │
        ├── [Gate 1: Accuracy Filter] ──> Accuracy <= 80m AND delta-accuracy < 3x?
        │                                  (Rejects GPS noise / multi-path reflections)
        ├── [Gate 2: Kinematic Velocity] ─> Velocity = dist / dt <= 7.5 m/s (27 km/h)?
        │                                  (Human sprint ceiling; rejects cars/trains)
        ├── [Gate 3: Teleportation Jump] ─> Delta-distance > 500m in dt < 5 seconds?
        │                                  (Rejects mock-location joystick jumps)
        └── [Gate 4: Dual-Sensor Fusion] ─> Expected Steps vs Accelerometer Vibrations?
                                           (Expected = Distance / 0.7m. Ratio >= 0.70)
   ```
2. **Defeating Mock-Location Software:**
   * Why software GPS spoofers bypass Gate 2 (by spoofing at 10 km/h) but fail Gate 4: a phone placed in a car or simulated via a desktop proxy registers **zero accelerometer heel strikes**, causing instant disqualification (`status: 'disqualified'`).

---

## Day 5 — Real-Time Multiplayer Networking: WebSockets & Spatial Sharding
*Objective: Uncover how TerritoryRun scales real-time runner broadcasts globally without server meltdown, and solve complex frontend socket state synchronization issues.*

### Hour 9: Socket.IO Server Architecture (`backend/run-service/socket.handlers.js`) (60 mins)
1. **Connection Lifecycle & Handshake Authentication:**
   * Socket handshake extracts JWT from `socket.handshake.auth.token`.
   * Unauthenticated connections are terminated at the socket protocol layer before allocating event listener memory.
2. **Event Router Mapping:**
   * `start_run`: Initializes an active run session in database and joins runner to spatial room.
   * `location_ping`: Ingests GPS coordinate stream, updates Redis active session cache, and evaluates H3 cell transitions.
   * `stop_run`: Executes anti-cheat validation, calculates total territory rewards, writes summary to MongoDB, and leaves room.

### Hour 10: Spatial Room Sharding & Frontend Immutability (60 mins)
1. **The $O(N^2)$ Broadcasting Problem:**
   * If 5,000 active runners broadcast their location to all connected clients every 2 seconds, the server must process $5,000 \times 5,000 / 2 = 12,500,000$ packet dispatches every second, causing catastrophic CPU and network interface card (NIC) exhaustion.
2. **Resolution 6 Spatial Room Sharding Solution:**
   * Res-9 Hex ($\approx 0.1\text{ km}^2$) $\rightarrow$ converted to parent Res-6 Hex ($\approx 110\text{ km}^2$).
   * Runner joins room `hex_${res6ParentId}`.
   * Location updates are broadcast **only** to clients viewing that specific $110\text{ km}^2$ sector:
     ```javascript
     socket.to(`hex_${parentHex}`).emit('live_runner', {
       userId, username, lat, lng, userColor, faction
     });
     ```
   * Result: Over **95% reduction in network overhead**.
3. **React State Array Immutability Bug:**
   * Inspect [`page.tsx`](file:///c:/Programming/Projects/05_Social-Impact/runni5/frontend/app/map/page.tsx):
     * The Bug: `existing.path.push([data.lat, data.lng])` mutated the array in place; React skipped re-rendering runner SVG polylines.
     * The Solution: `const newPath = [...existing.path, [data.lat, data.lng]];` forcing virtual DOM reconciliation.

---

## Day 6 — Game Mechanics, Territory Economy & Autonomous Decay
*Objective: Dive into the game mechanics, compounding decay mathematics, cron schedulers, and optional Web3 ERC-20 smart contract settlement.*

### Hour 11: Faction Conquest & Economic Multipliers (60 mins)
1. **The Faction Conquest State Machine:**
   * **Unclaimed Cell:** User enters unowned H3 cell $\rightarrow$ Database records new Territory (`health = 100`, `ownerId = user.id`, `faction = user.faction`) $\rightarrow$ Awards **+10 Territory Credits (TRC)**.
   * **Friendly Cell (Maintenance):** User visits own or faction cell $\rightarrow$ Resets decay timer (`lastDecayedAt = Date.now()`), restores health to 100 $\rightarrow$ Awards **+2 Maintenance TRC**.
   * **Enemy Cell (Invasion):** User visits rival faction cell $\rightarrow$ Health damaged by 50 points. If health $\le 0$, ownership transfers to invader $\rightarrow$ Awards **+25 Invasion TRC**.
2. **Peak-Hour Dynamic Multipliers:**
   * Evaluation function in `backend/territory-service/`:
     ```javascript
     const hour = new Date().getHours();
     const isPeak = (hour >= 7 && hour < 9) || (hour >= 17 && hour < 19);
     const multiplier = isPeak ? 1.5 : 1.0;
     ```

### Hour 12: Compounding Decay & Smart Contracts (60 mins)
1. **Compounding Decay Mathematics:**
   * Formula:
     $$V(t) = V_0 \times (0.98)^n$$
     Where $V_0$ is initial credit value, and $n$ is consecutive idle days without friendly maintenance.
   * Autonomous UTC Cron Engine (`backend/territory-service/decay.cron.js`):
     * Runs at 00:00 UTC daily.
     * Decrements values across all inactive hexes. When $V(t) < 1.0$, hex resets to neutral (`ownerId = null`, color = `#FFFFFF`).
2. **ERC-20 Token Smart Contract (`contracts/TerritoryCreditToken.sol`):**
   * Built on OpenZeppelin ERC-20 standard.
   * `mintVerifiedRunCredits(address runner, uint256 amount)` restricted strictly to `onlyOwner` (the backend oracle wallet) to prevent unauthorized token inflation.

---

## Day 7 — Geospatial Search, OSRM Routing & Groq AI Tactical Copilot
*Objective: Understand how the application implements Google-Maps-grade search, multi-modal routing, and a zero-hallucination natural language geospatial AI copilot.*

### Hour 13: Geocoding & OSRM Routing Engine (60 mins)
1. **Nominatim OpenStreetMap Geocoding (`frontend/services/geocoding.service.ts`):**
   * Viewport-bounded geocoding: appending `&viewbox=${minLng},${maxLat},${maxLng},${minLat}&bounded=0` to bias search autocomplete results to places within 50km of the runner's live GPS position.
2. **Overpass API POI Real-Time Scanner (`frontend/services/places.service.ts`):**
   * Querying physical OpenStreetMap nodes and ways around coordinates:
     ```
     node[amenity=cafe](around:2500, lat, lng);
     out center 15;
     ```
   * Deterministic rating hash algorithm providing stable 4.0–4.9★ ratings without expensive Google Places API bills.
3. **OSRM High-Performance Routing (`frontend/services/routing.service.ts`):**
   * Calculating real-world street routes for **Driving**, **Walking**, and **Cycling**.
   * Converting OSRM GeoJSON geometry coordinates `[lng, lat]` to Leaflet polylines `[lat, lng]` and displaying turn-by-turn maneuvers.

### Hour 14: Groq AI Tactical Copilot & "Ask Map" RAG Pipeline (60 mins)
1. **The Zero-Hallucination AI Architecture:**
   ```
   User Query: "Find good cafes near me open now"
        │
        ▼
   [Groq LPU Inference (groq/compound-mini)]
        │
        ▼
   [Structured JSON Intent Extraction]
   { category: "cafe", radiusMeters: 3000, openNow: true, minRating: 4.0 }
        │
        ▼
   [Live Overpass API Spatial Query] -> Returns real physical OSM nodes
        │
        ▼
   [Filter, Rank & Marker Display on Leaflet Map]
        │
        ▼
   [Groq Generates Natural Language Explanation from Verified Real Data]
   ```
2. **Dynamic Spatial Context Injection (`AICopilotOverlay.tsx`):**
   * Telemetry payload injected into LLaMA-3 system prompt: current H3 hex, faction alignment, and relative distances to nearest active runners (calculated via Haversine math).
3. **Resilient Model Fallback Cascade:**
   * Automatic retry mechanism across: `groq/compound-mini` $\rightarrow$ `qwen/qwen3.6-27b` $\rightarrow$ `allam-2-7b` $\rightarrow$ `llama-3.3-70b-versatile` to protect against model deprecations.

---

## Day 8 — Full Chronological Reverse-Engineering & CTO Defense
*Objective: Reconstruct the historical engineering journey from Day 0 to Production, and master the answers to senior architect and CTO interview questions.*

### Hour 15: The Chronological Build Story (Sprint 1 to Sprint 8) (60 mins)
1. **Sprint 1 (Foundations):** Next.js 16 setup, Express REST API scaffolding, MongoDB Atlas connection, JWT authentication.
2. **Sprint 2 (Spatial Core):** Uber H3 integration, Leaflet map initialization, Res-9 polygon generation, database territory schema.
3. **Sprint 3 (Real-Time Mesh):** Socket.IO implementation, GPS stream ingestion, live runner markers, and solving React path array mutation bugs.
4. **Sprint 4 (Game Economy):** Faction scoring, claiming vs. invasion battle mechanics, peak-hour multipliers, and autonomous compounding decay cron jobs.
5. **Sprint 5 (Anti-Cheat Security):** Accelerometer step counter fusion, kinematic velocity gates, and teleportation rejection filters.
6. **Sprint 6 (CARTO & Mapping Deck):** CARTO Voyager/Dark basemaps, API key authentication, Nominatim geocoding, and OSRM turn-by-turn routing.
7. **Sprint 7 (AI Tactical Copilot):** Groq LPU integration, "Ask Map" zero-hallucination spatial RAG, and the 10 core tactical commands.
8. **Sprint 8 (Production Polish):** Glassmorphism pastel UI theme, CSS stacking context modal portal fixes, Dockerfile multi-stage optimization, and Vercel/Render deployment.

### Hour 16: Senior Architect / CTO Interview Simulation (60 mins)
Master the answers to the top 5 high-difficulty architectural challenges:

#### Q1: "How would you scale this system from 5,000 to 1,000,000 concurrent active runners?"
* **Answer:** 
  1. **Decouple the Monolith into Event-Driven Microservices:** Extract `Run-Ingestion`, `Territory-Processor`, and `RAG-AI` into independent services communicating via an **Apache Kafka** event backbone.
  2. **WebSocket Fleet Scaling:** Deploy Socket.IO across a cluster of Node.js pods managed by Kubernetes (EKS), backed by a distributed **Redis Pub/Sub adapter** to route messages across nodes.
  3. **Spatial Partitioning with Geo-Sharding:** Partition the Redis cache by H3 Resolution 4 geographic regions (~20,000 km²). Runner pings are routed via DNS Geolocation (Anycast) to the nearest regional data center.
  4. **Read/Write Splitting:** Route real-time spatial reads to Redis in-memory caches, while batching MongoDB writes via Kafka consumer micro-batches (writing runs to disk only upon completion).

#### Q2: "Why not use PostGIS in PostgreSQL instead of MongoDB + Uber H3 in Node.js?"
* **Answer:** While PostGIS is the industry standard for arbitrary vector polygon intersections (`ST_Intersects`), it performs continuous floating-point geometric math, which is computationally expensive under high write throughput (thousands of runners pinging every second). By pre-discretizing the entire planet into **Uber H3 integer index tokens**, spatial containment becomes an $O(1)$ exact integer string match in Redis and MongoDB B-Trees, completely bypassing expensive polygon intersection math on every GPS ping.

#### Q3: "What prevents a malicious user from reverse-engineering the WebSocket client and forging location pings?"
* **Answer:** 
  1. Every socket message requires a signed JWT session token.
  2. The server-side Anti-Cheat Engine evaluates kinematics: incoming points must have continuous delta-time and realistic velocity ($\le 7.5\text{ m/s}$).
  3. Dual-sensor validation: the backend cross-validates reported accelerometer frequency against GPS distance.
  4. Replay attack defense: each ping requires a monotonically increasing sequence ID and millisecond timestamp validated against the server's synchronized NTP clock.

#### Q4: "How does the Groq RAG bot guarantee zero hallucinations when recommending places?"
* **Answer:** The LLM is strictly prohibited from retrieving places from its parametric memory. We decouple **Intent Parsing** from **Data Retrieval**: the Groq model acts exclusively as a semantic compiler converting natural language into a strict JSON query. The query is executed against OpenStreetMap and Overpass APIs to fetch verified ground-truth coordinates. The LLM is only provided the returned ground-truth data to format its conversational response.

#### Q5: "How does your frontend achieve 60 FPS while rendering hundreds of animated hexagon polygons on Leaflet?"
* **Answer:** Rather than creating individual React component DOM wrappers for every single hexagon (which overwhelms React's reconciliation cycle and the browser DOM), we render static territories on an HTML5 `<canvas>` tile overlay layer. Dynamic interactive territories use Leaflet SVG paths with hardware-accelerated CSS transforms (`will-change: transform`). Additionally, we cluster off-screen markers and avoid in-place state mutations.

---

*This concludes the 8-Day Master Study Curriculum. Complete these 16 hours to attain complete technical ownership of the TerritoryRun production system.*
