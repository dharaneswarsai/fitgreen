# FITGREEN Growth System

A gym CRM + marketing site for FITGREEN, a strength & conditioning club. The public
site captures leads; the admin app runs them through follow-ups, trials,
conversions and revenue reporting.

The full loop:

```
public lead -> CRM -> follow-up -> trial -> attendance -> membership -> revenue -> analytics
```

## Stack

React 18, TypeScript, Vite, Tailwind CSS v4, React Router, Recharts, date-fns,
lucide-react, Zod + react-hook-form, oxlint, Vitest, and optional Supabase.

## Getting started

```bash
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`).

- Public site: `/`, `/programs`, `/trainers`, `/memberships`, `/testimonials`, `/contact`
- Signup form: `/join`
- Admin app: `/admin`

There is **no login**. The app boots with a deterministic seeded dataset so every
screen has realistic data on first load. Use the role switcher in the admin header
to view the app as Owner, Sales Manager or Sales Exec — it filters visibility only,
it never mutates data.

> The build uses absolute asset paths, so it must be served over HTTP. Opening
> `dist/index.html` directly with `file://` will fail. Use `npm run preview`.

## Scripts

| Command              | What it does                                  |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Dev server with HMR                          |
| `npm run build`      | `tsc -b` then production build to `dist/`    |
| `npm run preview`    | Serve the built output                        |
| `npm run typecheck`  | TypeScript, no emit                           |
| `npm run lint`       | oxlint over `src`                             |
| `npm test`           | Vitest suite (27 tests)                       |
| `npm run test:watch` | Vitest in watch mode                          |

## Data storage

LocalStorage is the default and requires no configuration. Every mutation runs
through a pure `(db) => result` transform in `src/services/workflows.ts`, which the
context then diffs and persists.

To switch to Postgres:

1. Run `supabase/schema.sql` once in the Supabase SQL Editor. It is idempotent.
2. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`.

The client is built with the anon key, so it is public in the bundle. The RLS
policies shipped in `schema.sql` are permissive for exactly that reason — they suit
a seeded demo, not real member data. Tighten them before going live; the SQL file
contains a commented example.

`Settings -> Reset demo data` restores the seed and clears local changes.

## Layout

```
src/
  components/    layout, ui primitives (Button, Card, DataTable, Overlay, Badges)
  constants/     copy for the public site, enums, formatters, scoring thresholds
  context/       AppContext: state, actions, persistence, viewer persona
  lib/           seed, id, localStorage, Supabase mapping, data service
  pages/public/  Home, Programs, Trainers, Memberships, Testimonials, Contact, Join
  pages/admin/   Dashboard, Leads, LeadDetail, Pipeline, FollowUps, Appointments,
                 Members, Campaigns, Analytics, Team, Notifications, Settings
  services/      workflows (pure transforms), metrics, leadScoring, notifications
  types/         the single source of truth for the data model
```

Everything reads its schema from `src/types/index.ts`.

## Editing gym copy

Public-site copy, opening hours, programs, trainers and testimonials live in
`src/constants/content.ts`. `Settings` links there directly, because that one file
drives the whole public site.

## Deploying

`vercel.json` is included with an SPA rewrite, so client-side routes survive a hard
refresh.

```bash
vercel
```

Any static host works too — build to `dist/` and rewrite all paths to `index.html`.