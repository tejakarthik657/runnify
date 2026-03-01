# TERRITORY RUN — UX & Psychological Design Documentation
> Player Psychology · Engagement Architecture · Behavioral Design

---

## 1. Why This Game Works — Core Psychology

TerritoryRun is built on three deeply wired human drives: the need to own space, the fear of losing what you've built, and the social visibility of dominance. Understanding these is more important than any feature list.

> **🧠 Ownership Bias (Endowment Effect)**
> People value things more after they own them. Once a runner claims hexes, those hexes feel *theirs*. The potential loss of that territory triggers a fear response — the same psychological mechanism that makes people check their phone at 2am.

> **⚔️ Loss Aversion > Gain Seeking**
> Losing 10 credits from an invasion hurts ~2x more than gaining 10 credits from a new claim. The notification "Your land was invaded" is more motivating than "You just earned 10 credits". Design every alert to use loss framing where appropriate.

> **👁️ Social Proof + Visible Status**
> The map IS the leaderboard. When users see a city map covered in one color, they feel FOMO and competitive urgency. Territory color is a status signal visible to everyone — more powerful than a number on a list.

---

## 2. The Engagement Loop (Designed, Not Accidental)

### 2.1 The Habit Loop Architecture

| Stage | Trigger | Action | Reward | Investment |
|---|---|---|---|---|
| Day 1 | New app — curiosity | First run, claim hexes | Visual territory ownership | Color + hashcode identity |
| Day 2-3 | Notification: invaded! | Revenge run to reclaim | Credits restored + dominance | Route knowledge |
| Week 1 | Leaderboard rank visible | Optimize running routes | Rank climb animation | Strategy & routes |
| Week 2+ | Community chat: rivals | Daily runs, defend territory | Social recognition | Reputation in city |

### 2.2 Variable Reward Schedule

The most addictive reward systems use variable rewards — not guaranteed ones. TerritoryRun achieves this through:

- Invasion notifications arrive **unpredictably** (someone might run through your territory at 6am)
- Peak-hour multipliers create special time windows of heightened reward
- Credit decay means standing still **loses you something** — the game plays itself even when you're offline
- Weekly leaderboard resets create cyclical urgency — everyone has a chance to reset the social hierarchy

---

## 3. Player Persona Matrix

| Persona | Motivation | Behaviour Pattern | Core Feature Need |
|---|---|---|---|
| The Expander | Claim as much area as possible | Long slow runs in new areas daily | Map view, territory size stats |
| The Defender | Protect home turf | Short intense runs in same zone | Invasion notifications, quick reclaim |
| The Rival | Beat specific other players | Tracks enemy territory, strategic | Player search, invasion history |
| The Social Player | Community recognition | Participates in chat, shares routes | Community tab, profile visibility |
| The Completionist | Full city coverage | Grid-by-grid systematic claiming | Coverage percentage tracker |
| The Casual | Light activity motivation | 2-3 runs per week, low pressure | Dashboard simplicity, weekly summary |

> **Design Implication:** Every page must serve at least 3 of these personas. If a feature only serves one persona, it's probably not worth building in v1.

---

## 4. Onboarding Psychology (Critical: First 5 Minutes)

70% of mobile game churn happens in the first session. The first 5 minutes must deliver a complete emotional arc: **curiosity → action → reward → belonging**.

### 4.1 Onboarding Flow

| Step | Screen | Psychology Lever | Success Metric |
|---|---|---|---|
| 1 | Landing: animated map with live hex claims | Social proof — others are playing NOW | User scrolls past fold |
| 2 | Color selection (8 options) | Identity investment — "this is my color" | User lingers > 5 seconds |
| 3 | Username + hashcode generated | Ownership of identity | User screenshots/saves hashcode |
| 4 | Dashboard with empty stats | Empty state anxiety — want to fill it | User taps "Start Run" |
| 5 | First run — immediate hex claim | Instant reward — territory appears in their color | User completes > 0.5km |
| 6 | Post-run: "You own X hexes!" | Ownership pride + progress visualization | User shares or returns next day |

### 4.2 Empty State Design

Empty states must show **aspiration, not absence**. The empty dashboard should show a ghost map of potential territory with the message:

> *"This could be yours. Start your first run."*

Never a blank screen or generic "No data yet".

---

## 5. Notification Psychology

Notifications are the game's heartbeat. Badly designed notifications are ignored. Well-designed ones create urgency that pulls users back.

