#!/bin/sh
set -e

export TMPDIR="${TMPDIR:-/tmp}"
export PORT="${PORT:-10000}"
mkdir -p "$TMPDIR" /run/nginx /var/lib/nginx/tmp/client_body /var/tmp/nginx

# Render binds to 0.0.0.0:$PORT — write nginx config from template
sed "s/LISTEN_PORT/${PORT}/g" /var/www/html/docker/nginx.conf.template \
  > /etc/nginx/http.d/default.conf

# Ensure php-fpm listens on localhost:9000
sed -i 's|^listen = .*|listen = 127.0.0.1:9000|' /usr/local/etc/php-fpm.d/www.conf || true

# Start Laravel Reverb in the background
php artisan reverb:start --host=127.0.0.1 --port=8080 &

# Start PHP-FPM in the background
php-fpm -D

# Foreground Nginx (keeps the container alive)
exec nginx -g 'daemon off;'
