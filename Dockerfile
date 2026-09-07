FROM node:22-bookworm-slim AS build
WORKDIR /app
ARG P1_PUBLIC_ORIGIN
ARG P1_ADMIN_ORIGIN
ARG P1_SOURCE_REVISION
ARG RAILWAY_GIT_COMMIT_SHA
ENV P1_PUBLIC_ORIGIN=$P1_PUBLIC_ORIGIN P1_ADMIN_ORIGIN=$P1_ADMIN_ORIGIN P1_SOURCE_REVISION=$P1_SOURCE_REVISION RAILWAY_GIT_COMMIT_SHA=$RAILWAY_GIT_COMMIT_SHA
ENV BASE_PATH=/ PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@11.19.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile
RUN NODE_ENV=production PORT=4173 pnpm --filter @workspace/p1-website build
RUN pnpm --filter @workspace/p1-website check:images
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=4173 P1_CONTENT_CACHE_DIR=/app/data/cms
COPY --from=build --chown=node:node /app/artifacts/p1-website/dist ./dist
COPY --from=build --chown=node:node /app/artifacts/p1-website/server ./server
COPY --from=build --chown=node:node /app/artifacts/p1-website/config ./config
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 4173
CMD ["node", "server/index.mjs"]
