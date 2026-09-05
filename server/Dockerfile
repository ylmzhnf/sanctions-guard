FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm prisma generate
RUN pnpm run build

EXPOSE 3001

CMD ["pnpm", "run", "start:prod"]
