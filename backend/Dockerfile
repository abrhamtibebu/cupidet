FROM php:8.2-fpm-alpine

# Install system dependencies and PHP extensions for PostgreSQL
RUN apk add --no-cache nginx curl libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql

# Get Heroku's PHP boot scripts (used natively by Render)
RUN curl -s https://githubusercontent.com -o /usr/local/bin/heroku-php-nginx \
    && chmod +x /usr/local/bin/heroku-php-nginx

WORKDIR /var/www/html
COPY . .

# Install Composer dependencies
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
RUN composer install --no-dev --optimize-autoloader

# Make entrypoint executable
RUN chmod +x entrypoint.sh

EXPOSE 10000
ENTRYPOINT ["./entrypoint.sh"]
