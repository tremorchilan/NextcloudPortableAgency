# Portable Agency CRM

> Self-hostable WhatsApp® CRM for portable agencies — shared inbox,
> contacts, sales pipelines, broadcasts, and no-code automations.
> Fork it, **brand it per client, host it anywhere.**

`Portable Agency CRM` is a downstream of
[wacrm](https://github.com/ArnasDon/wacrm) re-packaged for agencies that
stand up a WhatsApp CRM for themselves or their clients. Same battle-tested
product (Next.js + Supabase + Tailwind), re-branded and made portable: it
ships with Docker images, a `docker-compose` one-liner, and an env-driven
branding layer so a single codebase can be re-skinned for each deployment
without code changes.

[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](./LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ecf8e?logo=supabase)](https://supabase.com)

The upstream marketing site and self-host docs live in a separate repo
([ArnasDon/wacrm-site](https://github.com/ArnasDon/wacrm-site),
[wacrm.tech](https://wacrm.tech)). This repo is the **product** — clone or
fork it to run your own CRM, or run it as a portable agency appliance.

## What you get out of the box

- **Shared inbox** on the official WhatsApp Business API — multiple agents
  on one number, per-conversation assignment, status, and notes.
- **Contacts + tags + custom fields**, CSV import, deduplication.
- **Sales pipelines** (Kanban) with deals linked to conversations.
- **Broadcasts** with Meta-approved templates, delivery + read tracking,
  per-recipient variable substitution.
- **No-code automations** — triggers on inbound messages, new contacts,
  keywords, or schedule; conditional branches, waits, tags, webhooks.
- **AI reply assistant** — bring your own OpenAI or Anthropic key (stored
  encrypted; no per-seat AI fee, your data stays yours). One-click
  AI-drafted replies, plus an optional auto-reply bot with a
  per-conversation cap and clean human handoff.
- **Real-time dashboard** — response times, daily volume, pipeline value,
  cross-module activity feed.
- **Team accounts** — invite teammates by link, role-based access
  (owner / admin / agent / viewer), ownership transfer. Every install is
  account-scoped, so one shared inbox can be staffed by a whole team.
- **Public REST API** (`/api/v1`) with scoped, revocable API keys — build
  your own automations on top. See [docs/public-api.md](./docs/public-api.md).
- **MCP server** — drive your CRM from Claude, Cursor, and other AI
  assistants over the [Model Context Protocol](https://modelcontextprotocol.io).
  See [docs/mcp.md](./docs/mcp.md) (server in [`mcp-server/`](./mcp-server)).

## Why a portable-agency fork?

This is a **template**, not a SaaS. Forking means you get:

- **Full ownership** — your code, your Supabase project, your domain, your
  data. No lock-in, no seat pricing.
- **Per-client branding with zero code** — set a handful of `NEXT_PUBLIC_*`
  env vars (name, short name, primary colour, support email) and the
  instance re-skins itself. Run one codebase for many clients.
- **Runs anywhere Node.js does** — a single `docker compose up` brings up
  the app; point it at any Supabase project (your own, or a client's) and
  any WhatsApp Business number. No vendor-specific deploy step.
- **Real security primitives** — token encryption (AES-256-GCM), RLS on
  every table, HMAC-verified webhooks, CSP, rate limiting, CI typecheck /
  build on every PR.

## Quick start (Docker — recommended)

```bash
# 1. Clone
git clone https://github.com/<your-username>/NextcloudPortableAgency.git
cd NextcloudPortableAgency

# 2. Configure — copy the example and fill in Supabase + Meta creds
cp .env.local.example .env.local

# 3. Run (app only; bring your own Supabase + Meta)
docker compose up --build
```

Open <http://localhost:3000>. You'll be redirected to `/login` (or
`/dashboard` if already signed in).

> **Supabase + Meta are external dependencies.** This image runs the Next.js
> app only. You need a Supabase project (Postgres + Auth) and a Meta
> WhatsApp Business app. Apply the migrations in `supabase/migrations/` to
> your Supabase project, then fill in the env vars. See
> [docs/deployment-portable.md](./docs/deployment-portable.md).

## Quick start (local dev, no Docker)

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase + Meta creds
npm run dev
```

Open <http://localhost:3000>.

## Deploy anywhere

| Path | When to use |
|---|---|
| **Docker** (`Dockerfile` + `docker-compose.yml`) | Any VPS, any Node host, Kubernetes, or a client's infra. No platform lock-in. |
| **Any Node host** (Fly, Render, a VPS, your own k8s) | Build with `npm run build && npm start`; set the env vars below. |
| **Supabase** | Hosted or self-hosted Postgres + Auth. Apply `supabase/migrations/`. |

There is no single "blessed" host. The whole point of the portable fork is
that **you** choose where it runs — for yourself, or per client.

## Branding a deployment (agency config)

Every brand value is an env var with a sensible default, so you can re-skin
an instance without touching code:

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_BRAND_NAME` | `Portable Agency CRM` | Product name — browser title + docs. |
| `NEXT_PUBLIC_BRAND_SHORT` | `PACRM` | Short name / acronym for tight spaces. |
| `NEXT_PUBLIC_BRAND_TAGLINE` | `Self-hostable WhatsApp CRM for portable agencies` | One-line description. |
| `NEXT_PUBLIC_BRAND_PRIMARY` | `#0082c9` (Nextcloud blue) | Primary colour — drives the favicon. |
| `NEXT_PUBLIC_BRAND_SUPPORT_EMAIL` | `support@example.com` | Support contact surfaced in error copy. |
| `NEXT_PUBLIC_BRAND_SITE_URL` | _(empty)_ | Canonical site URL; last-resort for invite links. |
| `NEXT_PUBLIC_SITE_URL` | _(empty)_ | Canonical public URL (invite links + OG images). |

Set these in your host's env panel (or in `.env.local` for local dev). They
are read at build/render time — no rebuild needed beyond a restart for
server-rendered values.

## Bangladesh business features (BizBot)

This fork adds **Bangladeshi SME-friendly** capabilities on top of the
upstream CRM template, per the BizBot whitepaper/PRD in
[Documentation](#documentation). They're built to sit on the existing
template without forking its data model:

- **Bengali (বাংলা) locale** — `messages/bn.json` ships a Bengali UI.
  Set `NEXT_PUBLIC_APP_LOCALE=bn` to render the app in Bangla. The locale
  loader falls back to English per-key, so a partial translation still
  renders cleanly. Extend it by adding keys to `messages/bn.json` (see
  `scripts/gen-bn.mjs` for the translation map).
- **Bangladeshi Taka (BDT, ৳)** — added to the currency picker
  (`src/lib/currency.ts`), so a Bangladeshi business selects **৳** as its
  default currency in **Settings → Deals & currency**. `formatCurrency`
  renders `৳1,234` via the standard `Intl.NumberFormat`.
- **Bengali numerals** — `toBengaliDigits()` (`src/lib/currency.ts`)
  converts `0-9` → `০-৯` for amount/labels that should read in Bangla.

> **Roadmap (not yet built):** the heavier BizBot modules from the PRD —
> inventory/stock management, order extraction from Bangla/Banglish chat,
> accounting & VAT/TDS reports, Excel-first exports, multi-location, and
> offline PWA mode — are planned as follow-on phases (see the PRD). They
> require Supabase migrations + new UI and are scoped separately.

## Architecture

- **Next.js 16** (App Router, server actions, ISR) + React 19 + Tailwind 4.
- **Supabase** (Postgres + Auth + Realtime) — every table has RLS.
- **WhatsApp Business Cloud API** — shared inbox, webhooks, templates.
- **MCP server** (`mcp-server/`, stdio) — wraps `/api/v1` for AI assistants.

See [`docs/`](./docs) for the public API and MCP server, and
[`CONTRIBUTING.md`](./CONTRIBUTING.md) for dev workflow.

## Documentation

Product strategy docs for the BizBot initiative (WhatsApp-first commerce &
inventory for Bangladeshi SMEs), kept alongside this CRM template:

- [Whitepaper](./docs/bizbot-whitepaper.md) — market, architecture, business
  model, risks, and roadmap (v1.4).
- [Product Requirements Document (PRD)](./docs/bizbot-prd.md) — full
  functional/technical spec: modules, schema, API, AI/ML, security (v1.4).

## License

MIT — fork it, brand it, host it.
