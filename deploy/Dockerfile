## syntax=docker/dockerfile:1
# Frontend image: environment-agnostic static bundle served by nginx.
# No domains, API URLs or OIDC identifiers are baked in — deployments mount
# /usr/share/nginx/html/runtime-config.json instead.
FROM --platform=$BUILDPLATFORM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine

# Numeric non-root user; the image must run with a read-only root filesystem, so all
# writable paths (pid file, temp paths) live under tmpfs mounts.
RUN addgroup -g 10001 -S app \
  && adduser -S -D -H -u 10001 -G app app \
  && rm -f /etc/nginx/conf.d/default.conf

COPY deploy/nginx-main.conf /etc/nginx/nginx.conf
COPY deploy/nginx-site.conf /etc/nginx/conf.d/site.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 4173

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:4173/health || exit 1

USER 10001:10001
STOPSIGNAL SIGQUIT
CMD ["nginx", "-g", "daemon off;"]
