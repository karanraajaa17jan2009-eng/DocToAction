# Stage 1: Build client and server
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and workspace package definitions
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install all dependencies
RUN npm run install:all

# Copy source code
COPY client ./client
COPY server ./server
COPY attached_assets ./attached_assets

# Build both client and server
RUN npm run build:client
RUN npm run build:server

# Stage 2: Production runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy root package.json
COPY package*.json ./
COPY server/package*.json ./server/

# Install only production dependencies in server
RUN cd server && npm install --omit=dev

# Copy compiled artifacts and static assets
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/attached_assets ./attached_assets

EXPOSE 5000

CMD ["node", "server/dist/index.js"]
