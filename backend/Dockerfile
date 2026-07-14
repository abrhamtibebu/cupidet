FROM php:8.4-fpm-alpine

# Native nginx + php-fpm (no Heroku boot scripts — Alpine-incompatible)
RUN apk add --no-cache \
    nginx \
    curl \
    bash \
    libpq-dev \
    icu-dev \
    libzip-dev \
    zlib-dev \
    oniguruma-dev \
    && docker-php-ext-configure intl \
    && docker-php-ext-install pdo pdo_pgsql intl zip pcntl posix \
    && rm -f /etc/nginx/http.d/default.conf \
    && mkdir -p /run/nginx /var/lib/nginx/tmp

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction \
    && chmod +x entrypoint.sh \
    && chown -R www-data:www-data storage bootstrap/cache

ENV PORT=10000
EXPOSE 10000

ENTRYPOINT ["./entrypoint.sh"]
