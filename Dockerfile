FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production
ENV BASE_PATH=/
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

COPY . .

RUN pnpm install --frozen-lockfile
RUN PORT=4173 BASE_PATH=/ pnpm --filter @workspace/p1-website build

CMD ["pnpm", "--filter", "@workspace/p1-website", "serve"]
