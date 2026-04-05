FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

COPY . ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

LABEL org.opencontainers.image.title="9router"

ENV NODE_ENV=production
ENV PORT=20267
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/open-sse ./open-sse
# Next file tracing can omit sibling files; MITM runs server.js as a separate process.
COPY --from=builder /app/src/mitm ./src/mitm
# Standalone node_modules may omit deps only required by the MITM child process.
COPY --from=builder /app/node_modules/node-forge ./node_modules/node-forge

RUN mkdir -p /app/data

# Fix permissions at runtime - chown both app/data and mounted /data volume
RUN printf '#!/bin/sh\n\
chown -R node:node /app/data 2>/dev/null || true; \
chown -R node:node /data 2>/dev/null || true; \
exec su-exec node "$@"\n' > /entrypoint.sh && chmod +x /entrypoint.sh
RUN apk add --no-cache su-exec

EXPOSE 20267

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]
