# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/web/package*.json ./packages/web/

RUN npm ci --include=dev

COPY . .

RUN npm run build --workspace=@notely/web

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/web/package*.json ./packages/web/

RUN npm ci --omit=dev

COPY --from=builder /app/packages/server ./packages/server
COPY --from=builder /app/packages/web/dist ./packages/web/dist

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

USER nodejs

EXPOSE 3000

CMD ["node", "packages/server/dist/server.js"]
