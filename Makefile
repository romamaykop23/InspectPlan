.PHONY: up down logs ps sh sh-node db migrate seed fresh admin build-frontend

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f

ps:
	docker compose ps

sh:
	docker compose exec php sh

sh-node:
	docker compose run --rm node sh

db:
	docker compose exec db psql -U $${DB_USER} -d $${DB_NAME}

admin:
	docker compose --profile debug up -d admin

migrate:
	docker compose exec php php spark migrate

seed:
	docker compose exec php php spark db:seed DatabaseSeeder

fresh:
	docker compose exec php php spark migrate:refresh --all
	docker compose exec php php spark db:seed DatabaseSeeder

build-frontend:
	docker compose exec php true  # заглушка, заменим позже