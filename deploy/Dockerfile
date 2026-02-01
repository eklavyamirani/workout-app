## syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
ARG VITE_DEPLOYMENT_MODE=production
ENV DEPLOYMENT_MODE=$VITE_DEPLOYMENT_MODE
RUN npm run build

FROM nginx:1.25-alpine
WORKDIR /usr/share/nginx/html
RUN adduser -D -H -u 1000 appuser \
  && chown -R appuser:appuser /usr/share/nginx /var/cache/nginx /etc/nginx/conf.d \
  && touch /var/run/nginx.pid \
  && chown appuser:appuser /var/run/nginx.pid \
  && apk add --no-cache curl
COPY --from=build /app/dist .
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -fsSL http://127.0.0.1:4173/ -o /dev/null || exit 1
USER appuser
CMD ["nginx", "-g", "daemon off;"]
