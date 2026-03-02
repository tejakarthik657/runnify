# TerritoryRun Frontend ↔ Backend Integration Plan (V2)

## 1) Objective
This document defines the complete frontend integration plan for the existing backend APIs and sockets, page-by-page, using the current app structure:

- `/landing`
- `/login`
- `/dashboard`
- `/map`
- `/leaderboard`
- `/credits`
- `/community`
- `/notifications`
- `/profile`

It also includes integration for the root route `/` (redirect), shared app shell, auth/token lifecycle, real-time socket flows, and acceptance tests.

---

## 2) Current Backend Surface (Confirmed)

### Base URL
- Local API: `http://localhost:4000`
- Health: `GET /health`

### Auth APIs
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me` (JWT required)
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all` (JWT required)
- `GET /auth/sessions` (JWT required)

### User APIs
- `GET /user/search` (JWT required)
- `GET /user/:id` (JWT required)
- `GET /user/me/achievements` (JWT required)

### Run Tracking APIs
- `POST /run/start` (JWT required)
- `POST /run/:runId/gps` (JWT required)
- `POST /run/:runId/end` (JWT required)
- `POST /run/end` (JWT required)
- `GET /run/history/me` (JWT required)
- `GET /run/:id` (JWT required)

### Map APIs
- `GET /map/territories` (optional auth)
- `GET /map/hex/:hexId` (optional auth)
- `GET /map/search` (optional auth)
- `GET /map/city/:city` (optional auth)
- `GET /map/invasions` (optional auth)

### Leaderboard APIs
- `GET /leaderboard/global` (optional auth)
- `GET /leaderboard/city/:city` (optional auth)
- `GET /leaderboard/me` (JWT required)

### Notifications APIs
- `GET /notifications/me` (JWT required)
- `PATCH /notifications/read-all` (JWT required)
- `PATCH /notifications/:id/read` (JWT required)

### Chat APIs
- `GET /chat/rooms` (JWT required)
- `GET /chat/:roomId/history` (JWT required)
- `POST /chat/dm/start` (JWT required)

### AI Bot APIs
- `GET /bot/health`
- `GET /bot/info`
- `POST /bot/ask` (JWT required)

### Blockchain APIs
- `GET /blockchain/proof/:date`
- `GET /blockchain/proofs`
- `GET /blockchain/my-proof/:date` (JWT required)
- `POST /blockchain/trigger` (admin + JWT)
- `POST /blockchain/initialize` (admin + JWT)

### Reports APIs (Community Moderation)
- `POST /reports` (JWT required)
- `GET /reports/run/:runId/analyze` (JWT required)
- `GET /reports/my-strikes` (JWT required)

### Socket.IO
- Main namespace (`/`): run tracking and live map events
- Chat namespace (`/chat`): room chat, typing, history events

---

## 3) Frontend Foundation Work (Must Do First)

## 3.1 Environment Variables
Create/update frontend env:

- `NEXT_PUBLIC_API_URL=http://localhost:4000`
- `NEXT_PUBLIC_SOCKET_URL=http://localhost:4000`

## 3.2 API Client Layer
Implement in `frontend/services/api.ts`:

- `apiFetch(path, { method, body, auth })`
- Auto add `Authorization: Bearer <accessToken>` when `auth=true`
- On `401`, attempt `POST /auth/refresh` once, retry original request
- If refresh fails: clear auth state and redirect to `/login`
- Normalize error payload (`{ error, status, details }`)

## 3.3 Auth State + Session Handling
Create a single auth store (Context/Zustand/Redux):

- `accessToken`
- `user`
- `isAuthenticated`
- `login()`, `register()`, `logout()`, `refresh()`, `loadMe()`

## 3.4 Socket Client Layer
Implement in `frontend/services/socket.ts`:

- `connectMainSocket(token)` for run + map live events
- `connectChatSocket(token)` for `/chat` namespace
- Auto reconnect strategy
- Graceful disconnect on logout

## 3.5 Route Guards
Add route protection logic:

- Public: `/landing`, `/login`
- Protected: `/dashboard`, `/map`, `/leaderboard`, `/credits`, `/community`, `/notifications`, `/profile`

---

## 4) Page-by-Page Integration Plan

## 4.1 `/` (Root)
Current behavior: redirect to `/landing`.

Integration:
- Keep redirect.
- Optional enhancement: if authenticated, redirect to `/dashboard`; else `/landing`.

Acceptance:
- Non-authenticated users land on `/landing`.
- Authenticated users can be routed directly to `/dashboard`.

