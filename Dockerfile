# Multi-architecture index digests verified against Docker Hub on 2026-09-19.
ARG NODE_IMAGE=node:22.20.0-bookworm-slim@sha256:b21fe589dfbe5cc39365d0544b9be3f1f33f55f3c86c87a76ff65a02f8f5848e

FROM ${NODE_IMAGE} AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM ${NODE_IMAGE} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_AUTH_MODE
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ARG GEOAI_PUBLIC_BUILD_FINGERPRINT
ENV GEOAI_BUILD_TARGET=self_hosted_candidate \
    NEXT_PUBLIC_AUTH_MODE=${NEXT_PUBLIC_AUTH_MODE} \
    NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY} \
    NEXT_PUBLIC_MAPBOX_TOKEN=${NEXT_PUBLIC_MAPBOX_TOKEN} \
    NEXT_PUBLIC_GEOAI_BUILD_FINGERPRINT=${GEOAI_PUBLIC_BUILD_FINGERPRINT}
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN node scripts/self-host-runtime-contract-check.mjs --verify-public-fingerprint \
    && npm run build \
    && test -f .next/standalone/server.js

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN groupadd --system --gid 1001 geoai && useradd --system --uid 1001 --gid geoai --home-dir /nonexistent --shell /usr/sbin/nologin geoai
COPY --from=builder --chown=1001:1001 /app/.next/standalone ./
COPY --from=builder --chown=1001:1001 /app/.next/static ./.next/static
COPY --from=builder --chown=1001:1001 /app/public ./public
USER 1001:1001
EXPOSE 3000
CMD ["node", "server.js"]
