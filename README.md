# ATIT Dashboard — Admin Security Dashboard

React + TypeScript single-page app for operating
[ATITFinalProject](https://github.com/SupakornSJB/ATITFinalProject), an IoT multiplayer game
controlled by ESP32 devices. It shows the security state of every controller in real time and
lets an operator react to attacks.

> **Status:** works against the relay server for login, live alerts and quarantine, but has
> not been fully tested end to end — see [Known limitations](#known-limitations).

---

## Features

- **Login** — username/password against the relay (`POST /api/auth/login`); the returned JWT
  is kept in a persisted Zustand store and attached to every request. A `401` logs out.
- **Live alert feed** — subscribes to the relay's SignalR hub (`/hubs/security`) and shows
  `OnAlert` events as they happen: rate floods, unknown slots, unauthorized and unknown devices.
- **Device table** — each controller's event rate, last sequence number, alert count,
  last-seen time and quarantine status, updated live by `OnDeviceStateChanged`.
- **Quarantine / release** — one click per device
  (`PUT /api/security/devices/{id}/quarantine`); a quarantined device's events are dropped by
  the relay.
- **Round controls** — start and end the game round on the Unity server
  (`POST /api/admin/start` / `end`).

Pair it with the relay's `Scripts/rogue_device.py` to demo the intrusion detection: run an
attack and watch the alert appear and the device get quarantined.

---

## Tech stack

| | |
|---|---|
| UI | React 19, TypeScript 6, Tailwind CSS 3, shadcn/ui-style components |
| Build | Vite 8 |
| Data | Axios (REST), `@microsoft/signalr` (real-time), Zustand (auth state), React Router 7 |

```
src/
├── api/          client.ts (Axios + JWT interceptor), auth.ts, security.ts
├── hooks/        useSecurityHub (SignalR connection), useAlerts, useDevices
├── store/        authStore (persisted JWT)
├── pages/        LoginPage, DashboardPage
├── components/   alerts/, devices/, game/, layout/, ui/
└── types/        security.ts — mirrors the relay's DeviceSecurityState / IntrusionAlert
```

---

## Running

Start the [relay server](https://github.com/SupakornSJB/ATITInfraNode) first (it listens on
`https://localhost:5000`) and create the admin user with its `Scripts/seed_admin.py`.

```bash
npm install
npm run dev        # http://localhost:5173/dashboard/
```

Vite proxies `/api` and `/hubs` (including the WebSocket) to `https://localhost:5000`, so the
browser only ever talks to one origin — no CORS or environment configuration needed. Change
the target in `vite.config.ts` if the relay runs elsewhere.

**Served by the relay instead (optional):** build straight into the relay's `wwwroot` and it
serves the app at `https://<relay-host>:5000/dashboard/` — handy for a demo with no Node
process:

```bash
npm run build -- --outDir ../ATITInfraNode/GameServer/wwwroot/dashboard --emptyOutDir
```

The app is built with `base: '/dashboard/'`, so it expects to live under that path either way.

---

## Known limitations

- Not fully tested end to end.
- **Round controls need an open admin API:** the relay protects `/api/admin/*` with an API key,
  but the dashboard only sends its JWT, so Start/End work only while the relay's
  `IoTGame:AdminApiKey` is empty.
- `npx eslint .` reports 6 issues (2 × `react-hooks/refs` in `AlertFeed` / `useSecurityHub`,
  2 × `no-explicit-any` in `GameControls`, 2 × `react-refresh/only-export-components` in the
  `ui/` components). They don't affect the build.
