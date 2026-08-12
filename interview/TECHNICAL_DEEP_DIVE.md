# TerritoryRun — Features & Algorithms Technical Deep Dive

This document details the technical implementation flows, mathematical calculations, and architectural steps of all features in TerritoryRun (Runnify). It describes how each subsystem functions, the step-by-step data pathways, and the engineering decisions behind them.

---

## 1. Geospatial & Real-time Core Features

### Feature 1: GPS to Uber H3 Mapping (Resolution 9)
*   **Purpose:** Map continuous coordinate streams to discrete grid units, converting geometric math into string comparison operations.
*   **Implementation Flow:**
    1.  The backend receives GPS coordinates `(latitude, longitude)`.
    2.  It calls the H3 library's coordinate mapping function, setting the resolution to **Resolution 9** (which represents a hexagon with a 100m edge length and a $\approx 0.1 \text{ km}^2$ area).
    3.  The coordinates are converted into a unique 15-character base-16 string representing the target cell (e.g., `'8928308280fffff'`).
    4.  To retrieve coordinates for rendering, the cell ID is passed to H3 boundary utilities, which return an array of 6 coordinate pairs representing the vertices of the hexagon.
*   **Why Resolution 9:** At an average running pace of 5:00 min/km (3.33 m/s), crossing a single Resolution 9 hex takes approximately 30 seconds. This resolution is small enough to provide a sense of progress but large enough to limit database overhead.

### Feature 2: Real-time GPS Streaming (Socket.IO)
*   **Purpose:** Stream user coordinates during active runs to display live trails and run paths.
*   **Implementation Flow:**
    1.  The Next.js client registers a navigator geolocation listener, setting parameters to request high accuracy and bypass cache.
    2.  When a coordinate update occurs, the client sends a `gps_update` payload containing `latitude`, `longitude`, `accuracy`, `altitude`, and `timestamp` through Socket.IO.
    3.  The API Gateway receives the socket packet, validates the connection token, and checks the transmission rate limit.

### Feature 3: GPS Stream Throttling & Precision Discarding
*   **Purpose:** Protect database write capacities and filter out noisy location data.
*   **Implementation Flow:**
    1.  The Socket server tracks the timestamp of the last received packet for each active socket session.
    2.  If a new packet arrives less than 3 seconds after the previous one, it is discarded.
    3.  The gateway checks the coordinate accuracy radius: if the radius exceeds 50 meters, the point is discarded as noise.
    4.  The server maintains a count of active points: if the point count for a single run exceeds 500, subsequent updates are rejected, and the run session is capped.

### Feature 4: Slide-to-Pause / Slide-to-Stop Controls
*   **Purpose:** Prevent accidental run stops caused by screen contact with moisture or sweat.
*   **Implementation Flow:**
    1.  The client UI implements swipe gesture controllers instead of standard buttons.
    2.  The interface tracks touch events (`onTouchStart`, `onTouchMove`, `onTouchEnd`) to calculate the touch trajectory.
    3.  A swipe must travel at least 150 horizontal pixels within 350 milliseconds to trigger a state change.
    4.  The swipe path's vertical variance must remain below $20^\circ$ relative to the horizontal axis to distinguish deliberate gestures from accidental bumps during a run.

---

## 2. Consolidate Feature: 6-Layer Server-Side Anti-Cheat Engine

To protect the game economy and leaderboard, the system runs all completed runs through a multi-dimensional anti-cheat module before any data is written to the database. If a run accumulates **$\ge 150$ points** of violation weight, it is disqualified.

```
Anti-Cheat System Metrics:
├── Layer 1: Speed (Max 9m/s, Sustained > 5.5m/s)
├── Layer 2: Smoothness Variance (Bearing SD < 0.8° or > 20.0°)
├── Layer 3: Average Pace Check (< 2.5 min/km is impossible)
├── Layer 4: Hex Dwell Time (Must spend >= 8s in a hex to claim it)
├── Layer 5: Device Integrity (isMockLocation, Altitude jumps > 100m)
└── Layer 6: Account Farming (Max 3 accounts/IP, Rapid reclaim buffers)
```

### The 6-Layer Verification Flow

