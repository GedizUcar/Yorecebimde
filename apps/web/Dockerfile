# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH

# ---- deps stage ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/ai-bot/package.json ./packages/ai-bot/
COPY packages/auth/package.json ./packages/auth/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
RUN --mount=type=cache,id=pnpm,target=/usr/local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---- builder ----
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
# Next.js NEXT_PUBLIC_* env'leri BUILD TIME'da bake eder. Compose'tan ARG olarak gelir.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEB_URL
ARG NEXT_PUBLIC_PANEL_URL=
ARG NEXT_PUBLIC_CDN_URL
ARG NEXT_PUBLIC_DEFAULT_LOCALE=tr
ARG NEXT_PUBLIC_SUPPORTED_LOCALES=tr,en
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WEB_URL=$NEXT_PUBLIC_WEB_URL
ENV NEXT_PUBLIC_PANEL_URL=$NEXT_PUBLIC_PANEL_URL
ENV NEXT_PUBLIC_CDN_URL=$NEXT_PUBLIC_CDN_URL
ENV NEXT_PUBLIC_DEFAULT_LOCALE=$NEXT_PUBLIC_DEFAULT_LOCALE
ENV NEXT_PUBLIC_SUPPORTED_LOCALES=$NEXT_PUBLIC_SUPPORTED_LOCALES
# /app yapısını tam al — root + workspace package node_modules symlink'leri korunur
COPY --from=deps /app ./
# Source'u üzerine yaz
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm --filter @yorecebimde/web build

# ---- runner (standalone output) ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/apps/web/.next/standalone ./
COPY --from=builder --chown=app:app /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=app:app /app/apps/web/public ./apps/web/public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
CMD ["node", "apps/web/server.js"]
