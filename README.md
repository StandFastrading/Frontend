# standfast-web

Frontend for **Standfast** — a trading journal that helps day traders maintain emotional control.

Pairs with the FastAPI backend in the parent `standfast-1/` directory (collocated, two separate git repos). Communicates with Supabase directly for auth + realtime, and with the backend over HTTP for journal/trade data.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4** + **shadcn/ui** (Base UI primitives, base-nova preset)
- **TanStack Query** for client-side server state
- **Supabase JS** + **@supabase/ssr** for auth and realtime
- **react-hook-form** + **zod** for forms and validation
- **Recharts** for journal analytics (TradingView Advanced Charts later for market candles)
- **next-mdx-remote** for the `/docs` section

## Getting started

```powershell
# Node 24 LTS isn't on PATH in fresh PowerShell sessions — refresh it first:
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

npm install
copy .env.example .env.local   # then fill in real Supabase keys
npm run dev                    # http://localhost:3000
```

### Environment variables

`.env.local` is gitignored. Required (validated by zod in [src/config/env.ts](src/config/env.ts) — `getEnv()` throws if any are missing):

| Variable | Where to find |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → Data API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page — `anon public` |
| `NEXT_PUBLIC_API_BASE_URL` | FastAPI backend URL (defaults to `http://localhost:8000`) |

**Never** put the Supabase service role key here — it goes on the FastAPI backend only.

## What's implemented

| Route | What it does |
|---|---|
| `/` | Marketing home with header (Docs / Sign in / Get started) |
| `/docs` | Landing grid of docs sections |
| `/docs/[slug]` | MDX article from `content/docs/<slug>.mdx`, frontmatter-driven `<title>` |
| `/login`, `/signup` | Email/password auth via Supabase; sign-up sends a confirm email if enabled in the Supabase dashboard |
| `/dashboard` | Authenticated app shell — left sidebar (Dashboard / Journal / Trades / Account) + topbar with user menu (avatar dropdown → Account / Sign out) |
| `/dashboard`, `/journal`, `/trades` | Placeholder content; real features land later |
| `/account` | Profile tab — edit display name (Supabase `user_metadata`) |
| `/account/security` | Security tab — change password |

`/dashboard/*` and `/account/*` are gated by [src/proxy.ts](src/proxy.ts) — unauthenticated requests 307 → `/login?next=<original-path>`.

## Layout and conventions

```
src/
  app/
    (marketing)/    public pages: home, /docs, /docs/[slug]
    (auth)/         login, signup (centered card layout)
    (dashboard)/    authenticated app shell (left nav + topbar)
  components/
    ui/             shadcn primitives (button, input, card, etc.)
    layout/         AppShell pieces (sidebar, topbar, user-menu)
  features/         feature-scoped code, each folder owns:
    <feature>/
      components/   feature-specific React components
      hooks/        feature-specific hooks (none yet)
      api.ts        Supabase / FastAPI calls for this feature
      schemas.ts    zod schemas
      types.ts      shared types (none yet)
  config/           nav.ts, routes.ts, env.ts (lazy zod), docs.ts
  lib/
    supabase/       browser + server clients, proxy session helper
    api/            shared fetch wrapper (not yet built — Phase 5)
    query-client.ts, mdx.ts, utils.ts
  providers/        client-side React context providers
  proxy.ts          Next 16 auth-gating proxy (NOT middleware — see below)
content/docs/       MDX source for /docs/[slug]
```

**Conventions to follow when adding features:**

1. New features create a folder under `src/features/<name>/` with the standardized internal layout above — no flat dumping.
2. Hooks/schemas/API calls scoped to one feature live in that feature folder. Top-level `src/hooks/` and `src/schemas/` are reserved for truly cross-cutting items.
3. Navigation items, route names, and env vars are imported from `src/config/` — never hardcoded inline.
4. Adding a new docs page: drop an `.mdx` file in `content/docs/` and append an entry to [src/config/docs.ts](src/config/docs.ts).

## Things to know (gotchas)

- **Next 16 renamed `middleware.ts` to `proxy.ts`**, and the file MUST live inside `src/` when using a `src/` directory (the docs say "root or src/" but at the root Next silently doesn't invoke it). Lost ~20 min figuring this out.
- **shadcn/ui base-nova preset uses Base UI primitives**, not Radix. `Button` has no `asChild` prop — use `buttonVariants()` on a `<Link>` instead. The `form` component isn't in this preset's registry; current forms compose `Input`/`Label`/`Button` directly with `useForm().register()`.
- **OneDrive sync slows installs**. Initial `create-next-app` took ~4 min vs. ~1 min off-OneDrive. If dev loop perf becomes annoying, exclude `node_modules` from sync or move the project off OneDrive.
- **Repo is git-tracked** (separate from the parent backend repo). Branch: `main`. Commits document each phase — `git log --oneline`.

## Deferred / known-missing

- Avatar upload (needs a Supabase Storage bucket)
- Email change (needs Supabase re-verification flow)
- "Sign out all sessions" — `signOut({ scope: 'global' })`, no UI yet
- `src/lib/api/client.ts` fetch wrapper that injects the Supabase JWT for FastAPI calls (waiting on backend endpoints)
