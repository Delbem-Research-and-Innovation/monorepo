# For more information about this file, visit https://pnpm.io/pt/docker
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# https://github.com/nodejs/corepack
RUN npm i -g corepack@latest

FROM base AS build
COPY . /website
WORKDIR /website/subsystem/website
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install -r --offline --frozen-lockfile --force
RUN pnpm run build

FROM base AS prod
WORKDIR /website/subsystem/website
COPY --from=build /website/subsystem/website/package.json ./package.json
COPY --from=build /website/subsystem/website/.next/ ./.next
COPY --from=build /website/subsystem/website/.env ./.env
COPY --from=build /website/subsystem/website/public ./public
COPY --from=build /website/subsystem/website/simple4decision-ff5d296826c0.json ./simple4decision-ff5d296826c0.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install -r --prod

EXPOSE 3000

ENV PORT=3000

ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]