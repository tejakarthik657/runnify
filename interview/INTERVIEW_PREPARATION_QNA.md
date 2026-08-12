# TerritoryRun — Senior Technical Q&A Preparation Guide

This document is a comprehensive interview preparation guide containing 21 technical, architecture-level questions and answers. It is designed to prepare you for senior engineering, system design, or CTO-level reviews of the TerritoryRun (Runnify) project.

---

## 1. Spatial Math & Geolocation

### Q1: Why is Uber H3 Resolution 9 chosen as the primary grid spatial unit? What are the architectural and gaming tradeoffs of changing this to Resolution 8 or 10?
*   **Answer:** 
    *   **Resolution 9** hexes have an edge length of approximately 100 meters and a surface area of $\approx 0.1 \text{ km}^2$. For a typical runner maintaining a pace of 5:00 min/km (3.33 m/s), it takes roughly 30 seconds of running to cross a single hex. This provides a balance of immediate reward and physical challenge.
    *   **If we downgraded to Resolution 8 (~0.7 km² area):** Hexes would be too large, requiring roughly 3-4 minutes of running to cross. This reduces game pacing, makes invasions too difficult, and diminishes loss-aversion incentives.
    *   **If we upgraded to Resolution 10 (~0.01 km² area):** Hexes would be too small (~30m edge length). Normal GPS accuracy fluctuation (often 5-15 meters in urban areas) would cause false-positive claims in neighboring hexes, and database collection sizes would expand by a factor of 7.

### Q2: How does the Leaflet viewport bounds optimization function, and how do you prevent database lock bottlenecks when multiple clients pan the map concurrently?
*   **Answer:**
    *   **Implementation Flow:** The client maps the active screen viewport dimensions using map corner coordinates (bounding box) and requests only the hexes located within those coordinate limits from the server.
    *   **Database Search:** The backend utilizes MongoDB's geo-spatial search operators, searching for center point coordinates located inside the boundary coordinates. This operation leverages a spatial index to identify matches quickly.
    *   **Data Return:** The query returns raw JSON documents directly, bypassing object hydration overhead.
    *   **Concurrency Guard:** The server caches bounding-box query results in Redis for 5 seconds. If multiple nearby users query overlapping viewports, the server returns cached results directly, reducing database read load.

---

## 2. Real-time Concurrency & Socket Architecture

### Q3: How does the gateway scale to handle 10,000+ active runners streaming coordinate packets over WebSockets simultaneously?
*   **Answer:**
    1.  **Single-Threaded Event Loop:** Node.js manages active socket connections using an asynchronous event loop that handles connections without spawning separate execution threads.
    2.  **GPS Stream Throttling:** Sockets reject incoming client coordinates arriving faster than once per 3 seconds. The packet payload size is capped at 128 bytes.
    3.  **Horizontal Scale via Redis Adapter:** Multiple backend processes are load-balanced. We integrate a Redis socket adapter to sync connection states (like rooms and disconnects) across server nodes using Redis Pub/Sub.
    4.  **Decoupled Write-Buffers:** Sockets do not write directly to MongoDB on every coordinate packet. Coordinates are pushed to a Redis List buffer. When a run ends, the array is flushed to MongoDB in a single bulk write operation, protecting the database from high write frequencies.

### Q4: Explain the system's resilience when a runner loses network connectivity mid-run. How do we prevent data loss?
*   **Answer:**
    1.  **Client-Side IndexedDB Buffer:** If the socket disconnects, the client buffer-saves the timestamped GPS points locally in the browser using IndexedDB.
    2.  **Automatic Socket Reconnection:** The socket library automatically retries connection dropouts using exponential backoff.
    3.  **Reconciliation Flow:** Upon reconnecting, the client streams the cached local coordinate points back to the backend, where the server deduplicates them by sequence ID and timestamp.
    4.  **Auto-End Recovery:** If the runner never regains connection, a backend cron job auto-terminates active runs after 4 hours of silence and processes whatever points were buffered prior to the drop.

---

## 3. Anti-Cheat Engine Algorithms

### Q5: Explain the math behind the Bearing Variance calculations in the smoothness detection layer. How does it distinguish a runner from a car?
*   **Answer:**
    1.  **Bearing Calculation:** For every segment between coordinates, the engine computes the compass bearing angle using spherical trigonometry.
    2.  **Bearing Variance:** The engine calculates the standard deviation of bearing differences across 10 segments.
    3.  **The Signature:** 
        *   **Highway Vehicle:** Cars on roads maintain a bearing variance $< 0.8^\circ$ over long stretches. This triggers a straight-line car flag.
        *   **Human Runner:** Human locomotion naturally shifts side-to-side, resulting in bearing variances of $2.0^\circ$ to $15.0^\circ$.
        *   **Spoofed Teleportation:** Cheaters using manual location joysticks exhibit erratic jumps, resulting in bearing variances $> 20.0^\circ$, which triggers an erratic bearing flag.

