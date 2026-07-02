# Admin (control) frontend: build the Vite SPA, serve the static bundle with nginx.
# Both VITE_API_URL and VITE_DISPLAY_URL are COMPILE-TIME values baked into the bundle,
# so they are passed as build args (from .env.prod). Change either -> rebuild this image.
FROM node:22-slim AS build
RUN corepack enable && corepack prepare pnpm@10.6.5 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
ARG VITE_API_URL
ARG VITE_DISPLAY_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DISPLAY_URL=$VITE_DISPLAY_URL
RUN pnpm --filter @dayboard/admin build

FROM nginx:alpine
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
