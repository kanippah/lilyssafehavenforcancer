# Production image for Coolify (or any Docker host).
# On boot: applies migrations, runs the idempotent bootstrap seed, starts Next.
FROM node:22-alpine AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Keep the build inside a small server's memory: cap the heap and limit the
# number of prerender workers. Raise these on a bigger box with
# --build-arg BUILD_HEAP_MB=2048 --build-arg BUILD_CPUS=4
ARG BUILD_HEAP_MB=896
ARG BUILD_CPUS=2
ENV NODE_OPTIONS="--max-old-space-size=${BUILD_HEAP_MB}"
ENV BUILD_CPUS=${BUILD_CPUS}
RUN pnpm build

# Uploaded images live in Postgres, so this image is stateless — no volume.
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY docker-entrypoint.sh ./
EXPOSE 3000
CMD ["sh", "./docker-entrypoint.sh"]
