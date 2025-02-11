# For more information about this file, visit https://pnpm.io/pt/docker
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# https://github.com/nodejs/corepack
RUN corepack enable

FROM base AS build
COPY . /api
WORKDIR /api/subsystem/api
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install -r --offline --frozen-lockfile
RUN pnpm run build

FROM base AS prod
WORKDIR /api/subsystem/api
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /api/
COPY --from=build /api/subsystem/api/package.json /api/subsystem/api/package.json
COPY --from=build /api/subsystem/api/dist /api/subsystem/api/dist
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install -r --prod

EXPOSE 3000
CMD [ "node", "dist/server.js" ]