# Инструкция по запуску

## Требования

- **Docker Desktop** (Windows/macOS) или **Docker + Docker Compose** (Linux).
- Свободные порты: `8080` (приложение), `5432` (PostgreSQL), `8081` (Adminer, опционально).

Проверить, что Docker установлен:

```bash
docker --version
docker compose version
```

Обе команды должны вернуть версию `2.x` или выше.

## Шаги запуска

Откройте терминал в корне проекта и выполните по порядку.

### 1. Создайте файл окружения

**Linux / macOS:**
```bash
cp .env.example .env
```

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

### 2. Соберите фронтенд

**Linux / macOS:**
```bash
docker run --rm -v "$(pwd)/frontend:/app" -w /app node:20-alpine npm run build
```

**Windows (PowerShell):**
```powershell
docker run --rm -v "${PWD}/frontend:/app" -w /app node:20-alpine npm run build
```

Идёт 30–60 секунд. По завершении в `frontend/dist/frontend/browser/` появятся `index.html` и скомпилированные файлы.

### 3. Поднимите контейнеры

```bash
docker compose up -d --build
```

Первый запуск — 2–4 минуты (собирается образ PHP).

Проверьте статус:

```bash
docker compose ps
```

Все три сервиса (`db`, `php`, `nginx`) должны быть `Up`, БД — `healthy`.

### 4. Накатите миграции и сиды

```bash
docker compose exec php php spark migrate
docker compose exec php php spark db:seed DatabaseSeeder
```

Создадутся таблицы `smp` и `inspection`, зальются 1000 СМП и 50 проверок.

### 5. Откройте приложение

**http://localhost:8080**

## Что попробовать

1. **Список** — открывается автоматически, 50 записей, пагинация снизу.
2. **Фильтры** — введите «Прокуратура» в поиск, выберите статус «Завершена», нажмите «Найти».
3. **Сортировка** — клик по заголовку колонки «Начало» или «СМП».
4. **Экспорт** — кнопка «Экспорт в Excel» скачает отфильтрованные записи.
5. **Шаблон** — кнопка «Шаблон Excel» скачает шаблон для импорта.
6. **Импорт** — заполните шаблон, нажмите «Импорт из Excel». Если ИНН не найден — весь файл откатится, вы увидите ошибки построчно.
7. **Добавление** — кнопка «Добавить проверку». СМП ищется через автокомплит (введите 2+ символа).
8. **Создание СМП** — в форме нажмите «+ СМП».
9. **Редактирование** — карандаш в строке таблицы.
10. **Удаление** — корзина в строке, подтверждение в модалке. Запись исчезает из списка, но остаётся в БД (soft delete).
11. **Мобильный вид** — откройте DevTools, включите mobile view. Таблица превратится в карточки.

## Дополнительно: Adminer (просмотр БД)

Запускается по требованию:

```bash
docker compose --profile debug up -d adminer
```

**http://localhost:8081**  
System: PostgreSQL, Server: `db`, Username: `smp`, Password: `smp_secret`, Database: `smp`.

## Остановка

```bash
docker compose down
```

## Полный сброс (включая БД)

```bash
docker compose down -v
```

После этого повторите шаги 3–4.

## Возможные проблемы

**Порт 8080 занят.**  
Откройте `.env`, замените `APP_PORT=8080` на свободный (например, 8090) и перезапустите:

```bash
docker compose down
docker compose up -d
```

**`docker compose up` падает на этапе build.**  
Проверьте, что Docker Desktop запущен. Если вы на Windows — перезапустите Docker Desktop.

**На `http://localhost:8080` пустая страница.**  
Скорее всего, не выполнен шаг 2 (сборка фронтенда). Повторите его и перезапустите nginx:

```bash
docker compose restart nginx
```

**Миграции не накатываются, «connection refused».**  
Дождитесь, пока БД станет `healthy` (`docker compose ps`), потом повторите.

**Ошибка про `host.docker.internal`.**  
Возникает только в режиме разработки (`ng serve`), для продакшена не актуально. Инструкция для проверяющего — только шаги 1–5.