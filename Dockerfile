# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

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
ENV VITE_API_URL=https://beta.devregion.com/api
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Default port for API
ENV PORT=3030
ENV MONGO_URI=mongodb://root:iV4U6vH5v2t7AWPOdlcZQ7LXxNEOfQfqCZrg2i4oUdsYKAoYtOUarnFlAeYcyVQZ@jgsogwg400wk0c4sw8040gcc:27017/devmanager?authSource=admin&directConnection=true
ENV JWT_SECRET=supersecretkey
ENV REDIS_URL=redis://localhost:6379
ENV GITHUB_CLIENT_ID="Ov23lievqX0deavCNgFA"
ENV GITHUB_CLIENT_SECRET="24c00c09a9f1cfb1d0192375a8687fd430d11d8a"
ENV GITHUB_SETUP_CALLBACK_URL=https://beta.devregion.com/api/auth/github/setup/callback
ENV FRONTEND_BASE_URL=https://beta.devregion.com

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

# Expose port
EXPOSE 3030

# Start API
CMD ["node", "apps/api/dist/index.js"]