### Q6: Walk through the Hex Dwell-Time Filter. How does it calculate time spent in a hex, and why is this critical for the economy?
*   **Answer:**
    1.  **Grouping:** The anti-cheat engine groups the run's GPS coordinates by their H3 hex ID.
    2.  **Duration calculation:** For each hex group, the engine sorts the timestamps and subtracts the earliest from the latest to find the dwell duration.
    3.  **Threshold Enforcement:** The runner must spend $\ge 8\text{ seconds}$ inside a hex for it to register as a claim.
    4.  **Drive-By Flag:** If a user drives through a neighborhood, they cross many hexes in short intervals ($< 8\text{ seconds}$). If more than 55% of hexes fail the 8-second dwell-time check, the run is flagged as a drive-by run, and the user is penalized.

### Q7: How does the system prevent false-positive speed triggers during moments of GPS drift (e.g., when a runner passes under a bridge)?
*   **Answer:**
    1.  **Accuracy Filtering:** Sockets discard points with an accuracy radius $> 50\text{ meters}$.
    2.  **Distance Smoothing:** Speed calculations must exceed the sustained limit of $5.5\text{ m/s}$ for at least 5 consecutive points to trigger a speed violation, preventing short GPS jumps from causing false positives.
    3.  **Altitude Jump Guards:** If the altitude changes by $> 100\text{ meters}$ between consecutive points, the system flags the segment as noise, ignoring its velocity contribution.

---

## 4. Cryptographic Ledger & Auditing

### Q8: Explain the Credit Ledger auditing logic. How do you prevent double-spending or credit modification exploits?
*   **Answer:**
    1.  **Immutable Writes:** The database configuration blocks update and delete operations on the ledger collection, allowing only inserts.
    2.  **Balance Reconciliation:** Every ledger write records the player's balance *after* the transaction. Before writing, the server asserts that the new balance matches the previous balance plus the transaction amount.
    3.  **Consistency Assertion:** The ledger is audited by comparing the user document's credits field against the sum of historical ledger entries, verifying that the balances match.

### Q9: How do you prevent replay attacks where a user intercepts a clean run's GPS stream payload and replays it later?
*   **Answer:**
    1.  **Dynamic Session Tokens:** Socket connections require a cryptographic handshake token containing a short-lived, single-use JWT.
    2.  **Timestamp Expiry:** Sockets reject coordinate packets where the client timestamp differs from the server's clock by more than 5 seconds.
    3.  **Strict Run Lifecycles:** Each run has a unique, server-generated UUID. Raw GPS points are bound to that specific UUID. Re-uploading coordinates to a closed or flagged run returns an authentication error.

---

## 5. Blockchain Proof & Verification

### Q10: Walk through the daily blockchain anchoring pipeline. How does the Merkle Root get generated and published?
*   **Answer:**
    1.  **Collection:** Every night at 00:00 UTC, the server queries all runs completed the previous day with a `clean` anti-cheat status.
    2.  **Hashing:** It aggregates the runs by user and hashes their daily summaries: user ID, date, credits earned, and hexes claimed.
    3.  **Merkle Tree Generation:** The hashes are paired and hashed recursively until a single root hash is generated.
    4.  **Anchoring Transaction:** The server sends a 0 ETH transaction on the Ethereum Sepolia network, embedding the root and metadata in the transaction's `calldata` parameter.
    5.  **Record Logging:** The transaction hash is saved to the `DailyProof` document for verification.

### Q11: How does a user verify their specific run against the Sepolia transaction on-chain?
*   **Answer:**
    1.  **Request:** The user queries the API for their verification proof.
    2.  **Merkle Path Generation:** The server retrieves the user's daily summary, hashes it, and builds a Merkle Proof containing the sibling hashes and their positions.
    3.  **On-Chain Comparison:** The client app fetches the transaction data from the Sepolia network, decodes the `calldata` to retrieve the Merkle Root, and applies the proof path to verify that the calculated root matches the on-chain Merkle Root.

---

## 6. Database Systems & Performance Scaling

### Q12: How do MongoDB TTL indexes clean old coordinates without blocking active read/write transactions?
*   **Answer:**
    1.  **Background Thread Execution:** MongoDB's TTL monitor runs as a background thread once every 60 seconds.
    2.  **Incremental Deletion:** Instead of executing a large delete operation that locks the database, the monitor deletes expired documents in small, incremental batches.
    3.  **Document-Level Locking:** The storage engine uses document-level locking, ensuring that read/write operations on active collections continue without thread blocking.

### Q13: What happens to the daily resetting map if a runner is active at 23:59:59 UTC? How do you prevent database write race conditions?
*   **Answer:**
    1.  **Locking State:** At 23:59:00 UTC, the API Gateway rejects the creation of new runs until the reset is complete.
    2.  **Mid-Run Split:** For active runs, coordinates streamed after 23:59:00 UTC are marked with a carry-over flag.
    3.  **Partial Processing:** At 23:59:59 UTC, the reset cron executes, wiping the active map.
    4.  **Re-entry:** When the runner completes their session, points marked with the carry-over flag are processed and credited to the next day's map, ensuring no progress is lost.

