# Interview & Startup Pitch Preparation Guide

This guide compiles potential technical interview questions and startup pitch scenarios regarding TerritoryRun, along with strategic answers.

---

## Part 1: Technical & System Architecture Questions

### Q1: Why did you build this project as a web app (Next.js/PWA) instead of a native mobile app (React Native/Flutter)?
*   **The Trap:** Saying "because mobile apps are too hard to code."
*   **Strategic Answer:** "Building a Progressive Web App (PWA) allowed us to bypass App Store distribution frictions, avoid developer license fees, and eliminate the 1-2 day approval delay for updates. In an early-stage startup, speed-to-market is the primary metric. Using Next.js 14 and Tailwind, we built a responsive mobile-first interface that can be installed on home screens. It performs just as smoothly as a native app because the heavy spatial calculations (H3 mappings) and anti-cheat checks are handled on the backend. This setup also allows us to push updates instantly."

### Q2: Explain the Uber H3 grid system. Why is it superior to traditional spatial indexes like PostGIS for this application?
*   **The Trap:** Giving a generic explanation of hexagons.
*   **Strategic Answer:** "Traditional database spatial indexes (like R-Trees in PostGIS) compute relationships using geometry math. If 1,000 runners uploaded runs simultaneously, checking if their paths intersected with existing claims would require expensive polygon-on-polygon intersection operations—an $O(N^2)$ workload that spikes server CPU usage. 
    By converting GPS coordinates to Uber H3 Hex strings (at Resolution 9, ~0.1 km²) on input, we convert spatial problems into string matching. Checking if a run invades another player's territory becomes a simple MongoDB query: `Territory.find({ hexId: { $in: runHexIds } })`, which runs in milliseconds. It reduces spatial calculation costs by over 95%, allowing the system to run on lightweight hardware."

### Q3: How do you handle high write-volumes from thousands of simultaneous real-time GPS socket streams?
*   **The Trap:** Suggesting upgrading to a larger database.
*   **Strategic Answer:** "We implemented three layers of optimization to protect the database:
    1.  **Stream Throttling:** Sockets only write coordinates to the database once every 3 seconds per runner, discarding coordinates with low accuracy (>50m) on the fly.
    2.  **Collection Splitting:** We separated the raw coordinates into a dedicated `gps_points` collection, keeping the main `runs` collection lightweight.
    3.  **Data Pruning (TTL):** Raw GPS coordinates are only needed for post-run analysis and anti-cheat validation. Once validated, we retain the run summaries but automatically delete the raw coordinates after 90 days using a MongoDB Time-To-Live (TTL) index. This keeps our active storage size low."

### Q4: Walk us through your anti-cheat pipeline. How do you prevent GPS spoofing?
*   **The Trap:** Saying "we trust client inputs."
*   **Strategic Answer:** "We developed a server-side, 6-layer anti-cheat validation pipeline:
    *   **Layer 1 (Speed):** Flags speeds exceeding 9 m/s (vehicle detection) or sustained speeds above 5.5 m/s.
    *   **Layer 2 (Smoothness):** Analyzes bearing variance. Perfectly straight paths with zero variance at high speeds indicate highway vehicles, while extreme variance indicates GPS jumping.
    *   **Layer 3 (Pace):** Rejects runs with an average pace faster than 2.5 min/km.
    *   **Layer 4 (Dwell Time):** Users must spend at least 8 seconds inside a hex to claim it. If over 55% of claimed hexes fail this check, it flags a drive-by run.
    *   **Layer 5 (Integrity):** Rejects coordinates if the device reports mock location providers, or if altitude jumps by >100m between segments.
    *   **Layer 6 (Farming):** Tracks IP accounts in Redis to prevent multiple accounts from farming the same route.
    If the accumulated violation weight is >= 150, the run is automatically disqualified."

---

## Part 2: Startup & Pitch Scenarios

### Pitch 1: What is the Unique Value Proposition (UVP) of TerritoryRun?
> **Answer:** "Strava tracks your runs; Pokémon GO gamifies your walks. TerritoryRun turns exercise into a competitive territory-control game. We leverage the psychology of loss aversion: when someone runs through your neighborhood, they claim your territory. You receive an immediate notification, motivating you to run again to reclaim it. It transforms boring exercise routine into a daily competition."

### Pitch 2: How do you solve the 'Early Adopter Monopoly' problem common in territory games?
> **Answer:** "In games like Ingress or Pokémon GO, early players occupy gym structures, leaving newcomers with no entry point. We solve this through our **Daily Reset Mechanism**. Every night at 23:59 UTC, the map is wiped clean. Territory ownership is reset, and the top 10 leaderboard players are awarded permanent profile bonus credits. This gives new players a fresh chance to claim their neighborhood every morning, while encouraging veterans to log back in daily to defend their ranking."

### Pitch 3: How does the blockchain integration add value to a fitness app?
> **Answer:** "Traditional fitness platforms struggle with leaderboard trust because GPS data is easy to spoof, undermining competition. 
    By compiling daily runs into a Merkle Tree and anchoring the Merkle Root to the Ethereum Sepolia blockchain, we provide a public, immutable ledger of verified runs. Anyone can check the authenticity of a run against the block hash. This ensures our leaderboard ranks are trustless and verified, which is key if we run sponsored tournaments with real rewards."

### Pitch 4: What is your monetization strategy? Can users buy credits to win?
> **Answer:** "TerritoryRun is strictly **play-to-earn**—you can only earn credits and claim territory by running. Allowing users to buy credits would ruin the competitive integrity. 
    Instead, we monetize through:
    1.  **Sponsored Zones:** Local businesses (like coffee shops or running stores) can pay to sponsor high-value hexes, drawing runners to their locations.
    2.  **Premium Cosmetics:** Users can purchase custom map colors, avatars, and profile themes.
    3.  **B2B Enterprise API:** Corporate wellness challenges sponsored by companies for their employees, utilizing our private leaderboard structures."
