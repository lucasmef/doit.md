FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# ── deps: instala apenas dependências de produção ──────────────────────────────
FROM base AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++ sqlite-libs

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/core/package.json ./packages/core/
COPY packages/types/package.json ./packages/types/
COPY packages/db/package.json ./packages/db/
COPY packages/sync/package.json ./packages/sync/
COPY packages/audit/package.json ./packages/audit/
COPY packages/md/package.json ./packages/md/

RUN pnpm install --frozen-lockfile

# ── builder: compila o app ─────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .

RUN pnpm --filter @doit/web build

# ── runner: imagem final mínima ────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache sqlite-libs libstdc++

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copia apenas o output standalone + assets públicos
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
