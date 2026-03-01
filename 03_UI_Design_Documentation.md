# TERRITORY RUN — UI Design Documentation
> Visual Language · Component System · Page-by-Page Specs

---

## 1. Design Philosophy

TerritoryRun's visual language draws from three references: the tactical readability of military map overlays, the kinetic energy of fitness tracking apps, and the competitive drama of esports dashboards. It should feel like you're looking at a **live war room** — not a wellness app.

**Core tension to resolve:** The map must be visually complex (many user colors, hex overlays, live updates) while every UI element must remain instantly readable. This means restraint in chrome, aggression in data visualization.

---

## 2. Color System

### 2.1 Brand Palette

| Token | Hex | Usage |
|---|---|---|
| Deep Navy (Background) | `#0D0D1A` | Primary background. Near-black with blue undertone — creates premium dark mode feel and makes neon hex colors pop. |
| Electric Green (Primary) | `#00C896` | Primary CTA, active states, earned credits, positive actions. The brand's signature color. |
| Neon Orange (Accent) | `#FF6B35` | Secondary actions, warnings, streak indicators, competitive alerts. High energy, urgent. |
| Ghost White (Text) | `#E8E8F0` | Primary text on dark background. Slightly cool white to match the map/space aesthetic. |
| Muted Slate (Secondary Text) | `#6B7280` | Secondary labels, timestamps, metadata. Never use pure gray — always slightly blue. |
| Danger Red (Invasion) | `#FF2244` | Invasion notifications, territory lost, credit deduction. Unmistakable. |

### 2.2 Territory Player Colors (8 Selectable)

| Color | Hex | Notes |
|---|---|---|
| Neon Green | `#00FF88` | Default for new users. High visibility on map. |
| Electric Blue | `#0080FF` | High contrast on dark map backgrounds. |
| Crimson Red | `#FF2244` | Aggressive, dominant. Popular with competitive players. |
| Amber Gold | `#FFB300` | Prestige feel. High-rank player favourite. |
| Magenta | `#FF00AA` | Maximum visibility. Hard to ignore on map. |
| Cyan | `#00DDFF` | Cool, strategic feel. |
| Deep Orange | `#FF5500` | Warm aggression. Distinguishable from red. |
| Prestige White | `#FFFFFF` | **Unlocked only at City Rank #1.** Maximum status signal. |

---

## 3. Typography System

| Role | Font | Size | Weight | Usage |
|---|---|---|---|---|
| Display | Space Grotesk | 48–72px | 800 | Hero headlines, rank numbers, credit totals |
| Heading 1 | Space Grotesk | 32px | 700 | Page titles, section headers |
| Heading 2 | Space Grotesk | 24px | 600 | Card titles, modal headers |
| Body | Inter | 16px | 400 | Descriptions, chat, notifications |
| Body Small | Inter | 14px | 400 | Meta info, timestamps, labels |
| Code / Hash | JetBrains Mono | 14px | 500 | Hashcodes, hex IDs, blockchain hashes |
| Stat Number | Space Grotesk | 40px | 800 | Dashboard KPIs — km, credits, rank |
| Map Labels | Inter | 11px | 500 | Username labels on map at zoom level 14+ |

---

## 4. Component Library

### 4.1 HexCard — Territory Ownership Card

Displays a single claimed hex's info. Used in profile heatmap and run results.

- **Shape:** Hexagonal SVG container with user's color fill at 80% opacity
- **On hover:** Fills to 100% opacity + shows invasion count
- **Size variants:** XS (16px, map overlay), MD (48px, heatmap), LG (96px, featured)

### 4.2 CreditDelta — Credit Change Indicator

Animated number that counts up/down when credits change.

- `+84 credits` — Green, upward arrow, slide-in from bottom
- `-32 credits` — Red, downward arrow, pulse animation
- Used in: dashboard live feed, post-run summary, notifications

### 4.3 RankBadge

- `#1–3` — Gold/Silver/Bronze gradient ring
- `#4–10` — Electric green ring
- `#11–50` — Slate ring
- `#51+` — No ring, just number

### 4.4 RunTracker — Live Run Overlay

Fullscreen map takeover during active run:

- Semi-transparent bottom drawer: shows live km, hex count, credits accumulating
- Claimed hexes animate in with a quick fill effect in user's color
- Invaded hexes show brief red flash then fill with user's color
- GPS accuracy indicator (green/yellow/red dot) always visible

### 4.5 InvasionFeed — Real-Time Activity Strip

Fixed strip at top of dashboard showing latest territory changes globally:

- Format: `[Color swatch] Username took 3 hexes from Username · 2m ago`
- Auto-scrolls horizontally, max 5 visible entries
- Tapping opens the location on the global map

---

## 5. Page-by-Page Design Specs

### 5.1 Landing Page

**Above fold:** Full-viewport Leaflet map showing real claimed territories with hex overlays. Faint pulse animations on recently-active hexes.

- Top overlay: *"Claim your city. One run at a time."*
- Bottom-right: Groq RAG chatbot FAB button
- Bottom bar: live stats ticker (X territories claimed today, X cities active)

