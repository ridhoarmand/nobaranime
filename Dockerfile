# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy project files
COPY . .

# Set placeholder environment variables for runtime replacement
ENV VITE_ANIME_API_BASE_URL="RUNTIME_REPLACE_BASE_URL"
ENV VITE_ANIME_API_KEY="RUNTIME_REPLACE_API_KEY"
ENV VITE_SUPABASE_URL="RUNTIME_REPLACE_SUPABASE_URL"
ENV VITE_SUPABASE_PUBLISHABLE_KEY="RUNTIME_REPLACE_SUPABASE_PUBLISHABLE_KEY"
ENV VITE_SUPABASE_COOKIE_DOMAIN=".idho.eu.org"
ENV VITE_SUPABASE_STORAGE_KEY="nobar-shared-auth-token"

# Build the project
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy the built assets to Nginx html folder
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration to support Single Page Application (React Router)
RUN echo "server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files \$uri \$uri/ /index.html; \
    } \
}" > /etc/nginx/conf.d/default.conf

# Create an entrypoint script to replace placeholders with dynamic environment variables at runtime
RUN echo '#!/bin/sh' > /docker-entrypoint-custom.sh && \
    echo 'set -eu' >> /docker-entrypoint-custom.sh && \
    echo '' >> /docker-entrypoint-custom.sh && \
    echo '# Backward compatibility for old variable name' >> /docker-entrypoint-custom.sh && \
    echo 'if [ -z "${VITE_SUPABASE_PUBLISHABLE_KEY:-}" ] && [ -n "${VITE_SUPABASE_ANON_KEY:-}" ]; then' >> /docker-entrypoint-custom.sh && \
    echo '  VITE_SUPABASE_PUBLISHABLE_KEY="${VITE_SUPABASE_ANON_KEY}"' >> /docker-entrypoint-custom.sh && \
    echo 'fi' >> /docker-entrypoint-custom.sh && \
    echo '' >> /docker-entrypoint-custom.sh && \
    echo '# Fail fast with clear error if required runtime envs are missing' >> /docker-entrypoint-custom.sh && \
    echo 'required_vars="VITE_ANIME_API_BASE_URL VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY"' >> /docker-entrypoint-custom.sh && \
    echo 'for var in $required_vars; do' >> /docker-entrypoint-custom.sh && \
    echo '  eval "value=\${$var:-}"' >> /docker-entrypoint-custom.sh && \
    echo '  if [ -z "$value" ]; then' >> /docker-entrypoint-custom.sh && \
    echo '    echo "[entrypoint] Missing required env: $var" >&2' >> /docker-entrypoint-custom.sh && \
    echo '    exit 1' >> /docker-entrypoint-custom.sh && \
    echo '  fi' >> /docker-entrypoint-custom.sh && \
    echo 'done' >> /docker-entrypoint-custom.sh && \
    echo '' >> /docker-entrypoint-custom.sh && \
    echo 'find /usr/share/nginx/html/assets -type f -name "*.js" -exec sed -i "s|RUNTIME_REPLACE_BASE_URL|${VITE_ANIME_API_BASE_URL}|g" {} +' >> /docker-entrypoint-custom.sh && \
    echo 'find /usr/share/nginx/html/assets -type f -name "*.js" -exec sed -i "s|RUNTIME_REPLACE_API_KEY|${VITE_ANIME_API_KEY}|g" {} +' >> /docker-entrypoint-custom.sh && \
    echo 'find /usr/share/nginx/html/assets -type f -name "*.js" -exec sed -i "s|RUNTIME_REPLACE_SUPABASE_URL|${VITE_SUPABASE_URL}|g" {} +' >> /docker-entrypoint-custom.sh && \
    echo 'find /usr/share/nginx/html/assets -type f -name "*.js" -exec sed -i "s|RUNTIME_REPLACE_SUPABASE_PUBLISHABLE_KEY|${VITE_SUPABASE_PUBLISHABLE_KEY}|g" {} +' >> /docker-entrypoint-custom.sh && \
    echo 'exec "$@"' >> /docker-entrypoint-custom.sh && \
    chmod +x /docker-entrypoint-custom.sh

# Add curl for healthcheck
RUN apk add --no-cache curl

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint-custom.sh"]
CMD ["nginx", "-g", "daemon off;"]