### Q14: Explain the differences in writing leaderboard rankings between MongoDB Aggregations and Redis Sorted Sets.
*   **Answer:**
    *   **MongoDB Aggregation:** Needs to sort all documents on request, which requires $O(N \log N)$ sorting time and consumes CPU as the collection grows.
    *   **Redis Sorted Sets:** Uses a skip list data structure under the hood. Adding or updating scores runs in $O(\log N)$ time, and retrieving the top rankings runs in $O(\log N + M)$ time (where $M$ is the number of requested elements), returning the sorted leaderboard in milliseconds.

---

## 7. AI Bot & LangChain Pipelines

### Q15: Walk through the LangChain RAG database ingest pipeline. How do you keep the LLM updated with active map data?
*   **Answer:**
    1.  **Extraction:** Every 6 hours, a cron job extracts leaderboard standings, active faction control percentages, and recent clash logs from the database.
    2.  **Compilation:** This structured data is compiled into a text document.
    3.  **Vectorization:** LangChain parses the document, splits it into chunks, and converts the chunks into vector embeddings.
    4.  **Ingestion:** The embeddings are saved to a directory-scoped vector database. When a user asks the chatbot a question, the system queries the vector database for the most relevant context and appends it to the LLM prompt.

### Q16: How do you prevent prompt injection attacks on the Groq chatbot?
*   **Answer:**
    1.  **System Prompt Separation:** System rules are defined in a read-only system instruction block, while user inputs are passed within isolated user messages.
    2.  **Context Escaping:** Context from the vector database is wrapped in delimiters to prevent the LLM from executing user-injected system instructions.
    3.  **Output Sanitization:** Regex filters intercept model outputs to block potential system prompt leaks or forbidden key phrases before they reach the client UI.

---

## 8. Frontend Mechanics & PWA Lifecycle

### Q17: How does the slide-to-pause tracking component distinguish running bounce-shaking from intentional swipe gestures?
*   **Answer:**
    1.  **Gesture Thresholding:** The custom UI component tracks touch events to calculate the touch trajectory. It requires a continuous horizontal swipe of at least 150 pixels to trigger a state change.
    2.  **Velocity Check:** Touch paths must be completed within 350 milliseconds to distinguish a deliberate swipe from random screen contact.
    3.  **Angle Alignment:** The touch trail's vertical variance must remain below $20^\circ$ relative to the horizontal axis, preventing running bounce-shaking from triggering a pause.

### Q18: What is your strategy for caching static maps on the frontend to minimize tile requests?
*   **Answer:**
    1.  **Service Worker Tile Capture:** The PWA register script mounts a Service Worker that intercepts outgoing tile requests.
    2.  **Cache-First Implementation:** Map tiles are saved directly to browser cache storage. When panning, the Service Worker returns cached tiles immediately, loading tiles over the network only when coordinates aren't cached.
    3.  **Expiry Limit:** Tile caches are cleared after 7 days to keep local storage clean.

---

## 9. Security, Authentication & Deployment

### Q19: Explain the JWT Token Lifecycle configuration. How do we defend against Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF)?
*   **Answer:**
    1.  **Short-Lived Access Tokens:** Access tokens are signed JWTs with a 15-minute lifespan and are stored in client memory.
    2.  **Rotating Refresh Tokens:** Refresh tokens have a 7-day lifespan and are stored in an HTTP-only, SameSite=Strict secure cookie.
    3.  **XSS Defense:** Storing the access token in client memory and the refresh token in an HTTP-only cookie prevents JavaScript from accessing session data.
    4.  **CSRF Defense:** We configure SameSite=Strict on refresh cookies, ensuring browsers block cookies on cross-domain requests.

### Q20: Explain the Achievements Engine checking loop. How do you check achievements without running database aggregations on every run completion?
*   **Answer:**
    1.  **Event-Driven Checkers:** Achievements are evaluated by listening to run processing events.
    2.  **Delta Validation:** Instead of aggregating a user's entire running history, the checker checks conditions against the run's summary payload and the user's profile stats.
    3.  **Bitwise Unlocks Cache:** Unlocked badges are saved as a binary bitmask string on the User document, making checks efficient $O(1)$ operations.

### Q21: What happens if the Redis cache is flushed or becomes unavailable?
*   **Answer:**
    1.  **Graceful Degrade:** If Redis throws a connection error, catch blocks redirect queries to MongoDB.
    2.  **Direct Mongo Fallback:** Leaderboards fall back to direct MongoDB aggregations, and rate limiters degrade to memory-store rate limiters in Express.
    3.  **Auto-Reconnect Loop:** The Redis client executes an auto-reconnect cycle in the background, updating caches once Redis recovers.