#### Layer 1: Speed Boundary Validation (Hard & Sustained Caps)
*   **Hard Cap:** The engine calculates the velocity for each coordinate segment:
    $$v_i = \frac{\text{DistanceMeters}(P_{i-1}, P_i)}{t_i - t_{i-1}}$$
    If any single segment velocity exceeds **$9.0\text{ m/s}$ (32.4 km/h)**, the engine flags a speed violation (`SPEED_EXCEEDED`, Weight: 100).
*   **Sustained Speed:** If segment speeds exceed **$5.5\text{ m/s}$ (19.8 km/h)** for more than 5 consecutive segments, it flags a sustained speed violation (`SPEED_SUSTAINED`, Weight: 65). This distinguishes sprint segments from vehicle-based travel.

#### Layer 2: Directional & Uniformity Smoothness
*   **Bearing Variance:** The engine calculates the compass bearing angle $\theta_i$ for each segment. It then calculates the standard deviation of bearing differences across the run:
    $$\text{Variance} = \text{stddev}(\Delta \theta_i)$$
    *   If the bearing variance is **$< 0.8^\circ$** over 10 or more points and the average speed exceeds $7.0\text{ m/s}$, it indicates vehicle travel on a straight road, raising a `STRAIGHT_LINE` flag (Weight: 30).
    *   If the bearing variance is **$> 20.0^\circ$**, it indicates erratic movement or teleportation, raising a `BEARING_VARIANCE_HIGH` flag (Weight: 35).
*   **Velocity Uniformity:** The engine calculates the Coefficient of Variation ($CV$) of speeds:
    $$CV = \frac{\text{stddev}(v)}{\text{mean}(v)}$$
    If $CV < 0.08$ at speeds above $7.0\text{ m/s}$, it indicates vehicle cruise control, raising a `SPEED_UNIFORM` flag (Weight: 30).

#### Layer 3: Pace Plausibility
*   The engine calculates the average pace for the run:
    $$\text{Pace} = \frac{\text{TotalSeconds}}{60 \times \text{TotalDistanceKm}}$$
    If the average pace is faster than **2.5 min/km** on a run longer than 0.5 km, it raises a `PACE_IMPOSSIBLE` flag (Weight: 80).

#### Layer 4: Hex Dwell-Time Filter
*   The engine groups coordinate points by their H3 hex ID and calculates the dwell duration inside each hex:
    $$\Delta t_{\text{dwell}} = t_{\text{last}} - t_{\text{first}}$$
*   A hex is marked as valid only if $\Delta t_{\text{dwell}} \ge 8\text{ seconds}$.
*   If the run contains $\ge 20$ hexes and more than **55%** of them fail the 8-second dwell-time check, the engine flags a drive-by claim anomaly (`DWELL_ANOMALY`, Weight: 50).

#### Layer 5: Device & Location Integrity
*   **Mock Locations:** The system rejects runs if the client device reports that mock location providers are active (`MOCK_LOCATION`, Weight: 90).
*   **Altitude Teleportation:** The engine monitors altitude changes between points. If the altitude changes by **$> 100\text{ meters}$** between consecutive segments, it flags a teleportation anomaly (`ALTITUDE_TELEPORT`, Weight: 65). It also flags negative altitude readings (`ALTITUDE_NEGATIVE`, Weight: 30) as potential spoofing.

#### Layer 6: Account Farming & Rapid Reclaim
*   **IP Multi-accounting:** When a run is uploaded, the engine checks a Redis set of active user IDs associated with the client's IP address (`ac:ip:<ip_address>`). If the number of unique accounts exceeds **3**, it flags account farming (`ACCOUNT_FARMING`, Weight: 85).
*   **Rapid Reclaim:** The engine tracks ownership changes for each hex. If a hex is repeatedly claimed back and forth between two accounts in less than **10 minutes**, it flags a rapid reclaim violation (`RAPID_RECLAIM`, Weight: 95).

---

## 3. End-of-Run Processing & Financial Logic

### Feature 8: End-of-Run Processing Pipeline
*   **Purpose:** Coordinate the validation, write-out, and reward operations when a run is submitted.
*   **Implementation Flow:**
    1.  The client sends a `POST /run/end` request containing the run UUID.
    2.  The server retrieves the buffered GPS coordinates from Redis, checks for duplicates, and calculates the total distance.
    3.  It classifies the hexes based on their current ownership state (claimed, revisited, or invaded).
    4.  It passes the data to the anti-cheat engine to determine the run's validity and credit multiplier.
    5.  For valid runs, it filters out hexes that fail the 8-second dwell-time check.
    6.  It calculates the credits earned, updates the database records, invalidates relevant cache entries, and returns the run summary to the client.

