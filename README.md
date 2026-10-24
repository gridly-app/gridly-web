# Gridly

Frontend-приложение для управления складом.

## Локальный запуск

```sh
bun install
cp .env.example .env.local
bun run dev
```

Для запуска интерфейса с локальными демо-данными без backend:

```sh
bun run dev:demo
```

## Проверки и сборка

```sh
bun run test
bun run lint
bun run format
bun run biome
bun run build
bun run check
```