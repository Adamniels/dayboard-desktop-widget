# Display (wall kiosk) frontend: build the Vite SPA, serve the static bundle with nginx.
# VITE_API_URL is a COMPILE-TIME value baked into the bundle, so it is passed as a build
# arg here (from .env.prod via docker-compose.prod.yml). Change it -> rebuild this image.
FROM node:22-slim AS build
RUN corepack enable && corepack prepare pnpm@10.6.5 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @dayboard/display build

FROM nginx:alpine
COPY apps/display/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/display/dist /usr/share/nginx/html
EXPOSE 80
