# Portable deployment guide

This fork is built to run **anywhere Node.js does** — a VPS, a client's
infra, Kubernetes, or any managed Node host. There is no single "blessed"
platform. This guide covers the two recommended paths (Docker and any Node
host) and the external dependencies you must provision.

## 1. External dependencies

The container runs the Next.js app only. You supply:

- **Supabase** (Postgres + Auth + Realtime). Hosted or self-hosted.
- **Meta WhatsApp Business app** (the phone number + Cloud API creds).

### Supabase setup

1. Create a Supabase project.
2. Apply the migrations in `supabase/migrations/` (run them in order, or
   use the Supabase CLI: `supabase db push`).
3. Copy the **Project URL** and **anon** / **service_role** keys into your
   env (below).
4. Configure Auth redirect URLs to include your deployment's origin
   (`https://crm.example.com`).

### Meta setup

1. Create a Meta app with the **WhatsApp** product.
2. Add a phone number (or use a test number).
3. Copy the **App Secret** (`META_APP_SECRET`) and, if you submit
   image-header templates, the **App ID** (`META_APP_ID`).
4. Point the WhatsApp webhook at `https://<your-host>/api/whatsapp/webhook`
   and verify it with the challenge from the dashboard.

## 2. Environment variables

Copy `.env.local.example` to `.env.local` (or set the vars in your host's
env panel) and fill in:

| Var | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-only; bypasses RLS. Keep secret. |
| `ENCRYPTION_KEY` | ✅ | 64 hex chars (32 bytes, AES-256-GCM). See example for generation. |
| `META_APP_SECRET` | ✅ | Verifies webhook HMAC. |
| `NEXT_PUBLIC_SITE_URL` | ⚠️ | Canonical URL; pins invite links. |
| `NEXT_PUBLIC_APP_LOCALE` | ⚠️ | Default `en`. |
| `ALLOWED_INVITE_HOSTS` | ⬜ | Comma-separated host allow-list for invite links. |
| `AUTOMATION_CRON_SECRET` | ⬜ | Required if you use Wait steps in automations. |
| `META_APP_ID` | ⬜ | Only for image-header template submission. |
| `NEXT_PUBLIC_BRAND_*` | ⬜ | Branding — see below. |

See `.env.local.example` for inline explanations of every var.

## 3. Branding (agency config)

Re-skin a deployment without code changes via `NEXT_PUBLIC_BRAND_*`:

| Var | Default |
|---|---|
| `NEXT_PUBLIC_BRAND_NAME` | `Portable Agency CRM` |
| `NEXT_PUBLIC_BRAND_SHORT` | `PACRM` |
| `NEXT_PUBLIC_BRAND_TAGLINE` | `Self-hostable WhatsApp CRM for portable agencies` |
| `NEXT_PUBLIC_BRAND_PRIMARY` | `#0082c9` (Nextcloud blue) |
| `NEXT_PUBLIC_BRAND_SUPPORT_EMAIL` | `support@example.com` |
| `NEXT_PUBLIC_BRAND_SITE_URL` | _(empty)_ |

`NEXT_PUBLIC_*` values are inlined into the client bundle **at build time**,
so for Docker set them as build args (compose does this) or export them
before `npm run build`. Server-rendered values (page `<title>`, favicon)
also read them at runtime.

## 4. Docker (recommended)

```bash
cp .env.local.example .env.local   # fill in Supabase + Meta creds
docker compose up --build
# → http://localhost:3000
```

To brand at build time without compose, pass build args:

```bash
docker build \
  --build-arg NEXT_PUBLIC_BRAND_NAME="Acme Agency CRM" \
  --build-arg NEXT_PUBLIC_BRAND_PRIMARY="#0b7285" \
  -t acme-crm .
docker run -p 3000:3000 --env-file .env.local acme-crm
```

Runtime config (Supabase, Meta, ENCRYPTION_KEY, brand non-`PUBLIC` vars)
comes from `--env-file` / your host's env — no rebuild needed for those.

> **Build needs network access.** `npm run build` fetches the Inter font
> from Google Fonts at build time (via `next/font`). Ensure the build
> environment can reach `fonts.googleapis.com`, or self-host the font.
> This is upstream behaviour, not specific to this fork.

## 5. Any Node host

```bash
npm ci
npm run build
NODE_ENV=production npm start
# → listens on PORT (default 3000)
```

Set the env vars from §2/§3 in your host's env panel (Fly, Render, a VPS
with systemd, k8s, …). Next.js standalone output (`output: "standalone"`
in `next.config.ts`) is only needed for the Docker image; a plain
`npm start` works everywhere.

## 6. Cron / automations

If you use **Wait** steps or scheduled automations, they're drained by a
periodic `GET /api/automations/cron` call guarded by
`AUTOMATION_CRON_SECRET`. Wire a scheduler (GitHub Action, cron job, your
host's task scheduler) to hit:

```
GET https://<your-host>/api/automations/cron
Authorization: Bearer <AUTOMATION_CRON_SECRET>
```

## 7. Production hardening checklist

- ✅ HTTPS only (required for the WhatsApp webhook). Terminate TLS at your
  reverse proxy / load balancer.
- ✅ Set `NEXT_PUBLIC_SITE_URL` and (for public invites) `ALLOWED_INVITE_HOSTS`.
- ✅ Store `ENCRYPTION_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in a secret
  manager, not in the image.
- ✅ Rotate `ENCRYPTION_KEY` only during a maintenance window — it orphans
  previously encrypted WhatsApp tokens.
- ✅ Keep the CI workflow (`.github/workflows/ci.yml`) running so every
  deploy typechecks + builds.
