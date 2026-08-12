# Tech Stack Decisions & Architectural Justifications

This document provides a technical justification of the TerritoryRun (Runnify) technology stack. It details why we chose each specific technology, compares them with alternatives, and explains the engineering decisions behind each choice.

---

## 1. Stack Overview

| Layer | Selected Tech | Main Competitor | Why Selected |
|---|---|---|---|
| **Frontend Platform** | **Next.js 14 (App Router)** | React SPA (Vite / Create React App) | Supports Server-Side Rendering (SSR) for fast initial map loads and SEO. Simplifies layout persistence during navigation. |
| **Backend Core** | **Express (Modular Monolith)** | NestJS / Python FastAPI | The asynchronous event loop handles high WebSocket write concurrency efficiently. |
| **Real-time Sync** | **Socket.IO** | Native WebSockets | Provides automatic reconnection, connection heartbeats, and client grouping out of the box. |
| **Spatial Core** | **Uber H3 (Res 9)** | PostGIS (R-Tree Indexing) | Converts complex polygon-intersection checks into indexed string matches. |
| **Primary Database** | **MongoDB Atlas** | PostgreSQL | Supports dynamic JSON structures for nested player statistics and activity logs without database joins. |
| **Caching & Queues** | **Upstash Redis** | Memcached | Provides Sorted Sets to update and query player rankings with low latency. |
| **Blockchain Anchor** | **Ethereum Sepolia** | Solana | Offers a free testnet environment with flexible data limits for daily Merkle Root records. |
| **AI Query Engine** | **Groq LLaMA-3 + LangChain**| OpenAI GPT-4 | Delivers high query throughput with low latency and no licensing fees. |
| **Client Package** | **Progressive Web App (PWA)**| React Native / Flutter | Bypasses App Store submission timelines, download barriers, and developer fees. |

---

## 2. In-Depth Comparative Analyses

### A. Spatial Core: Uber H3 vs. Traditional GIS (PostGIS)

In a typical location-based game, tracking whether a runner's path crosses owned regions is calculated using geometric coordinates:
*   **The PostGIS Approach:** User paths are saved as vector geometries, such as a continuous line string. When a run ends, the database runs spatial containment checks to see if the path crosses any owned territory polygons.
    *   *The Bottleneck:* Checking whether a line intersects multiple complex polygons scales quadratically ($O(N^2)$) relative to the number of coordinates and active territories. As the database grows, these calculations require significant CPU resources and can block database threads.
*   **The Uber H3 Hex Solution:** The globe is projected as a discrete hexagonal grid. The server converts incoming coordinates into 15-character hex ID strings on ingestion (Resolution 9, representing a hexagon with a 100m edge length and a $\approx 0.1 \text{ km}^2$ area).
    *   *The Benefit:* Checking for spatial overlaps is reduced to **string matching**. The backend queries the database for existing records matching the list of hex IDs. This leverages MongoDB's indexes to resolve lookups in $O(1)$ time, bypassing coordinate-based geometry math.

---

### B. Architectural Pattern: Modular Monolith vs. Microservices

*   **The Microservices Alternative:** Separating authentication, runs, maps, and leaderboards into distinct, independent services that communicate via network APIs (like gRPC or Kafka).
    *   *The Bottleneck:* Introduces network latency (1-3ms per call), serialization overhead, and requires complex orchestration that increases hosting costs.
*   **The Modular Monolith Solution:** The backend is built as a single Node.js repository with service-scoped folders (e.g., `auth-service`, `run-service`, `chat-service`).
    *   *The Benefit:* Services import schemas locally and share an event bus. If a specific service faces high demand, its directory can be extracted and deployed as a standalone container with minimal code modifications.

---

### C. Database Architecture: MongoDB Atlas vs. PostgreSQL

*   **The PostgreSQL Alternative:** Standard relational tables with foreign keys linking users, runs, coordinates, and achievements.
    *   *The Bottleneck:* Fetching a user profile requires joining multiple tables for stats, streak calendars, unlocked colors, and rivals. Under heavy concurrent loads, these database joins can degrade performance.
*   **The MongoDB Solution:** Dynamic JSON document structures with deep indexing.
    *   *The Benefit:* Player profiles are retrieved as a single document. Real-time updates (like appending a rival clash or incrementing credit balances) are executed atomically in a single write operation, avoiding multi-table joins.

---

### D. Blockchain Anchoring: Ethereum Sepolia vs. Solana

*   **The Solana Alternative:** Anchoring daily run proofs on the Solana network.
    *   *The Bottleneck:* Solana transaction payloads are strictly limited to **1232 bytes**. Storing daily Merkle roots with metadata requires deploying custom programs and incurs rent costs.
*   **The Sepolia Testnet Solution:** Broadcasting a 0 ETH transaction to ourselves, embedding the daily Merkle Root in the transaction's data payload (`calldata`).
    *   *The Benefit:* Sepolia is a free testnet environment. Embedding the data in `calldata` is virtually free, allowing us to log daily proofs without transaction fees.

---

### E. AI Query Pipeline: Groq LLaMA-3 vs. OpenAI GPT-4

*   **The OpenAI GPT-4 Alternative:** Routing RAG bot queries to OpenAI's API.
    *   *The Bottleneck:* GPT-4 response times can exceed 1.5 seconds, and token costs scale quickly with large context payloads.
*   **The Groq LLaMA-3 Solution:** Combining LangChain's retrieval pipeline with Groq's hardware acceleration.
    *   *The Benefit:* High token generation speed (typically < 400ms for 200 tokens) with zero developer license fees.

---

### F. Client Model: Progressive Web App (PWA) vs. Native App (React Native/Flutter)

*   **The Native Alternative:** Releasing native applications on the iOS App Store and Google Play Store.
    *   *The Bottleneck:* Apple and Google developer fees, digital currency commissions, and review timelines of 1-2 days for bug fixes.
*   **The PWA Solution:** A mobile-first web app using Next.js, Tailwind, and browser service workers.
    *   *The Benefit:* Bypasses App Store submission pipelines. Updates are deployed instantly via Vercel, and users can install the app directly to their home screens from their mobile browser.

---

### G. Real-time Gateway Sync: Socket.IO vs. Native WebSockets

*   **The Native WebSocket Alternative:** Implementing a custom raw WebSocket pipeline.
    *   *The Bottleneck:* Requires writing custom heartbeat checks, connection state checkers, and retry-backoff algorithms.
*   **The Socket.IO Solution:** Utilizing Socket.IO's wrapper library.
    *   *The Benefit:* Provides automatic fallback to HTTP long-polling if WebSockets are blocked, built-in reconnection hooks, and out-of-the-box support for grouping connections.
