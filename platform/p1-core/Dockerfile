FROM node:22-bookworm-slim AS build
WORKDIR /app
ARG P1_PUBLIC_ORIGIN
ARG P1_ADMIN_ORIGIN
ARG P1_SOURCE_REVISION
ARG RAILWAY_GIT_COMMIT_SHA
ENV P1_PUBLIC_ORIGIN=$P1_PUBLIC_ORIGIN P1_ADMIN_ORIGIN=$P1_ADMIN_ORIGIN P1_SOURCE_REVISION=$P1_SOURCE_REVISION RAILWAY_GIT_COMMIT_SHA=$RAILWAY_GIT_COMMIT_SHA
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN node script/p1-manifest-config.mjs config/p1-client-site-manifest.json
RUN npm run check && npm run build
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=5000 CLIENT_SITE_MANIFEST_PATH=/app/dist/config/p1-client-site-manifest.json
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build --chown=node:node /app/dist ./dist
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 5000
CMD ["node", "dist/index.cjs"]
