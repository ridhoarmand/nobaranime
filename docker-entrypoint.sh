#!/bin/sh
set -eu

echo "========================================="
echo "   NobarAnime Unified Container Startup   "
echo "========================================="

# Fallback values if custom API Base URL is optionally provided
TARGET_BASE_URL="${VITE_ANIME_API_BASE_URL:-/api}"
CLIENT_DIR="${CLIENT_DIST_PATH:-/app/client/dist}"

if [ -d "$CLIENT_DIR" ] && [ "$TARGET_BASE_URL" != "RUNTIME_REPLACE_BASE_URL" ]; then
  find "$CLIENT_DIR" -type f \( -name "*.js" -o -name "*.html" \) -exec sed -i "s|RUNTIME_REPLACE_BASE_URL|${TARGET_BASE_URL}|g" {} + 2>/dev/null || true
fi

echo "[NobarAnime] Launching fullstack server on port ${PORT:-8000}..."
exec "$@"
