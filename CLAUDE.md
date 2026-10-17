# CLAUDE.md — ATITFinalProject-dashboard

## What This Project Is

This is the **admin security dashboard** for ATITFinalProject — a standalone React
SPA that monitors the IoT security layer in real time. It connects to the ASP.NET
relay server via REST (initial data load + actions) and SignalR WebSocket (live
push for alerts and device state changes).

The dashboard is used during the live demo to show security events happening in real
time — rogue device rejections, flood quarantines, and gRPC attack attempts — as
they occur.

> **This project is one of five components in ATITFinalProject.**
> See the umbrella repo for the full system architecture.
>
> | Repo | Description |
> |---|---|
> | [ATITFinalProject](https://github.com/SupakornSJB/ATITFinalProject) | Architecture + protocol docs |
> | [atit_micropython](https://github.com/SupakornSJB/atit_micropython) | ESP32 MicroPython |
> | [ATITInfraNode](https://github.com/SupakornSJB/ATITInfraNode) | ASP.NET relay server |
> | [ATITProject](https://github.com/SupakornSJB/ATITProject) | Unity game |
> | **atit-dashboard** | **This project — React security dashboard** |

---

## Full System Architecture (Where This Fits)

```
[ESP32 Devices]
      │  MQTT + client cert
      ▼
[MQTT Broker — Mosquitto]
      │
      ▼
[ASP.NET Relay Server]           ← PHASE6-security.md
  IIntrusionDetector
  RuleBasedIntrusionDetector
  SecurityHub (SignalR)
  /api/security/* (REST)
      │  REST + SignalR WebSocket
      ▼
[ATITFinalProject-dashboard]    ← THIS PROJECT
  Login page
  Device list with security state
  Real-time alert feed (SignalR push)
  Manual actions (quarantine/unquarantine)
```

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | 5 | Build tool + dev server |
| Tailwind CSS | 3 | Styling |
| shadcn/ui | latest | Component library (copy-paste, Tailwind-based) |
| @microsoft/signalr | 8 | SignalR WebSocket client |
| React Query (TanStack) | 5 | Server state, polling, mutations |
| React Router | 6 | Client-side routing |
| Zustand | 4 | Auth token state |
| Lucide React | latest | Icons |

---

## Project Structure

```
ATITFinalProject-dashboard/
├── CLAUDE.md
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx                    ← router setup, auth guard
    ├── api/
    │   ├── client.ts              ← axios instance with JWT interceptor
    │   ├── auth.ts                ← login/logout API calls
    │   └── security.ts            ← /api/security/* calls
    ├── hooks/
    │   ├── useSecurityHub.ts      ← SignalR connection + event subscriptions
    │   ├── useDevices.ts          ← React Query device list
    │   └── useAlerts.ts           ← React Query alert feed
    ├── store/
    │   └── authStore.ts           ← Zustand — JWT token, user
    ├── pages/
    │   ├── LoginPage.tsx
    │   └── DashboardPage.tsx
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.tsx
    │   │   └── TopBar.tsx
    │   ├── devices/
    │   │   ├── DeviceTable.tsx    ← main device list
    │   │   ├── DeviceRow.tsx      ← one row per device
    │   │   └── DeviceActions.tsx  ← quarantine/unquarantine buttons
    │   ├── alerts/
    │   │   ├── AlertFeed.tsx      ← scrolling real-time alert list
    │   │   └── AlertBadge.tsx     ← colored badge per AlertType
    │   ├── game/
    │   │   └── GameControls.tsx   ← Start Round / End Round buttons
    │   └── ui/                    ← shadcn/ui components (copy-pasted)
    │       ├── button.tsx
    │       ├── badge.tsx
    │       ├── card.tsx
    │       ├── table.tsx
    │       └── ...
    └── types/
        └── security.ts            ← TypeScript types matching ASP.NET models
```

---

## Setup and Development

```bash
# Install dependencies
npm install

# Start dev server (proxies API calls to ASP.NET on localhost:5000)
npm run dev

# Build for production (output to dist/ — copy to ASP.NET wwwroot/dashboard/)
npm run build

# Type check
npm run type-check
```

### `vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/dashboard/',    // must match ASP.NET static file path
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  server: {
    proxy: {
      '/api':   'http://localhost:5000',
      '/hubs':  { target: 'ws://localhost:5000', ws: true }
    }
  }
})
```

---

## TypeScript Types (`src/types/security.ts`)

Must match the ASP.NET models exactly:

```typescript
export type AlertType =
  | 'CertMismatch'
  | 'RateExceeded'
  | 'SequenceGap'
  | 'UnknownSlot'
  | 'ValueOutOfRange';

export interface IntrusionAlert {
  deviceId:        string;
  alertType:       AlertType;
  detail:          string;
  timestamp:       string;   // ISO 8601
  shouldQuarantine: boolean;
}

export interface DeviceSecurityState {
  deviceId:       string;
  isQuarantined:  boolean;
  quarantinedAt:  string | null;
  alertCount:     number;
  lastSeen:       string | null;
  currentRate:    number;    // events/sec
  lastSeqNumber:  number;
}

export interface SecurityStatus {
  devices:   DeviceSecurityState[];
  alerts:    IntrusionAlert[];
  timestamp: string;
}
```

---

## API Client (`src/api/client.ts`)

```typescript
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
})

