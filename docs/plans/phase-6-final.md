# Phase 6 — Admin Security Dashboard (ATITFinalProject-dashboard)

## Overview

Phase 6 delivers the real-time admin security dashboard for ATITFinalProject — a standalone React SPA that visualises the IoT intrusion-detection layer in real time. It connects to the ASP.NET relay server (`ATITFinalProject-server`) over REST (initial load + manual actions) and SignalR WebSocket (live push for alerts and device state changes). The dashboard is the operator-facing surface for the live demo: every rogue-device rejection, flood quarantine, and gRPC attack attempt appears here within milliseconds of detection.

---

## System Position

```
[ESP32 Devices]
      │  MQTT + client cert
      ▼
[Mosquitto MQTT Broker]
      │
      ▼
[ASP.NET Relay Server]
  IIntrusionDetector / RuleBasedIntrusionDetector
  SecurityHub (SignalR)
  /api/security/* (REST)
      │  REST + SignalR WebSocket
      ▼
[ATITFinalProject-dashboard]   ← Phase 6
  Login page (JWT auth)
  Device list with live security state
  Real-time alert feed (SignalR push)
  Manual quarantine / unquarantine actions
  Game round controls (Start Round / End Round)
```

---

## Tech Stack

| Technology | Version | Role |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | 6 | Type safety |
| Vite | 8 | Build tool + dev server |
| Tailwind CSS | 3 | Utility-first styling |
| Radix UI + CVA | latest | Headless UI primitives + variant patterns |
| @microsoft/signalr | 10 | SignalR WebSocket client |
| TanStack React Query | 5 | Server state, polling, cache mutations |
| React Router | 7 | Client-side routing |
| Zustand | 5 | Persistent JWT auth state |
| Axios | 1 | HTTP client with interceptors |
| Lucide React | latest | Icons |

---

## Project Structure

```
src/
├── main.tsx                  # React entry — QueryClientProvider + BrowserRouter
├── App.tsx                   # Routes + RequireAuth guard
├── index.css                 # Tailwind directives + CSS variables (dark theme)
├── api/
│   ├── client.ts             # Axios instance — JWT interceptor + 401 logout
│   ├── auth.ts               # POST /auth/login
│   └── security.ts           # GET /security/status, quarantine PUT, start/end POST
├── store/
│   └── authStore.ts          # Zustand — token, login(), logout(), isAuthenticated()
├── types/
│   └── security.ts           # AlertType, IntrusionAlert, DeviceSecurityState, SecurityStatus
├── hooks/
│   ├── useDevices.ts         # React Query — device list, 3 s poll, optimistic updates
│   ├── useAlerts.ts          # React Query — alert list, 3 s poll
│   └── useSecurityHub.ts     # SignalR lifecycle — OnAlert + OnDeviceStateChanged
├── pages/
│   ├── LoginPage.tsx         # Login form → JWT → navigate to dashboard
│   └── DashboardPage.tsx     # Top-level layout; merges REST + SignalR data
├── components/
│   ├── layout/
│   │   ├── TopBar.tsx        # Header — title + logout
│   │   └── Sidebar.tsx       # Tab nav — Devices / Alerts / Game
│   ├── devices/
│   │   ├── DeviceTable.tsx   # Table shell + skeleton loading
│   │   ├── DeviceRow.tsx     # One row — rate, seq, alerts, status badge
│   │   └── DeviceActions.tsx # Quarantine / Unquarantine button with optimistic update
│   ├── alerts/
│   │   ├── AlertFeed.tsx     # Scrolling list, newest on top, pulse on new
│   │   └── AlertBadge.tsx    # Colour-coded badge per AlertType
│   ├── game/
│   │   └── GameControls.tsx  # Start Round / End Round + round-phase status
│   └── ui/                   # Reusable primitives
│       ├── button.tsx        # CVA variants: default/destructive/outline/ghost…
│       ├── badge.tsx         # CVA variants: default/secondary/destructive/warning/success
│       ├── card.tsx          # Card, CardHeader, CardTitle, CardContent
│       ├── table.tsx         # Table, TableHeader, TableBody, TableRow, TableHead, TableCell
│       ├── skeleton.tsx      # Pulse placeholder
│       └── separator.tsx     # Radix UI separator wrapper
└── lib/
    └── utils.ts              # cn() — clsx + tailwind-merge
```

---

## Authentication

### Flow
1. User submits username + password on `/dashboard/login`.
2. `POST /api/auth/login` returns `{ token, expiresIn }`.
3. Token stored in Zustand store, persisted to `localStorage` via `persist` middleware.
4. `RequireAuth` wrapper in `App.tsx` reads `isAuthenticated()` and redirects to login if falsy.
5. On any `401` response the Axios response interceptor calls `logout()`, which clears the token and hard-redirects to the login page.

