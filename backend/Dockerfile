FROM php:8.4-fpm-alpine

# Install full GNU system tools + PHP extensions (Alpine BusyBox lacks sed -u / findmnt)
RUN apk add --no-cache \
    nginx \
    curl \
    bash \
    coreutils \
    sed \
    util-linux \
    libpq-dev \
    icu-dev \
    libzip-dev \
    zlib-dev \
    oniguruma-dev \
    && docker-php-ext-configure intl \
    && docker-php-ext-install pdo pdo_pgsql intl zip pcntl posix

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY . .

# Install app deps + Heroku PHP nginx boot scripts (full package, not a broken single-file curl)
RUN composer install --no-dev --optimize-autoloader --no-interaction \
    && composer require heroku/heroku-buildpack-php --no-interaction --update-no-dev \
    && chmod +x entrypoint.sh \
    && chown -R www-data:www-data storage bootstrap/cache

# Render expects the web process to listen on 0.0.0.0:10000
ENV PORT=10000
EXPOSE 10000

ENTRYPOINT ["./entrypoint.sh"]
