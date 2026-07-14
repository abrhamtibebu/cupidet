FROM php:8.4-fpm-alpine

# Native nginx + php-fpm with PostgreSQL (Neon) support
# postgresql-dev is needed to compile; libpq must remain at runtime
RUN apk add --no-cache \
        nginx \
        curl \
        bash \
        libpq \
        icu-libs \
        libzip \
        oniguruma \
        zlib \
    && apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        postgresql-dev \
        icu-dev \
        libzip-dev \
        oniguruma-dev \
        zlib-dev \
    && docker-php-ext-configure pgsql --with-pgsql=/usr \
    && docker-php-ext-configure intl \
    && docker-php-ext-install -j"$(nproc)" pdo pdo_pgsql pgsql intl zip pcntl posix \
    && apk del --no-network .build-deps \
    && rm -f /etc/nginx/http.d/default.conf \
    && mkdir -p /run/nginx /var/lib/nginx/tmp \
    && php -r 'exit(extension_loaded("pdo_pgsql") ? 0 : 1);' \
    && php -m | grep -i pdo_pgsql

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction \
    && chmod +x entrypoint.sh \
    && chown -R www-data:www-data storage bootstrap/cache

ENV PORT=10000
EXPOSE 10000

ENTRYPOINT ["./entrypoint.sh"]