### Key files
- `src/store/authStore.ts` — single source of truth for the JWT.
- `src/api/client.ts` — request interceptor injects `Authorization: Bearer <token>` on every outgoing request.
- `src/pages/LoginPage.tsx` — form UI, error display, navigation on success.

---

## TypeScript Domain Types (`src/types/security.ts`)

```typescript
export type AlertType =
  | 'CertMismatch'
  | 'RateExceeded'
  | 'SequenceGap'
  | 'UnknownSlot'
  | 'ValueOutOfRange';

export interface IntrusionAlert {
  deviceId:         string;
  alertType:        AlertType;
  detail:           string;
  timestamp:        string;         // ISO 8601
  shouldQuarantine: boolean;
}

export interface DeviceSecurityState {
  deviceId:           string;
  isQuarantined:      boolean;
  quarantinedAt:      string | null;
  alertCount:         number;
  lastSeen:           string | null;
  currentRate:        number;       // events / sec
  lastSequenceNumber: number;
}

export interface SecurityStatus {
  devices:           DeviceSecurityState[];
  registeredDevices: string[];
  alerts:            IntrusionAlert[];
  round:             { status: string };
  timestamp:         string;
}
```

All types mirror the ASP.NET server models exactly so that JSON responses deserialise without transformation.

---

## REST API Layer (`src/api/security.ts`)

| Function | HTTP call | Purpose |
|---|---|---|
| `getSecurityStatus()` | `GET /security/status` | Full snapshot — devices, alerts, round state |
| `quarantineDevice(id)` | `PUT /security/devices/{id}/quarantine?quarantine=true` | Isolate device |
| `unquarantineDevice(id)` | `PUT /security/devices/{id}/quarantine?quarantine=false` | Restore device |
| `startRound()` | `POST /admin/start` | Begin a game round |
| `endRound()` | `POST /admin/end` | End the current round |

---

## Data-Fetching Strategy

### React Query hooks (polling fallback)
- **`useDevices()`** — queries `getSecurityStatus()`, maps registered device IDs to `DeviceSecurityState`, fills placeholder states for devices not yet seen. Polls every **3 seconds**.
- **`useAlerts()`** — queries `getSecurityStatus()`, extracts `alerts` array. Polls every **3 seconds**.
- **`useUpdateDevice()`** — returns a callback that performs an optimistic cache mutation: if the device already exists in the cache it is updated in-place; if new it is appended.

### SignalR hook (live push)
- **`useSecurityHub(callbacks)`** — builds a `HubConnection` to `/hubs/security`, attaches the JWT via `accessTokenFactory`, registers two event listeners, and tears down the connection on unmount.

---

## SignalR Integration (`src/hooks/useSecurityHub.ts`)

```
Connection URL:  /hubs/security
Auth:            accessTokenFactory → JWT from Zustand store
Auto-reconnect:  [0, 1000, 5000, 10000] ms
Log level:       Warning

Events:
  OnAlert              → IntrusionAlert pushed from server
  OnDeviceStateChanged → DeviceSecurityState pushed from server
```

`DashboardPage` subscribes to both events:
- `handleAlert` — prepends the alert to the React Query alerts cache; trims to 100 items.
- `handleDeviceStateChanged` — calls `useUpdateDevice()` to patch or append the device in the devices cache.

This hybrid REST-poll + SignalR-push model ensures the UI is always fresh even if the WebSocket drops temporarily.

---

## Dashboard Layout

```
┌──────────────────────────────────────────────────────────┐
│  Shield icon  IoT Multiplayer Game — Security Dashboard  │  ← TopBar
├─────────────┬────────────────────────────────────────────┤
│  [Monitor]  │  Device Security Status                    │
│  Devices    │  ┌──────────────────────────────────────┐  │
│             │  │ DeviceId | Rate | SeqNum | Alerts |  │  │
│  [Bell]     │  │ Status  | Actions                   │  │
│  Alerts     │  └──────────────────────────────────────┘  │
│             │                                            │
│  [Gamepad]  │  Real-time Alert Feed                      │
│  Game       │  ┌──────────────────────────────────────┐  │
│             │  │ [RateExceeded] esp32-1 — 47/s 12:01 │  │
│             │  │ [UnknownSlot]  esp32-1 — inject …   │  │
│             │  └──────────────────────────────────────┘  │
└─────────────┴────────────────────────────────────────────┘
```

