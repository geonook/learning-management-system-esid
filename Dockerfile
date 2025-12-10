FROM node:22-slim AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --include=dev

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Debug: verify critical files exist before build
RUN echo "=== Verifying critical files ===" && \
    ls -la components/auth/ && \
    ls -la components/ui/ && \
    ls -la hooks/ && \
    echo "=== All critical files verified ==="

RUN npm run build

FROM base AS runner
LABEL "language"="nodejs"
LABEL "framework"="next.js"
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 8080
CMD ["npm", "start"]
