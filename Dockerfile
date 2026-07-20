FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.6.0 --activate

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./

# Copy packages
COPY packages/types ./packages/types
COPY packages/constants ./packages/constants
COPY packages/validation ./packages/validation
COPY packages/utils ./packages/utils
COPY packages/config ./packages/config
COPY services/core ./services/core
COPY services/api ./services/api

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Build packages
RUN pnpm build --filter=@vestara/types --filter=@vestara/constants --filter=@vestara/validation --filter=@vestara/utils --filter=@vestara/config
RUN pnpm build --filter=@vestara/core
RUN pnpm build --filter=@vestara/api

EXPOSE 3000

CMD ["node", "services/api/dist/index.js"]
