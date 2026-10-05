# СМП — Перечень плановых проверок

Тестовое задание. Реализация реестра плановых проверок субъектов малого предпринимательства (СМП) с поиском, импортом и экспортом в Excel.

## Стек

| Слой            | Технология                |
| ----------------| ------------------------- |
| Backend         | CodeIgniter 4 (PHP 8.2)   |
| Frontend        | Angular 17 + Bootstrap 5  |
| База данных     | PostgreSQL 16             |
| Excel           | PhpSpreadsheet            |
| Веб-сервер      | Nginx                     |
| Контейнеризация | Docker Compose            |

## Возможности

- Список плановых проверок с фильтрами по поиску, статусу, типу и диапазону дат.
- Пагинация и сортировка по клику на заголовок колонки.
- Создание, редактирование и мягкое удаление (soft delete) проверок.
- Экспорт отфильтрованного реестра в Excel.
- Импорт проверок из Excel с валидацией и полной транзакцией.
- Скачивание шаблона Excel, для использование в качестве образца.
- Автодополнение при выборе СМП (поиск по названию и ИНН).
- Возможность создать нового СМП прямо из формы проверки.
- Адаптивный интерфейс под мобильные устройства.

## Быстрый старт

Требуется установленный Docker Desktop (Windows/macOS) или Docker + Docker Compose (Linux).

```bash
# 1. Клонируйте проект и перейдите в его корень
cd InspectPlan

# 2. Создайте файл окружения
cp .env.example .env

# 3. Соберите Angular (прод-бандл)
docker run --rm -v "$(pwd)/frontend:/app" -w /app node:20-alpine npm run build

# 4. Поднимите контейнеры
docker compose up -d --build

# 5. Накатите миграции и сиды
docker compose exec php php spark migrate
docker compose exec php php spark db:seed DatabaseSeeder

# 6. Откройте приложение
 http://localhost:8080
```

> **PowerShell-версия** (для Windows):
> ```powershell
> Copy-Item .env.example .env
> docker run --rm -v "${PWD}/frontend:/app" -w /app node:20-alpine npm run build
> docker compose up -d --build
> docker compose exec php php spark migrate
> docker compose exec php php spark db:seed DatabaseSeeder
> ```

## Порты

| Сервис         | Порт |
| -------------- | ---- |
| Приложение     | 8080 |
| PostgreSQL     | 5432 |
| Adminer (debug)| 8081 |

Adminer, легковесная веб-панель для управления базами данных, запускается только в профиле `debug`:

```bash
docker compose --profile debug up -d adminer
```

## Полезные команды

```bash
make up           # поднять всё
make down         # остановить всё
make logs         # смотреть логи
make migrate      # накатить миграции
make fresh        # пересоздать схему + сиды
make adminer      # запустить adminer
```

## Документация

- [Инструкция пользователя](docs/user-guide.md)
- [Описание API](docs/api.md)
- [ER-диаграмма](docs/er-diagram.md)
- [Предложения по улучшению](docs/improvements.md)

## Структура проекта

```
.
├── backend/                # CodeIgniter 4
│   ├── app/
│   │   ├── Controllers/Api # REST API
│   │   ├── Database/       # миграции и сиды
│   │   ├── Libraries/      # Excel: экспорт, импорт
│   │   └── Models/         # модели БД
│   └── public/index.php    # точка входа
├── frontend/               # Angular 17
│   └── src/app/
│       ├── core/           # модели и сервисы
│       ├── features/       # страницы (список, форма)
│       └── layout/         # header, модалки, тосты
├── docker/                 # конфиги контейнеров
│   ├── nginx/
│   └── php/
├── docs/                   # документация
└── docker-compose.yml
```

## Переменные окружения

Все ключи окружения лежат в `.env` (см. `.env.example`):

| Переменная    | Значение по умолчанию | Назначение               |
| ------------- | --------------------- | ------------------------ |
| `APP_PORT`    | 8080                  | Наружный порт приложения |
| `ADMINER_PORT`| 8081                  | Порт Adminer             |
| `DB_PORT`     | 5432                  | Порт PostgreSQL          |
| `DB_NAME`     | smp                   | Имя базы                 |
| `DB_USER`     | smp                   | Пользователь БД          |
| `DB_PASSWORD` | smp_secret            | Пароль БД                |
