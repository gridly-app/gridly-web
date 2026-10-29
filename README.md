# Gridly

Frontend-приложение для управления складом.

## Локальный запуск

Требуется Bun 1.4.3.

```sh
bun install --frozen-lockfile
cp .env.example .env.local
bun run dev
```

## Production

```sh
bun run build
```

Сборка создаётся в `dist/`. Для локального просмотра production-сборки используйте `bun run preview`.

## Проверки

```sh
bun run check
```

Команда запускает проверку типов, Biome, unit-тесты и production-сборку.

## Серверное демо

Песочница работает через общий REST API с отдельной анонимной демосессией. Контракт, обязанности бэкенда и сценарии проверки описаны в [исследовании серверного демо](docs/research/server-demo.md).
