.PHONY: help up down logs ps sh sh-node db migrate seed fresh adminer build-frontend

## Справка по командам
help:
	@echo "Доступные команды:"
	@echo "  make up              — поднять все контейнеры (с пересборкой)"
	@echo "  make down            — остановить и удалить контейнеры"
	@echo "  make logs            — стрим логов"
	@echo "  make ps              — статус контейнеров"
	@echo "  make sh              — shell в php-контейнере"
	@echo "  make sh-node         — shell в node-контейнере"
	@echo "  make db              — psql в контейнере БД"
	@echo "  make migrate         — накатить миграции"
	@echo "  make seed            — накатить сиды"
	@echo "  make fresh           — пересоздать схему + сиды"
	@echo "  make adminer         — запустить Adminer (профиль debug)"
	@echo "  make build-frontend  — собрать Angular (production)"

## Запуск / остановка
up:
	docker compose up -d --build

down:
	docker compose down

## Диагностика
logs:
	docker compose logs -f

ps:
	docker compose ps

## Shell-доступ
sh:
	docker compose exec php sh

sh-node:
	docker compose run --rm node sh

## База данных
db:
	docker compose exec db psql -U smp -d smp

## Миграции и сиды
migrate:
	docker compose exec php php spark migrate

seed:
	docker compose exec php php spark db:seed DatabaseSeeder

fresh:
	docker compose exec php php spark migrate:refresh --all
	docker compose exec php php spark db:seed DatabaseSeeder

## Adminer
adminer:
	docker compose --profile debug up -d adminer

## Сборка фронтенда
build-frontend:
	docker compose run --rm node npm run build