---

## 4.2 `/landing`
Purpose: marketing + entry.

Backend alignment:
- No required API call.
- Optional: `GET /bot/info` to display AI assistant capabilities snippet.

UI actions:
- CTA to `/login`.
- Optional CTA to register form section.

Acceptance:
- Renders without auth.
- No protected API call on initial render.

---

## 4.3 `/login`
Purpose: login/register/session bootstrap.

Backend alignment:
- `POST /auth/login`
- `POST /auth/register`
- `GET /auth/me`
- `POST /auth/refresh`

Required frontend behavior:
- Form validation (email/password)
- Save access token in memory (or secure storage policy)
- Immediately call `/auth/me` after login success
- Redirect to `/dashboard`

OAuth note:
- You said you will handle OAuth separately; keep placeholders but gate production buttons until keys are configured.

Acceptance:
- Good creds: token + user loaded, redirect works.
- Bad creds: proper inline error.
- Refresh works after access token expiry.

---

## 4.4 `/dashboard`
Purpose: player overview.

Backend alignment:
- `GET /auth/me`
- `GET /leaderboard/me`
- `GET /run/history/me`
- `GET /notifications/me`
- `GET /user/me/achievements`
- `GET /reports/my-strikes`
- `GET /blockchain/proofs` (optional summary card)

Suggested modules:
- Profile summary card
- Rank and credits card
- Last runs card
- Unread notifications count
- Achievements progress
- Fair-play/strike status

Acceptance:
- Protected route; unauthenticated users redirected to `/login`.
- All cards handle loading/empty/error states.

---

## 4.5 `/map`
Purpose: live territory map + run capture.

Backend alignment (HTTP):
- `GET /map/territories?minLat&minLng&maxLat&maxLng`
- `GET /map/hex/:hexId`
- `GET /map/search?q=...`
- `GET /map/invasions`
- `POST /run/start`
- `POST /run/:runId/gps`
- `POST /run/:runId/end` or `POST /run/end`

Backend alignment (Socket main namespace):
- Emit: `run_start`, `join_map_zone`, `leave_map_zone`, `gps_update`
- Listen: `gps_ack`, `gps_rejected`, `live_runner`, `territory_changed`, `run_auto_ended`

Required frontend behavior:
- Start run button -> create run -> cache `runId`
- GPS batch upload loop + optional socket streaming
- End run flow with final position
- Live hex color refresh from socket event

Acceptance:
- Run start/end fully works.
- Territory changes appear without full page refresh.
- Handles GPS permission denial and poor accuracy errors.

---

## 4.6 `/leaderboard`
Purpose: rankings and personal rank.

Backend alignment:
- `GET /leaderboard/global`
- `GET /leaderboard/city/:city`
- `GET /leaderboard/me`

Required frontend behavior:
- Scope tabs: global / city
- City selector for city leaderboard
- Highlight current user row when available

Acceptance:
- Public global/city data visible with optional auth.
- Authenticated users also see `/leaderboard/me` widget.

---

## 4.7 `/credits`
Purpose: explain and show credit-related outcomes.

Backend alignment:
- Primary source: `GET /run/history/me` (credits per run, totals from run records)
- Optional profile stats via `GET /auth/me`
- AI explanation support via `POST /bot/ask`

Required frontend behavior:
- Credits timeline from recent runs
- Explainers: claim, invade, peak multiplier, decay impact
- Optional “Ask AI about credits” panel

Acceptance:
- Auth required.
- Empty state if no completed runs.

---

## 4.8 `/community`
Purpose: chat + player search + DM start + reporting.

Backend alignment (HTTP):
- `GET /chat/rooms`
- `GET /chat/:roomId/history`
- `POST /chat/dm/start`
- `GET /user/search`
- `POST /reports`

Backend alignment (Socket `/chat` namespace):
- Emit: `join-room`, `send-message`, `typing`, `leave-room`
- Listen: `history`, `message`, `user-typing`, `user-joined`, `user-left`

Required frontend behavior:
- Room list: global + city + DMs
- Message composer with length + rate error handling
- Start DM from user search result
- Report action from chat profile/menu

Acceptance:
- Chat history loads and new messages stream live.
- DM room creation works.
- Reporting flow confirms success/error clearly.

---

## 4.9 `/notifications`
Purpose: live and persisted notifications.