**CTA:** Two buttons — `Start Claiming` (primary, green) and `Watch a Demo` (ghost button). No wall of features. No lengthy copy.

### 5.2 Auth Screen

Single screen, no multi-step flow. Email field, password field, Google/Apple OAuth buttons. Below signup form: color wheel (8 swatches) and username field.

Hashcode auto-generates as user types username — shows `TR-XXXX` preview in real-time. Zero friction.

### 5.3 Dashboard

| Section | Content | Design Notes |
|---|---|---|
| Header strip | Username + color swatch + rank badge + hashcode | Always visible, sticky |
| Today Stats (4 KPIs) | km run / hexes owned / credits earned / rank | Large Space Grotesk numbers, delta arrows |
| InvasionFeed | Latest global territory changes | Auto-scrolling horizontal strip |
| Mini Map | User's claimed territory, zoomable | Tap to expand to full map view |
| Start Run CTA | Large full-width green button | **Most prominent element on page** |
| Recent Activity | Last 5 runs with hex count and credits | Compact list, tap to expand |

### 5.4 Global Map Page

Full-viewport Leaflet map. Bottom drawer (collapsed by default) for search and filters:

- **Search:** By username or hashcode — centers map on their territory
- **Filter:** Top territories / Recent invasions / Nearby land
- **My Territory:** Button to fly-to own hexes

Map layers: base tile (OpenStreetMap dark theme), hex grid overlay (colors by owner), cluster labels at zoom 14+ (show username over large territory blocks).

### 5.5 Leaderboard

Three tabs: **Global / City / Weekly**. Each row: Rank number + RankBadge + color swatch + username + hex count + credits + change arrow.

Highlight current user's row in subtle glow. Rank change animations (counter tick up/down) fire when data refreshes every 5 minutes.

### 5.6 Credits Page

- **Hero stat:** Total credits with a radial progress ring showing weekly goal
- **Earned vs Lost** bar chart (7-day view)
- **Invasion History:** Table of who invaded what, when, credit impact
- **Decay Clock:** Shows how many credits at risk if no run in next 24h
- **Blockchain Proof:** Link to on-chain hash for today's summary

### 5.7 Profile Page

- Avatar: user's color as avatar background + initials
- Stats grid: total km / total hexes / max territory / longest streak
- Territory Heatmap: mini-map showing all claimed hexes in user's color, opacity = invasion count
- Run History: scrollable list, tap to see route replay on map
- Privacy toggles: hide territory from public map / hide stats / allow DMs

### 5.8 Notifications

| Type | Icon | Color | Action on Tap |
|---|---|---|---|
| Invasion Alert | ⚔️ | Red left border | Open map to invaded location |
| Rank Change | 📊 | Green/Red border | Open leaderboard to user rank |
| Streak Warning | 🔥 | Orange border | Open dashboard Start Run CTA |
| Achievement | 🏆 | Gold border | Open profile achievements |
| System | ℹ️ | Slate border | Dismiss or open relevant page |

### 5.9 Community (Chat)

Three channels accessible via tab bar: **Global / City / DMs**. Message bubbles use sender's color as left border. Long-press any message to DM the sender.

Moderation: flag button on all messages, auto-hide after 3 flags pending review.

---

## 6. Motion Design Rules

- **Hex claim animation:** 200ms fill from center, ease-out — satisfying, not slow
- **Credit counter:** 600ms animated count-up on dashboard KPIs
- **Rank change:** 400ms slide + bounce on leaderboard position
- **Invasion notification:** Pulse border + subtle shake on notification icon
- **Map fly-to:** 1200ms smooth zoom, not instant jump
- **Page transitions:** 150ms fade — fast, not flashy

> **Motion Rule:** All animations must complete in under 700ms. If it takes longer, cut it. Speed signals competence.

---

## 7. Responsive Design

| Breakpoint | Width | Key Adaptations |
|---|---|---|
| Mobile | < 768px | Full-screen map by default, bottom-drawer nav, minimal chrome |
| Tablet | 768–1024px | Sidebar nav, split view (map + dashboard) |
| Desktop | 1024px+ | Three-panel layout: nav left, map center, activity right |

> **Primary design target: Mobile.** 90% of GPS-based game usage is on phones. Desktop is secondary — used for leaderboard browsing and profile management.

---

## 8. Dark Mode Only

TerritoryRun is **dark-mode exclusive**. The map is unreadable on white backgrounds. Territory colors (bright neons) are designed for dark surfaces. There is no light mode. This is not an oversight — it is a deliberate design decision that strengthens the product identity.

---

## 9. Accessibility Minimum

- All text: minimum **4.5:1 contrast ratio** against background
- Touch targets: minimum **44×44px** on all interactive elements
- Color-blind mode: optional pattern overlay on hex tiles (stripe / dot / cross per user)
- Screen reader labels on all map elements
- Reduce motion mode: disables non-essential animations

---

*TerritoryRun — UI Design Documentation v1.0 | Confidential*
