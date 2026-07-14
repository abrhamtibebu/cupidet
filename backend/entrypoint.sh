#!/bin/sh

# Alpine / busybox: ensure mktemp has a valid temp dir
export TMPDIR="${TMPDIR:-/tmp}"
mkdir -p "$TMPDIR"

# Render expects Nginx to bind 0.0.0.0:$PORT (default 10000)
export PORT="${PORT:-10000}"

# Ensure necessary Nginx running directories exist inside Alpine
mkdir -p /var/lib/nginx/tmp/client_body
mkdir -p /var/tmp/nginx
chmod -R 777 /var/lib/nginx
chmod -R 777 /var/tmp

# Start Laravel Reverb in the background on port 8080
php artisan reverb:start --host=127.0.0.1 --port=8080 &

# Start the main Nginx Web Server (Composer-installed Heroku boot script)
exec vendor/bin/heroku-php-nginx -C render.conf public/
