FROM php:8.4-fpm-alpine

# Install system dependencies and PHP extensions required by Laravel / Neon
RUN apk add --no-cache nginx curl bash libpq-dev icu-dev libzip-dev oniguruma-dev \
    && docker-php-ext-install pdo pdo_pgsql pcntl posix intl zip

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY . .

# Install app deps, then the Heroku PHP nginx boot scripts (full package)
RUN composer install --no-dev --optimize-autoloader --no-interaction \
    && composer require heroku/heroku-buildpack-php --no-interaction --update-no-dev \
    && chmod +x entrypoint.sh \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 10000
ENTRYPOINT ["./entrypoint.sh"]