The `Sidebar` manages a `section` state (`'devices' | 'alerts' | 'game'`) passed up to `DashboardPage`, which conditionally renders `DeviceTable`, `AlertFeed`, or `GameControls`.

---

## Key Components

### `DeviceTable` / `DeviceRow` / `DeviceActions`
- Table columns: Device ID (monospace), Rate (X.X/s), Last Seq#, Alert Count, Last Seen, Status badge, Actions.
- Row background tinted red (`bg-destructive/10`) when quarantined.
- Status badge: green **Active** / red **Quarantined**.
- `DeviceActions` disables itself during the API call to prevent double-clicks; on success it calls `useUpdateDevice()` so the row updates immediately without waiting for the next poll.

### `AlertFeed` / `AlertBadge`
- Newest alert rendered at the top; list capped at 100 items.
- New alerts receive `animate-pulse` for 1 second to draw the operator's eye.
- `AlertBadge` colour mapping:

| AlertType | Badge variant | Colour |
|---|---|---|
| CertMismatch | destructive | Red |
| RateExceeded | destructive | Red |
| UnknownSlot | warning | Orange |
| SequenceGap | secondary | Grey |
| ValueOutOfRange | secondary | Grey |

### `GameControls`
- Polls `GET /api/sessions` every 3 seconds for round phase.
- Phase detection: `'running'` / `'active'` → running; `'ended'` → ended; else idle.
- **Start Round** disabled when phase is `running`; **End Round** disabled otherwise.
- Displays last action result (success or error string) beneath the buttons.

---

## Styling System

- **Dark theme** via Tailwind CSS class-based dark mode with CSS variables (`hsl(…)`) declared in `index.css`.
- **CVA (class-variance-authority)** used in `button.tsx` and `badge.tsx` to declare named variant maps, keeping component JSX clean.
- **`cn()` utility** (`lib/utils.ts`) merges `clsx` + `tailwind-merge` to resolve Tailwind class conflicts at the call site.
- Skeleton loading placeholders (`skeleton.tsx`) used in `DeviceTable` (3 rows × 7 cells) and `AlertFeed` (4 rows) while data is loading.

---

## Build & Deployment

```bash
# Development (proxies /api and /hubs to https://localhost:5000)
npm run dev

# Type check only
npm run type-check

# Production build → dist/
npm run build

# Build + copy to ASP.NET wwwroot
npm run deploy
# equivalent: npm run build && cp -r dist/* ../ATITFinalProject-server/GameServer/wwwroot/dashboard/
```

**Vite configuration highlights:**
- `base: '/dashboard/'` — all asset URLs are relative to this prefix so the SPA loads correctly when served from ASP.NET static files.
- Dev proxy: `/api` → `https://localhost:5000`, `/hubs` → `https://localhost:5000` (WebSocket, `secure: false` for self-signed certs).
- Path alias `@` → `./src` used throughout imports.

---

## Security Notes

- JWT is stored in `localStorage` (via Zustand `persist`). Acceptable for this demo context; a production deployment would use `HttpOnly` cookies.
- All API calls carry the `Authorization: Bearer` header; the server validates the JWT before executing any security action.
- Axios 401 handler auto-logs the user out to prevent stale token usage.
- No secrets are committed — `.env.local` is gitignored.

---

## What Was Delivered in Phase 6

| # | Deliverable | Status |
|---|---|---|
| 1 | Project scaffold — Vite + React + TypeScript + Tailwind + shadcn primitives | Done |
| 2 | Auth layer — Zustand store, Axios interceptors, LoginPage, RequireAuth guard | Done |
| 3 | Type definitions matching ASP.NET models | Done |
| 4 | REST API module — status, quarantine, start/end round | Done |
| 5 | React Query hooks — useDevices, useAlerts (3 s polling + optimistic update) | Done |
| 6 | SignalR hook — useSecurityHub (OnAlert, OnDeviceStateChanged, auto-reconnect) | Done |
| 7 | DashboardPage — hybrid REST + SignalR data merge, 100-alert cap | Done |
| 8 | DeviceTable / DeviceRow / DeviceActions — live state + quarantine actions | Done |
| 9 | AlertFeed / AlertBadge — scrolling feed, colour-coded, pulse animation | Done |
| 10 | GameControls — Start Round / End Round with phase-aware button states | Done |
| 11 | TopBar + Sidebar navigation | Done |
| 12 | Reusable UI primitives — Button, Badge, Card, Table, Skeleton, Separator | Done |
| 13 | Vite config — base path, dev proxy, path alias | Done |
| 14 | Build + deploy script to ASP.NET wwwroot | Done |
