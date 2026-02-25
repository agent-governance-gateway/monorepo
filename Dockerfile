# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY packages/*/package.json ./packages/
COPY apps/example-basic/package.json ./apps/example-basic/
RUN pnpm install

FROM deps AS build
COPY . .
RUN pnpm build

FROM node:20-alpine AS runtime
RUN corepack enable
WORKDIR /app/apps/example-basic
ENV NODE_ENV=production

COPY --from=build /app /app

EXPOSE 3100
CMD ["pnpm", "exec", "tsx", "index.ts"]
