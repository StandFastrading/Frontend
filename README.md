# standfast-web

Frontend for **Standfast** — a trading journal that helps day traders maintain emotional control.

Pairs with the FastAPI backend in `standfast-1/`. Communicates with Supabase directly for auth + realtime, and with the backend over HTTP for journal/trade data.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4** + **shadcn/ui** (Base UI primitives)
- **TanStack Query** for client-side server state
- **Supabase JS** + **@supabase/ssr** for auth and realtime
- **react-hook-form** + **zod** for forms and validation
- **Recharts** for journal analytics
- **next-mdx-remote** for the `/docs` section

## Getting started

```powershell
npm install
cp .env.example .env.local   # then fill in Supabase keys + API base URL
npm run dev                  # http://localhost:3000
```

## Layout

```
src/
  app/
    (marketing)/    public pages: home, /docs/[slug]
    (auth)/         login, signup
    (dashboard)/    authenticated app shell (left nav)
  components/ui/    shadcn primitives
  features/         feature-scoped code (components, hooks, api, schemas, types)
  config/           nav, routes, env validation, docs sidebar
  lib/              supabase clients, fetch wrapper, query client, utils
  providers/        client-side context providers
content/docs/       MDX docs source
```

See feature-scoping conventions in `CLAUDE.md` (to be added) and the architectural decision log.
