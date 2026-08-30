# better-sqlite3는 네이티브 모듈이다. 빌드와 실행을 같은 베이스에서 해야
# prebuilt 바이너리가 맞는다 — alpine(musl)으로 바꾸면 컴파일이 필요해진다.
FROM node:22-bookworm-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 콘텐츠 검증이 여기서 돈다. md와 json이 어긋나면 이미지가 안 만들어진다.
ENV DOCKER_BUILD=1
RUN npm run content:build && npx next build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# SQLite는 볼륨 위에 둔다. 컨테이너가 사라져도 답과 코멘트는 남아야 한다.
ENV STORYTELLER_DB=/data/storyteller.sqlite

RUN useradd --system --create-home --shell /usr/sbin/nologin app \
 && mkdir -p /data && chown app:app /data

COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
# 런타임에 파일로 읽는 것들 — 번들에 들어가지 않는다
COPY --from=builder --chown=app:app /app/content ./content
COPY --from=builder --chown=app:app /app/assets ./assets
COPY --from=builder --chown=app:app /app/db ./db

USER app
EXPOSE 3000
CMD ["node", "server.js"]
