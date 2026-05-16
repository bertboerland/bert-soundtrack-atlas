# Build stage ----------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps with cache-friendly layer
COPY package.json bun.lock* package-lock.json* ./
RUN npm install --no-audit --no-fund

# Source + build
COPY . .

# Run ingest if data/ files are present (silently skip otherwise).
RUN if ls data/Streaming_History_Audio_*.json >/dev/null 2>&1; then \
      npm run ingest; \
    else \
      echo "↻ no data/ files present at build — frontend will fall back to mock data"; \
    fi

RUN npm run build

# Runtime stage --------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Strip default site, install our config tuned for /spotify26/ subpath.
RUN rm /etc/nginx/conf.d/default.conf
COPY deploy/nginx.conf /etc/nginx/conf.d/spotify26.conf

# Copy built static assets
COPY --from=builder /app/dist /usr/share/nginx/html/spotify26

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