Backend alignment:
- `GET /notifications/me`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`

Socket alignment:
- Listen for `notification` events on user room channel through main socket connection.

Required frontend behavior:
- List notifications with read/unread state
- Per-item read action
- Read-all action
- Optional toast when live notification arrives

Acceptance:
- Unread count matches backend after actions.
- Page state updates without hard refresh.

---

## 4.10 `/profile`
Purpose: profile details, achievements, sessions, security actions.

Backend alignment:
- `GET /auth/me`
- `GET /user/:id` (self/other profile views)
- `GET /user/me/achievements`
- `GET /auth/sessions`
- `POST /auth/logout`
- `POST /auth/logout-all`
- Optional: `GET /reports/my-strikes`

Required frontend behavior:
- Profile header/stats
- Achievements list and earned badges
- Devices/session list
- Logout current/all devices controls

Acceptance:
- Protected route behavior enforced.
- Logout-all invalidates other sessions as expected.

---

## 5) Cross-Page Data Contracts

## 5.1 Auth Header
For protected routes, always send:
- `Authorization: Bearer <accessToken>`

## 5.2 Error Contract
Normalize all backend errors to front-end friendly shape:
- `status`
- `message`
- `code` (if available)
- `retryable` boolean

## 5.3 Pagination/Limit Rules
- Chat history: pass `?limit=50` default
- Notifications: currently backend returns unread subset (up to 50)
- Run history: backend capped to last 20

## 5.4 Time/Date Handling
- Use ISO parsing on all `ts`, `createdAt`, `endedAt`, `anchoredAt`
- Standardize client timezone rendering with relative + absolute display

---

## 6) Frontend Implementation Order (Recommended)

### Phase 1 — Core Infra
1. `services/api.ts` complete
2. auth store complete
3. route guards complete
4. socket client scaffolding complete

### Phase 2 — Critical Paths
5. `/login`
6. `/dashboard`
7. `/map`
8. `/leaderboard`

### Phase 3 — Community + Retention
9. `/community`
10. `/notifications`
11. `/profile`
12. `/credits`

### Phase 4 — Hardening
13. Loading and error boundaries for every page
14. Token refresh race-condition handling
15. Reconnect logic for sockets
16. Accessibility + mobile checks

---

## 7) Smoke Test Checklist (Frontend + Backend E2E)

## 7.1 Public
- [ ] `/landing` loads
- [ ] `GET /health` from frontend succeeds
- [ ] `GET /bot/info` renders capabilities

## 7.2 Auth
- [ ] Register works
- [ ] Login works
- [ ] `/auth/me` populates dashboard identity
- [ ] Refresh token flow works after access token expiry

## 7.3 Run + Map
- [ ] Start run returns `runId`
- [ ] GPS ingestion accepted
- [ ] End run finalizes result
- [ ] Map updates territory visuals

## 7.4 Leaderboard + Credits
- [ ] Global and city leaderboards render
- [ ] Personal rank appears for authenticated user
- [ ] Credits page shows run-derived credit information

## 7.5 Community + Notifications
- [ ] Join global/city room
- [ ] Send/receive chat messages
- [ ] Start DM and retrieve DM history
- [ ] Notification feed read/read-all works

## 7.6 Blockchain + AI
- [ ] `GET /blockchain/proofs` list renders
- [ ] `GET /blockchain/my-proof/:date` works with auth
- [ ] `POST /bot/ask` returns response for authenticated user

---

## 8) Known Gaps / Risks to Track

1. Frontend pages are mostly scaffolded/empty right now, so integration is largely implementation work, not just wiring.
2. OAuth depends on external credentials and callback setup (deferred by you).
3. `frontend/services/api.ts` and socket/hooks files are empty and need full implementation before page integration.
4. Some backend auth middleware naming varies (`authenticateJWT` vs `requireAuth`); frontend should not assume internals, only response contracts.

---

## 9) Deliverables for “Frontend Fully Integrated” (Definition of Done)

- All pages in `frontend/app/*` implemented and connected to their mapped backend APIs.
- Protected routes enforce auth and token refresh.
- Map/run flow works end-to-end with real GPS and socket updates.
- Community chat and notifications live-update correctly.
- AI bot and blockchain proof pages functional for authenticated users.
- Error/loading/empty states present on each page.
- E2E smoke checklist passes.

---

## 10) Immediate Next Action (Today)
Implement these first to unblock the entire app quickly:

1. Complete `frontend/services/api.ts`
2. Complete auth store + route guard
3. Build `/login` and `/dashboard`
4. Build `/map` run start/end + GPS
5. Build `/leaderboard` and `/notifications`

After this, remaining pages are straightforward extensions.