### Feature 9: Credit Multiplier Engine
*   **Purpose:** Calculate the base credits earned and apply multipliers.
*   **Implementation Flow:**
    1.  The base credits are calculated from claims and invasions: claims earn 10 credits each, and invasions earn 25 credits.
    2.  The engine checks the timestamp of the run. If the run occurred during peak rush hours (06:00–09:00 or 17:00–20:00 local time), a **$1.5\text{x}$ multiplier** is applied.
    3.  The engine applies the anti-cheat multiplier based on the validation verdict.
    4.  The final credit total is rounded down to the nearest integer and added to the user's balance.

### Feature 10: Immutable Credit Ledger
*   **Purpose:** Maintain a secure, write-only log of all credit balance changes to prevent manipulation.
*   **Implementation Flow:**
    1.  Every transaction (e.g., run rewards, decay, invasions) writes a new record to the `CreditLedger` collection.
    2.  The database configuration blocks updates and deletes on this collection.
    3.  Each ledger entry records the transaction amount, the reason, the associated run ID, and the player's balance *after* the transaction: `balanceAfter`.
    4.  Before committing changes, the server verifies that the calculated balance matches the user's new balance.

---

## 4. Scheduling & Game Loop Systems

### Feature 11: Daily Map Reset Loop
*   **Purpose:** Reset the map daily to ensure a dynamic game board for all players.
*   **Implementation Flow:**
    1.  A cron task executes daily at 23:59 UTC.
    2.  It queries the global rankings, identifies the top 10 players, and adds ranking bonus credits directly to their profiles.
    3.  It clears all documents from the `Territory` collection, resetting grid ownership.
    4.  It invalidates the leaderboard caches in Redis to force a fresh calculation the next day.
    5.  It broadcasts a `daily_reset` event via Socket.IO, prompting active clients to refresh their map views.

### Feature 12: Daily Blockchain Proof Anchoring
*   **Purpose:** Publish a daily cryptographic proof of clean runs to a public blockchain.
*   **Implementation Flow:**
    1.  A cron task executes daily at 00:00 UTC.
    2.  It queries all runs from the previous day that passed the anti-cheat check.
    3.  It groups runs by user and hashes the summaries into leaf nodes:
        $$\text{Leaf} = \text{sha256}(\text{userId} + \text{date} + \text{creditsEarned} + \text{hexesClaimed})$$
    4.  It constructs a Merkle Tree from the leaf nodes, generating a single Merkle Root.
    5.  The server broadcasts a 0 ETH transaction to itself on the Ethereum Sepolia testnet, embedding the root and metadata in the transaction's `calldata`.
    6.  It writes the transaction hash (`txHash`) to the `DailyProof` document for verification.

### Feature 13: On-Chain Audit Proof Verification
*   **Purpose:** Allow players to verify their runs against the public blockchain records.
*   **Implementation Flow:**
    1.  The client requests a verification proof for a specific date and run ID.
    2.  The server retrieves all valid runs for that date and rebuilds the Merkle Tree.
    3.  It generates a Merkle Proof (the sibling hashes and their positions) for the target run.
    4.  The client fetches the on-chain Merkle Root from the Sepolia transaction data.
    5.  The client hashes its run details, applies the proof path, and asserts that the calculated root matches the on-chain Merkle Root.

---

## 5. Caching, Leaderboards & Search Features

### Feature 14: Redis Leaderboards (Sorted Sets)
*   **Purpose:** Manage real-time player rankings with low read latency.
*   **Implementation Flow:**
    1.  The system uses Upstash Redis Sorted Sets (`ZSET`).
    2.  When a player earns credits, the server updates their score in the database and calls `ZADD` in Redis to update their rank:
        `ZADD leaderboard:<city> <credits> <username>`
    3.  When a user requests the leaderboard, the server calls `ZREVRANGEBYSCORE` to fetch the top rankings in $O(\log N)$ time, bypassing database query overhead.

