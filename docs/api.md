# Описание API

Префикс: `/api/v1`. Формат: JSON.

## Формат ответов

Успех: `{ "data": ... }`

Список:
```json
{ "data": [...], "meta": { "total": 42, "page": 1, "per_page": 20, "last_page": 3 } }