FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
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
