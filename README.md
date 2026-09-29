# MoveX

Delivery tracking for MoveX Xpress. Riders share their location from the rider app, admins assign
riders and end trips on the web dashboard, and customers follow a live tracking link.

## Layout

| Folder | What it is | Deployed on |
|---|---|---|
| `apps/web` | Vite + React site: home, public tracking page, admin dashboard, web rider page | Vercel |
| `apps/api` | Express + MongoDB API used by the site and the rider app | Railway |
| `apps/rider-app` | Expo (React Native) rider app | EAS / app stores |
| `packages/shared` | Delivery statuses and helpers used by all three | — |

## Getting started

```bash
npm install          # once, from this folder; installs every app
npm run dev:api      # API on http://localhost:3001 (needs apps/api/.env)
npm run dev:web      # site on http://localhost:5173 (apps/web/.env sets VITE_API_BASE_URL)
npm run dev:app      # Expo dev server for the rider app (apps/rider-app/.env)
```

Each app keeps its own `.env`; copy the `.env.example` next to it. Never commit `.env` files.

## Deployment settings

- **Vercel (web):** Root Directory `apps/web`. Vercel installs from the repo root automatically.
- **Railway (API):** leave Root Directory empty (repo root). `railway.json` sets the start command
  (`npm run start -w @movex/api`) and only redeploys when `apps/api` or `packages/shared` change.
- **Rider app:** run `eas build` from `apps/rider-app`. Background location needs a development or
  production build, not Expo Go.
