# Build stage
# Must match the runtime base (bookworm-slim/glibc) so native modules
# like bcrypt compile against the same libc that the runner uses.
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install build tools needed for native addons (bcrypt, etc.)
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Copy dependency definitions
COPY package.json package-lock.json ./
# Copy workspace definitions
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies (frozen lockfile)
RUN npm ci

# Copy source code
COPY . .

# Build all workspaces
# VITE_API_URL set to beta domain for production
ENV VITE_API_URL=https://todo.devregion.com/api
# Limit memory usage during build to prevent OOM kills on smaller servers
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

# Production runtime stage
# bookworm-slim instead of alpine so git works correctly for repo cloning
FROM node:20-bookworm-slim AS runner

# Install git — needed by repo.service.ts to clone project repos for Antigravity
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends git ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g opencode-ai

# Create repos directory for Antigravity codebase context
RUN mkdir -p /var/devmanager/repos

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3030
ENV MONGO_URI=mongodb://root:iV4U6vH5v2t7AWPOdlcZQ7LXxNEOfQfqCZrg2i4oUdsYKAoYtOUarnFlAeYcyVQZ@jgsogwg400wk0c4sw8040gcc:27017/devmanager?authSource=admin&directConnection=true
ENV JWT_SECRET=supersecretkey
ENV REDIS_URL=redis://localhost:6379
ENV GITHUB_CLIENT_ID="Ov23lievqX0deavCNgFA"
ENV GITHUB_CLIENT_SECRET="24c00c09a9f1cfb1d0192375a8687fd430d11d8a"
ENV GITHUB_SETUP_CALLBACK_URL=https://todo.devregion.com/api/auth/github/setup/callback
ENV FRONTEND_BASE_URL=https://todo.devregion.com
# Antigravity — override via docker-compose or -e flags
ENV OPENCODE_URL=http://127.0.0.1:5001
ENV REPOS_ROOT=/var/devmanager/repos
ENV OPENCODE_BASE_PORT=5010
ENV OPENCODE_PORT=5001
ENV START_OPENCODE=1
# Explicit absolute path to the web build — avoids __dirname resolution issues
ENV STATIC_PATH=/app/apps/web/dist

# Copy necessary files
# Copy node_modules with compiled binaries from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Copy workspace artifacts
# API
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY --from=builder /app/apps/api/tsconfig.scripts.json ./apps/api/tsconfig.scripts.json
COPY --from=builder /app/apps/api/scripts ./apps/api/scripts
COPY --from=builder /app/apps/api/src ./apps/api/src

# Web static files (to be served by API)
COPY --from=builder /app/apps/web/dist ./apps/web/dist

# Shared packages
COPY --from=builder /app/packages ./packages
COPY docker/start-with-opencode.sh ./docker/start-with-opencode.sh

RUN chmod +x ./docker/start-with-opencode.sh

# Expose port
EXPOSE 3030

# Start OpenCode and the API in the same container.
CMD ["./docker/start-with-opencode.sh"]
