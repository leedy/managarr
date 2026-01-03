# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY server ./server
COPY client ./client

# Build both client and server
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install production dependencies only
RUN npm ci --workspace=server --omit=dev

# Copy built server
COPY --from=builder /app/server/dist ./server/dist

# Copy built client to be served by Express
COPY --from=builder /app/client/dist ./client/dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3005

EXPOSE 3005

# Start the server
CMD ["node", "server/dist/index.js"]