// Attach JWT to every request automatically
apiClient.interceptors.request.use(config => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirect to login on 401
apiClient.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401)
      useAuthStore.getState().logout()
    return Promise.reject(err)
  }
)
```

---

## Auth Store (`src/store/authStore.ts`)

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token:   string | null
  login:   (token: string) => void
  logout:  () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token:  null,
      login:  (token) => set({ token }),
      logout: () => {
        set({ token: null })
        window.location.href = '/dashboard/login'
      },
      isAuthenticated: () => get().token !== null
    }),
    { name: 'auth-storage' }
  )
)
```

---

## SignalR Hook (`src/hooks/useSecurityHub.ts`)

```typescript
import { useEffect, useRef, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import { useAuthStore } from '@/store/authStore'
import { IntrusionAlert, DeviceSecurityState } from '@/types/security'

interface SecurityHubCallbacks {
  onAlert:              (alert: IntrusionAlert) => void
  onDeviceStateChanged: (state: DeviceSecurityState) => void
}

export function useSecurityHub(callbacks: SecurityHubCallbacks) {
  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const token = useAuthStore(s => s.token)

  useEffect(() => {
    if (!token) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/security', {
        accessTokenFactory: () => token   // JWT sent as ?access_token= query param
      })
      .withAutomaticReconnect([0, 1000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    connection.on('OnAlert',              callbacks.onAlert)
    connection.on('OnDeviceStateChanged', callbacks.onDeviceStateChanged)

    connection.start()
      .then(() => console.log('[SignalR] Connected to SecurityHub'))
      .catch(err => console.error('[SignalR] Connection failed:', err))

    connectionRef.current = connection

    return () => { connection.stop() }
  }, [token])

  return connectionRef
}
```

---

## Dashboard Layout

### `DashboardPage.tsx` — top-level layout

```
┌─────────────────────────────────────────────────────────────┐
│  ATITFinalProject — Security Dashboard          [Logout]    │  ← TopBar
├──────────────┬──────────────────────────────────────────────┤
│              │                                               │
│  Devices     │  Device Security Status                       │
│  Alerts      │  ┌─────────────────────────────────────────┐ │
│  Game        │  │ DeviceTable                             │ │
│              │  │ DeviceId | Rate | SeqNum | Status | Act │ │
│              │  └─────────────────────────────────────────┘ │
│              │                                               │
│              │  Real-time Alert Feed                         │
│              │  ┌─────────────────────────────────────────┐ │
│              │  │ AlertFeed (scrolling, newest on top)    │ │
│              │  │ [RateExceeded] esp32-device-1 — 47/s   │ │
│              │  │ [UnknownSlot]  esp32-device-1 — inject │ │
│              │  └─────────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────┘
```

---

## Key Components

### `DeviceTable.tsx`

```typescript
// Columns: DeviceId | Events/sec | Last SeqNum | Status badge | Actions
// Status badge: green (active) | red (quarantined)
// Actions: Quarantine button (if active) | Unquarantine button (if quarantined)
// Data: from useDevices() hook — React Query polling every 3s as fallback
//       + SignalR push updates device rows in real time
```

### `AlertFeed.tsx`

```typescript
// Scrolling list, newest alert at top
// Max 100 alerts shown (slice from SignalR accumulated array)
// Each item shows: AlertType badge | deviceId | detail | timestamp
// AlertType badge colours:
//   RateExceeded   → red
//   CertMismatch   → red
//   UnknownSlot    → orange
//   SequenceGap    → yellow
//   ValueOutOfRange → yellow
// New alerts flash briefly (animate-pulse for 1s on mount)
```

### `GameControls.tsx`

