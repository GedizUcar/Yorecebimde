# syntax=docker/dockerfile:1.7
# ===================================================================
# Yörecebimde API — Docker image (staging/production)
# ===================================================================
# Strateji: @swc-node/register runtime — class-based DI metadata için
# (Faz 1'de tsx kullanıyorduk; @swc-node decorator metadata'yı doğru emit eder).
# Faz 7'de prod için esbuild bundle'a geçilecek.
# ===================================================================

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH

# ---- deps stage: monorepo install ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
COPY packages/ui/package.json ./packages/ui/
RUN --mount=type=cache,id=pnpm,target=/usr/local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---- runner stage: TS source + tsx ----
FROM base AS runner
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

RUN addgroup -S app && adduser -S app -G app

# Workspace iskeleti + tüm node_modules (workspace symlink'ler dahil)
COPY --from=deps --chown=app:app /app ./

# Application source (TS — tsx runtime'da transpile eder)
COPY --chown=app:app tsconfig.base.json ./
COPY --chown=app:app packages ./packages
COPY --chown=app:app apps/api ./apps/api

USER app
WORKDIR /app/apps/api
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/healthz || exit 1

CMD ["node", "--import", "@swc-node/register/esm-register", "src/main.ts"]
