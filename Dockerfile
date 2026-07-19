# Single-service deployment: builds the React frontend, then runs it
# alongside the API from one Express process (server.js static-serves
# frontend/dist — see the "Serve the built frontend" block there). This
# means one container / one host satisfies "deploy on a live hosting
# platform" without juggling CORS or two separate services.
#
# Build:  docker build -t campusverse-ai .
# Run:    docker run -p 5000:5000 --env-file backend/.env -v campusverse-data:/app/backend/data campusverse-ai
#
# See DEPLOYMENT.md for platform-specific instructions (Render, Railway, Fly.io).

# ---------- Stage 1: build the frontend ----------
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: backend + built frontend ----------
FROM node:20-alpine
WORKDIR /app/backend

# Native deps (bcryptjs/prisma engines) need these on alpine
RUN apk add --no-cache openssl

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/ ./
RUN npx prisma generate

# Bring in the frontend build so server.js's static-serving block finds it
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# SQLite file lives here — mount a volume at /app/backend/data in
# production so it survives redeploys/restarts (see DEPLOYMENT.md).
RUN mkdir -p /app/backend/data
RUN chmod +x docker-entrypoint.sh
ENV DATABASE_URL="file:./data/prod.db"
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

# Only pushes the Prisma schema on first boot (no existing db file) —
# never auto-syncs schema changes against a database that already has
# data in it. See docker-entrypoint.sh.
CMD ["./docker-entrypoint.sh"]
