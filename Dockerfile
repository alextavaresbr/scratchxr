FROM node:24-bookworm-slim AS builder
WORKDIR /app/site
COPY site/package.json site/package-lock.json ./
RUN npm ci
COPY site/ ./
RUN npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/site
COPY --from=builder --chown=node:node /app/site/build ./build
COPY --from=builder --chown=node:node /app/site/build-server ./build-server
COPY --from=builder --chown=node:node /app/site/voices ./voices
RUN mkdir -p /app/site/.cache && chown node:node /app/site/.cache
USER node
EXPOSE 3000
CMD ["node", "build-server/server.mjs"]
