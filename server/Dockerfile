FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.21.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm prisma generate
RUN pnpm build

ENV NODE_ENV=production

EXPOSE 3001

CMD ["pnpm", "start:prod"]
