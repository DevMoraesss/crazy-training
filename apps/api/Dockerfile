# Imagem da API. O contexto é a raiz do repositório, porque a API depende de packages/shared:
#   docker build -f apps/api/Dockerfile -t crazy-training-api .

FROM node:24-alpine AS base
WORKDIR /repo
# Primeiro só os package.json: a camada do npm ci só é refeita quando as dependências mudam.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
COPY packages/shared/package.json packages/shared/

FROM base AS build
RUN npm ci -w @crazy-training/api -w @crazy-training/shared
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @crazy-training/shared && npm run build -w @crazy-training/api

FROM base AS prod-deps
RUN npm ci --omit=dev -w @crazy-training/api -w @crazy-training/shared

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=prod-deps /repo/node_modules node_modules
COPY --from=build /repo/packages/shared/package.json packages/shared/
COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY --from=build /repo/apps/api/package.json apps/api/
COPY --from=build /repo/apps/api/dist apps/api/dist
WORKDIR /repo/apps/api
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
