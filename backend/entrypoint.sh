#!/bin/sh
set -e

export TMPDIR="${TMPDIR:-/tmp}"
export PORT="${PORT:-10000}"
mkdir -p "$TMPDIR" /run/nginx /var/lib/nginx/tmp/client_body /var/tmp/nginx

# Write nginx config for Render's PORT (0.0.0.0:10000 by default)
sed "s/LISTEN_PORT/${PORT}/g" /var/www/html/docker/nginx.conf.template \
  > /etc/nginx/http.d/default.conf

# Ensure php-fpm listens on localhost:9000
sed -i 's|^listen = .*|listen = 127.0.0.1:9000|' /usr/local/etc/php-fpm.d/www.conf || true

# Clear and cache Laravel settings for performance
php artisan config:cache
php artisan route:cache

# Run database migrations automatically on startup
php artisan migrate --force

# Start PHP-FPM execution manager in the background
php-fpm -D

# Start Laravel Reverb in the background on port 8080
php artisan reverb:start --host=127.0.0.1 --port=8080 &

# Start Nginx in the foreground to keep the container running
exec nginx -g 'daemon off;'
