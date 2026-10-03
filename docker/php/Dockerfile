FROM php:8.2-fpm-alpine

# Системные зависимости + расширения PHP, нужные CI4 и PhpSpreadsheet
RUN apk add --no-cache \
        bash \
        git \
        unzip \
        libzip-dev \
        postgresql-dev \
        oniguruma-dev \
        icu-dev \
        libpng-dev \
        libjpeg-turbo-dev \
        freetype-dev \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        pgsql \
        pdo_pgsql \
        mbstring \
        zip \
        intl \
        gd \
        opcache \
    && apk del .build-deps

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Настройки PHP
COPY php.ini /usr/local/etc/php/conf.d/zz-custom.ini

WORKDIR /var/www/backend

EXPOSE 9000

CMD ["php-fpm"]