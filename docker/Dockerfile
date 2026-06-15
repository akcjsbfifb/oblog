FROM node:20-alpine

RUN apk add --no-cache git openssh-client

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN apk add --no-cache --virtual .build-deps python3 make g++ && \
    pnpm install --prod --frozen-lockfile && \
    apk del .build-deps

COPY src ./src

RUN mkdir -p /app/data /app/vault

VOLUME ["/app/vault", "/app/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
