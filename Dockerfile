# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Portable Agency CRM — container image
#
# Builds the Next.js standalone bundle and ships a minimal runtime image.
# Branding + runtime config are supplied via --build-arg (for NEXT_PUBLIC_*
# values, inlined into the client bundle at build time) and via env at
# runtime (see docker-compose.yml / your host's env panel).
# ---------------------------------------------------------------------------

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# --- deps -----------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- build ----------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time.
# Provide them as build args (compose passes them through) or set them
# in the environment here. Unset → the brand defaults in src/lib/brand.ts.
ARG NEXT_PUBLIC_SITE_URL=""
ARG NEXT_PUBLIC_BRAND_NAME=""
ARG NEXT_PUBLIC_BRAND_SHORT=""
ARG NEXT_PUBLIC_BRAND_TAGLINE=""
ARG NEXT_PUBLIC_BRAND_PRIMARY=""
ARG NEXT_PUBLIC_BRAND_SUPPORT_EMAIL=""
ARG NEXT_PUBLIC_BRAND_SITE_URL=""
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_BRAND_NAME=$NEXT_PUBLIC_BRAND_NAME \
    NEXT_PUBLIC_BRAND_SHORT=$NEXT_PUBLIC_BRAND_SHORT \
    NEXT_PUBLIC_BRAND_TAGLINE=$NEXT_PUBLIC_BRAND_TAGLINE \
    NEXT_PUBLIC_BRAND_PRIMARY=$NEXT_PUBLIC_BRAND_PRIMARY \
    NEXT_PUBLIC_BRAND_SUPPORT_EMAIL=$NEXT_PUBLIC_BRAND_SUPPORT_EMAIL \
    NEXT_PUBLIC_BRAND_SITE_URL=$NEXT_PUBLIC_BRAND_SITE_URL

RUN npm run build

# --- runner ---------------------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Standalone server bundle + static assets + public files.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
