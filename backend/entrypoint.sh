#!/bin/sh

# Start Laravel Reverb in the background on port 8080
php artisan reverb:start --host=127.0.0.1 --port=8080 &

# Start the main Nginx Web Server (from Heroku PHP buildpack package)
exec vendor/bin/heroku-php-nginx -C render.conf public/
