FROM php:8.2-apache

RUN apt-get update && apt-get install -y libsqlite3-dev && \
    docker-php-ext-install pdo_sqlite && docker-php-ext-enable pdo_sqlite && \
    rm -rf /var/lib/apt/lists/*

COPY . /var/www/html/

RUN mkdir -p /var/www/html/data && \
    chown -R www-data:www-data /var/www/html/data && \
    chmod 755 /var/www/html/data

RUN a2enmod rewrite

ENV PORT=80
EXPOSE 80
