FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_PORT=4173
ARG VITE_DEPLOYMENT_MODE=production
ENV PORT=$VITE_PORT
ENV DEPLOYMENT_MODE=$VITE_DEPLOYMENT_MODE
RUN npm run build

FROM nginx:1.25-alpine
WORKDIR /usr/share/nginx/html
COPY --from=build /app/dist .
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
ENV PORT=4173
EXPOSE 4173
CMD ["nginx", "-g", "daemon off;"]
