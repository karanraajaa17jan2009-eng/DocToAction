# Stage 1: Build client and server
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for each sub-project
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies for each separately (no workspace detection)
RUN npm install --prefix client
RUN npm install --prefix server

# Copy source code
COPY client ./client
COPY server ./server
COPY attached_assets ./attached_assets

# Build client then server
RUN npm run build --prefix client
RUN npm run build --prefix server

# Stage 2: Production runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy only server package files and install prod deps
COPY server/package*.json ./server/
RUN npm install --prefix server --omit=dev

# Copy compiled artifacts and static assets
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/attached_assets ./attached_assets

EXPOSE 5000

CMD ["node", "server/dist/index.js"]