### Feature 15: Leaflet Viewport Hex Hydration
*   **Purpose:** Fetch and render only the hexagons within the user's current map view.
*   **Implementation Flow:**
    1.  The client hooks into Leaflet's `moveend` event to detect map pans and zooms.
    2.  It retrieves the map bounds (`map.getBounds()`) and requests coordinates within those boundaries.
    3.  The backend queries MongoDB using a spatial index with a `$geoWithin` box query, retrieving matching hex cells.
    4.  The client converts the H3 cell IDs to polygon coordinates and renders them on the map.

### Feature 16: Faction Colors & Prestige White
*   **Purpose:** Manage player visual identity and provide a prestige status marker.
*   **Implementation Flow:**
    1.  Users select from 7 high-contrast colors, which are saved to their profiles and mapped to their claimed hexes.
    2.  A rank checker monitors the top positions in each city.
    3.  The user holding the #1 spot in a city has the prestige white color (`#FFFFFF`) added to their profile options.
    4.  If they lose the top spot, the color is locked, and their active hexes revert to their secondary color.

---

## 6. Smart Features & AI Integration

### Feature 17: RAG Context Generation Cron
*   **Purpose:** Compile active game state details into a format suitable for the AI chatbot.
*   **Implementation Flow:**
    1.  A cron task executes every 6 hours, querying leaderboard standings, active faction control percentages, and recent clash logs.
    2.  It compiles this data into a structured Markdown document.
    3.  It splits the document into text chunks, generates vector embeddings, and saves them to a local vector store.

### Feature 18: Groq LLaMA-3 Assistant Bot
*   **Purpose:** Provide context-aware tactical advice to players.
*   **Implementation Flow:**
    1.  The user sends a query (e.g., *"How do I beat TR-A4F2?"*) to `/api/bot/query`.
    2.  The bot service searches the vector store for relevant local game context.
    3.  It appends the context to the user's prompt and routes the payload to Groq's LLaMA-3 API.
    4.  The generated response is returned to the user interface.

### Feature 19: Elevation Analysis Service (`elevation-service`)
*   **Purpose:** Process GPS elevation changes to calculate climbs and terrain difficulty.
*   **Implementation Flow:**
    1.  The server processes the run's GPS trace data.
    2.  It calculates elevation gain and loss by summing vertical changes between segments.
    3.  It calculates the average grade percent:
        $$\text{Grade} = \frac{\text{ElevationGain}}{\text{HorizontalDistance}} \times 100$$
    4.  It classifies the terrain (e.g., flat, rolling, hilly, mountainous) and awards climbing badges (e.g., "Hill Climber") based on cumulative elevation gains.

### Feature 20: Heatmap Generation Service (`heatmap-service`)
*   **Purpose:** Map user running density to display active paths.
*   **Implementation Flow:**
    1.  The server aggregates GPS coordinates from recent runs.
    2.  It groups coordinates using H3 hexes and counts the frequency of visits per hex.
    3.  It generates a GeoJSON feature collection where each hex's opacity is scaled relative to its coordinate frequency.
    4.  The client renders this GeoJSON layer as a heatmap overlay.

### Feature 21: Python Route Optimizer (`06-route-optimization`)
*   **Purpose:** Recommend optimal routes to maximize hex claims.
*   **Implementation Flow:**
    1.  The client requests an optimized route from their current location.
    2.  The FastAPI service builds a local coordinate graph using NetworkX.
    3.  It applies a greedy nearest-neighbor algorithm to find a loop route that avoids already-owned hexes while maximizing unclaimed hexes.
    4.  The generated route coordinates are returned to the frontend.

### Feature 22: Python Churn Predictor (`03-engagement-engine`)
*   **Purpose:** Identify players at risk of churning based on activity patterns.
*   **Implementation Flow:**
    1.  The engine retrieves a user's running history, tracking frequency, distance, and recency.
    2.  It inputs these metrics into a logistic regression model.
    3.  It calculates a churn risk probability score (0-100).
    4.  If the score indicates a high risk, the server schedules a streak recovery notification.

### Feature 23: Python Badge Image Builder (`11-badge-generator`)
*   **Purpose:** Generate shareable achievement images.
*   **Implementation Flow:**
    1.  When a player unlocks an achievement, the client requests a badge image.
    2.  The FastAPI service uses Pillow (PIL) to draw the achievement details and a unique verification QR code onto a template.
    3.  The generated image is converted to a base64 string or saved as a public URL for social sharing.

