# Image for the `web` service (Next.js).
# The job worker lives in a separate repo and is built/deployed there.
#
# NOTE: requires the app scaffold (package.json with next, drizzle-orm, drizzle-kit,
# and a `start` script). Until that lands the image cannot build.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN mkdir -p public data && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data
COPY --from=builder /app/src ./src
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
USER nextjs
EXPOSE 3000
CMD ["npm", "run", "start"]
