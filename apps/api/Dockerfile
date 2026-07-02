# API image for the Mac mini prod stack. The api runs via tsx (no compiled dist), which
# is fine for a single-user Mini under a supervisor (Docker restart: unless-stopped).
#
# Build context is the repo root (see docker-compose.prod.yml) because this is a pnpm
# workspace and the api depends on @dayboard/core and @dayboard/shared.
FROM node:22-slim

# Tools some deps expect during install; keep the image slim otherwise.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.6.5 --activate

WORKDIR /app

# Copy the whole workspace and install. .dockerignore keeps node_modules/dist/.env out.
COPY . .
RUN pnpm install --frozen-lockfile

# On start: apply any pending Drizzle migrations, then run the server. drizzle-kit migrate
# is idempotent, so this is safe on every restart. DATABASE_URL comes from the container
# environment (env.ts/drizzle.config.ts fall back to process.env when no .env is present).
CMD ["sh", "-c", "pnpm --filter @dayboard/api db:migrate && pnpm --filter @dayboard/api start"]