| Notification Type | Message Frame | Timing | Psychology |
|---|---|---|---|
| Invasion Alert | ⚠ [Username] just took 3 of your hexes in [Area] | Immediate (< 2 min delay) | Loss aversion trigger |
| Rank Drop | 📉 You dropped to #14. [Name] overtook you. | After leaderboard recalc | Competitive threat |
| Streak Reminder | 🔥 You've run 4 days straight. Don't break it. | 8pm local time if no run | Commitment consistency |
| Weekly Summary | 📊 This week: 12km, 45 hexes, rank #9 in [City] | Monday 9am | Progress affirmation |
| Nearby Activity | 👀 Someone is running 200m from your territory. | During peak hours | Competitive urgency |
| Achievement | 🏆 First 100 hexes claimed. You're a Trailblazer. | Instant on milestone | Identity reinforcement |

### 5.1 Notification Frequency Rules

- Max **3 push notifications per day** per user (prevents fatigue)
- Invasion alerts are always shown — they're the core loop trigger
- Never send notifications between **11pm — 7am** local time
- Let users control notification types in settings (trust builds retention)

---

## 6. Color Psychology & Identity

Color is not a cosmetic feature. It's the **primary identity signal** in a game built around visible ownership.

| Color | Hex Code | Psychological Association | Player Type Fit |
|---|---|---|---|
| Neon Green | `#00FF88` | Speed, vitality, new growth | Expanders, new players |
| Electric Blue | `#0080FF` | Precision, loyalty, consistency | Defenders, completionists |
| Crimson Red | `#FF2244` | Aggression, dominance, warning | Rivals, competitive players |
| Amber Gold | `#FFB300` | Achievement, premium, confidence | High-rank players |
| Magenta | `#FF00AA` | Creativity, individuality, boldness | Social players |
| Cyan | `#00DDFF` | Calm, strategy, intelligence | Completionists, casuals |
| Deep Orange | `#FF5500` | Energy, passion, movement | High-frequency runners |
| White | `#FFFFFF` | Clarity, dominance, standout visibility | Top-rank reward color |

> **Design Rule:** White is a prestige color — only unlockable after reaching rank #1 in a city. This creates aspirational drive and visible status signaling.

---

## 7. Social Architecture

### 7.1 Status Visibility Hierarchy

The game's social proof operates at 3 tiers:

- **Global:** Top 100 users worldwide — visible on landing page (aspirational)
- **City:** Top 10 in user's city — visible on map as dominant colors (competitive)
- **Personal:** Friends/rivals specifically tracked — visible in profile (social)

### 7.2 Community Chat Psychology

Chat channels must be scoped to create intimacy without chaos:

- **Global chat:** low-stakes, discovery, newcomers — no pressure
- **City chat:** medium-stakes, local rivals, territory trash-talk
- **Direct messages:** high-trust, coordination, social bonds

> Moderation note: Territory trash-talk between rivals is a *feature*, not a problem — it drives return visits. Only filter hate speech and harassment.

### 7.3 The Rivalry Mechanic

Players who invade each other repeatedly become rivals. The system should surface this:

> *"You and [Username] have clashed 7 times this month."*

This names the social bond and creates narrative investment — the reason a runner gets up at 6am on a Tuesday.

---

## 8. Ethical Design Principles

High engagement design has risks. These are non-negotiable guardrails:

- **No dark patterns:** No fake urgency timers, no manufactured scarcity
- **No location sharing:** Territory is shown, not exact GPS position
- **Opt-in push notifications:** Default OFF for all except invasion alerts
- **Run limits:** 3 runs/day max prevents obsessive behavior
- **Transparency:** Credit mechanics fully documented and always accessible
- **Data minimalism:** Only store what's needed; purge GPS data after run processing

> **✅ Ethical engagement = players feel in control of their relationship with the game.** Users who feel manipulated churn and leave negative reviews. Users who feel empowered become advocates.

---

## 9. Churn Prevention Matrix

| Churn Signal | Detection Method | Intervention |
|---|---|---|
| No run in 3 days | Daily job check | Streak reminder notification |
| Rank dropped 5+ positions | Post-leaderboard event | Motivational rank change alert |
| All territory invaded | Territory monitor | Challenge notification: "Start fresh?" |
| No chat activity in 7 days | Chat log check | City chat highlight notification |
| Account < 7 days old, no 2nd run | Onboarding funnel | In-app tip about peak hours |

---

*TerritoryRun — UX & Psychology Documentation v1.0 | Confidential*
