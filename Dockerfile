## ---- deps (install only production deps) ----
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

## ---- runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# security: non-root user
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./package.json
COPY src ./src

# uploads directory (bind mount or volume in production)
RUN mkdir -p /app/uploads && chown -R nodeuser:nodejs /app

USER nodeuser

EXPOSE 4000

# Optional healthcheck (requires no extra dependency)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]