```typescript
// Two buttons: "Start Round" and "End Round"
// Calls POST /api/admin/start and POST /api/admin/end respectively
// Requires Authorize — same JWT used for dashboard
// Shows current round phase from GET /api/sessions status
```

### `AlertBadge.tsx`

```typescript
// shadcn/ui Badge component with variant mapped from AlertType
const variantMap: Record<AlertType, string> = {
  CertMismatch:    'destructive',
  RateExceeded:    'destructive',
  UnknownSlot:     'warning',     // custom variant
  SequenceGap:     'secondary',
  ValueOutOfRange: 'secondary',
}
```

---

## shadcn/ui Components to Install

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button badge card table
npx shadcn-ui@latest add alert separator skeleton
```

Use the **dark** theme in `shadcn/ui` init — matches the overall project aesthetic.

---

## Login Page (`LoginPage.tsx`)

Simple centred card. On successful login, store JWT in Zustand (persisted to
`localStorage`) and redirect to `/dashboard/`.

```typescript
// POST /api/auth/login → { token, expiresIn }
// On success: authStore.login(token) → navigate('/dashboard/')
// On failure: show error message under form
// Form fields: Username (text), Password (password), Login button
// No registration — single admin user from config
```

---

## Build and Deployment

```bash
# Production build
npm run build
# Output in dist/ — copy to ATITFinalProject-server/GameServer/wwwroot/dashboard/

# Quick deploy script (run from dashboard root)
npm run build && cp -r dist/* ../ATITFinalProject-server/GameServer/wwwroot/dashboard/
```

Add to `package.json`:
```json
{
  "scripts": {
    "dev":        "vite",
    "build":      "tsc && vite build",
    "type-check": "tsc --noEmit",
    "deploy":     "npm run build && cp -r dist/* ../ATITFinalProject-server/GameServer/wwwroot/dashboard/"
  }
}
```

---

## Environment Variables (`.env.local` — never commit)

```
VITE_API_BASE_URL=http://localhost:5000
```

In production (served by ASP.NET): no env var needed — all paths are relative.

---

## Implementation Tasks for Claude Code

### Task 1: Project scaffold
```
npm create vite@latest . -- --template react-ts
npm install tailwindcss postcss autoprefixer
npm install @microsoft/signalr @tanstack/react-query zustand react-router-dom axios lucide-react
npx tailwindcss init -p
npx shadcn-ui@latest init   (choose dark theme, CSS variables: yes)
npx shadcn-ui@latest add button badge card table alert separator skeleton
```

### Task 2: Auth layer
- `src/store/authStore.ts` — Zustand with localStorage persistence
- `src/api/client.ts` — axios with JWT interceptor
- `src/api/auth.ts` — login/logout calls
- `src/pages/LoginPage.tsx` — login form
- Auth guard in `App.tsx` — redirect to login if no token

### Task 3: API and types
- `src/types/security.ts` — all TypeScript interfaces
- `src/api/security.ts` — all security endpoint calls
- `src/hooks/useDevices.ts` — React Query, polls every 3s
- `src/hooks/useAlerts.ts` — React Query, polls every 3s as fallback

### Task 4: SignalR
- `src/hooks/useSecurityHub.ts` — connection lifecycle, OnAlert, OnDeviceStateChanged
- In `DashboardPage.tsx` — merge SignalR push updates into React Query cache

### Task 5: Dashboard UI
- `DashboardPage.tsx` — layout with sidebar
- `DeviceTable.tsx` — device list with quarantine actions
- `AlertFeed.tsx` — real-time alert list
- `GameControls.tsx` — start/end round buttons
- `AlertBadge.tsx` — typed color badges

### Task 6: Vite config + build
- `vite.config.ts` — base path, proxy, path aliases
- Verify `npm run deploy` copies build correctly to ASP.NET wwwroot

---

## Testing Checklist

```
[ ] npm run dev starts without errors
[ ] Login page renders at /dashboard/login
[ ] Correct credentials → JWT stored → redirect to /dashboard/
[ ] Wrong credentials → error shown, no redirect
[ ] Device table loads on dashboard mount
[ ] Alert feed shows existing alerts on mount
[ ] SignalR connects (check browser network tab for WS connection to /hubs/security)
[ ] Quarantine button → device row turns red, quarantined badge appears
[ ] Unquarantine button → device row returns to green
[ ] Start Round / End Round buttons call correct endpoints
[ ] npm run build produces dist/ with index.html + assets/
[ ] Served from ASP.NET at /dashboard/ — no 404s on refresh
```
