# ---- build stage (pinned Node 20; host Node 24 can break react-scripts 5) ----
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY public ./public
COPY src ./src
ARG REACT_APP_FLASK_URI
ARG REACT_APP_WEATHER_API_KEY
ARG INLINE_RUNTIME_CHUNK
ENV REACT_APP_FLASK_URI=$REACT_APP_FLASK_URI \
    REACT_APP_WEATHER_API_KEY=$REACT_APP_WEATHER_API_KEY \
    INLINE_RUNTIME_CHUNK=$INLINE_RUNTIME_CHUNK
RUN npm run build

# ---- runtime stage (static via nginx) ----
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY frontend-nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
