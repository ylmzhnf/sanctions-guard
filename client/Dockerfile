FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

RUN pnpm run build
CMD ["pnpm", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]