## syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
ARG VITE_PORT=4173
ARG VITE_DEPLOYMENT_MODE=production
ENV PORT=$VITE_PORT
ENV DEPLOYMENT_MODE=$VITE_DEPLOYMENT_MODE
RUN npm run build

FROM nginx:1.25-alpine
WORKDIR /usr/share/nginx/html
RUN adduser -D -H -u 1000 appuser \
  && chown -R appuser:appuser /usr/share/nginx /var/cache/nginx /var/run /etc/nginx/conf.d
COPY --from=build /app/dist .
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
ENV PORT=4173
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O- http://127.0.0.1:${PORT}/health || exit 1
USER appuser
CMD ["nginx", "-g", "daemon off;"]