---

## 7. System Infrastructure Features

### Feature 24: Node to FastAPI Service Bridge
*   **Purpose:** Route advanced analytics requests to the Python microservices.
*   **Implementation Flow:**
    1.  The API Gateway intercepts routes prefixed with `/python`.
    2.  It parses the target service (e.g., `stats`, `engagement`, `routes`) and maps it to the corresponding port.
    3.  It proxies the request to the local FastAPI service and returns the response.

### Feature 25: JWT Session Lifecycle & Authentication
*   **Purpose:** Authenticate users securely.
*   **Implementation Flow:**
    1.  Upon login, the server issues a JWT access token with a 15-minute lifespan and sets an HTTP-only secure cookie for a 7-day refresh token.
    2.  The client stores the access token in memory.
    3.  When the access token expires, the client sends a request containing the refresh cookie to `/api/auth/refresh` to obtain a new access token.

### Feature 26: API Gateway Rate Limiting & Security
*   **Purpose:** Protect routes from misuse and enforce rate limits.
*   **Implementation Flow:**
    1.  The Express gateway uses `express-rate-limit` to monitor request rates by IP.
    2.  It blocks IPs that exceed 1,000 requests per minute.
    3.  It mounts Helmet middleware to set security headers (e.g., CSP, X-Frame-Options) and restricts CORS access to verified domains.

### Feature 27: Streak Tracking & Prediction (`18-streak-calculator`)
*   **Purpose:** Track consecutive active days and predict streak milestones.
*   **Implementation Flow:**
    1.  The system calculates streaks by comparing the current run's date with the user's `lastRunDate`.
    2.  If the difference is between 24 and 48 hours, the current streak increments by 1.
    3.  If the difference exceeds 48 hours, the streak resets to 1.
    4.  The FastAPI service analyzes the user's historical streak patterns to predict upcoming milestones.

### Feature 28: Challenge Recommender Engine (`16-challenge-recommender`)
*   **Purpose:** Suggest personalized running challenges to users.
*   **Implementation Flow:**
    1.  The service retrieves the user's average distance and pace.
    2.  It matches the user's profile against active challenges (e.g., "5km Climb", "10 Hex Claim") using a scikit-learn collaborative filtering model.
    3.  It returns a list of recommended challenges that match the user's skill level.

### Feature 29: Run Name Generator (`17-run-name-generator`)
*   **Purpose:** Generate funny, location-based names for completed runs.
*   **Implementation Flow:**
    1.  Upon run completion, the system requests a name suggestion.
    2.  The service checks the run's start coordinates and maps them to a local city sector or landmark.
    3.  It combines the location details with random activity verbs to generate a name (e.g., "The Waterfront Wobble").

### Feature 30: Territory Vulnerability Analyzer (`05-territory-analyzer`)
*   **Purpose:** Identify hexes at risk of being claimed by rivals.
*   **Implementation Flow:**
    1.  The system retrieves the user's owned hexes.
    2.  It counts the number of neighboring cells owned by rivals for each hex.
    3.  Hexes with many rival-owned neighbors are flagged as vulnerable, helping the user prioritize defense runs.

### Feature 31: Credit Route Optimizer (`19-credit-optimizer`)
*   **Purpose:** Suggest routes that maximize credit earnings per kilometer.
*   **Implementation Flow:**
    1.  The system analyzes local hex ownership states.
    2.  It runs a pathfinding algorithm to identify routes that cross high-value, rival-owned, or unclaimed hexes.
    3.  It returns a suggested path designed to maximize credit returns.

### Feature 32: GitHub Actions CI/CD Pipeline
*   **Purpose:** Automate testing and deployment verification.
*   **Implementation Flow:**
    1.  A GitHub Actions workflow triggers on pull requests to the `main` or `develop` branches.
    2.  It builds the environment, installs dependencies, and runs Jest unit and integration tests.
    3.  If the tests pass, it triggers deployment builds on Vercel and Render.

### Feature 33: Production Rollback Orchestration
*   **Purpose:** Support quick rollbacks to stable releases in case of deployment failures.
*   **Implementation Flow:**
    1.  For frontend updates, the Vercel dashboard supports rolling back to the last stable deployment in under 30 seconds.
    2.  For backend updates, the Render console supports redeploying previous Git commit hashes.
