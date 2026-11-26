# Gridly

Gridly Web — frontend для управления складом. Оператор работает с картой, роботами, каталогом, заказами и остатками в рабочей области склада.

## Локальный запуск

Для локального запуска подходит стабильный Bun 1.4.4. Запустите сервер Gridly на `127.0.0.1:8080` или укажите его адрес в `API_PROXY_TARGET` в `.env.local`.

```sh
bun install --frozen-lockfile
cp .env.example .env.local
bun run dev
```

Для локального мока выполните `bun run mock:prepare`. В Bruno откройте меню рабочих пространств в левом верхнем углу, нажмите **Open workspace** и выберите папку `bruno` с файлом `workspace.yml`. В разделе **Mock Servers** запустите **Gridly API** на порту 4000. Для запросов из коллекции выберите окружение **Mock**. Чтобы подключить к моку фронтенд, выполните `bun run dev:mock`.

## Сборка и размещение

Команда `bun run check` проверяет границы импортов, типы и форматирование, запускает тесты и сборку. Чтобы отформатировать файлы, выполните `bun fmt`.

Соберите приложение и запустите локальный просмотр.

```sh
bun run build
bun run preview
```

Для Docker адрес API можно указать через `--build-arg VITE_API_BASE_URL=/api/v1`. По умолчанию используется `/api/v1`.

## Клиентский кабинет отгрузок

Для проверки изменения пользователей и гостевых ссылок запустите в отдельных терминалах:

```sh
bun run mock:api
bun run dev:mock
```

## Тесты

- `bun run test` запускает тесты логики, хуков, REST-адаптеров и компонентов. Компонентные тесты с React Testing Library проверяют результаты действий по доступным ролям и меткам.
- `bun run test:ui` запускает браузерные интеграционные сценарии с локальным Vite и подменой API. Для одного сценария задайте `GRIDLY_UI_SCENARIO`, например `GRIDLY_UI_SCENARIO=route-recovery bun run test:ui`.
- `bun run test:coverage` записывает покрытие строк и функций Bun в `coverage/lcov.info`. `bun run test:coverage:branches` записывает покрытие ветвей тестами Bun в `coverage/bun-branches.json`. `bun run test:coverage:browser` записывает покрытие строк и ветвей Chromium в `coverage/chromium.json`. Отчёты учитывают загруженные модули. Отчёт Chromium сопоставляет исполненный JavaScript с исходниками Vite.
- `bun run test:e2e` запускает шесть сценариев Chromium на развернутом тестовом Gridly без подмены API. Браузер устанавливается командой `bunx playwright install chromium`.

Для E2E задайте `GRIDLY_E2E_URL` с адресом тестового фронтенда, `GRIDLY_E2E_LOGIN` и `GRIDLY_E2E_PASSWORD` тестового оператора, `GRIDLY_E2E_WAREHOUSE_ID` склада и `GRIDLY_E2E_PRODUCT` с уникальным названием товара, который есть в остатках. У аккаунта должно быть право создавать входящие черновики. Сценарий создания сохраняет в тестовом складе один черновик с уникальным контрагентом. Для просмотра списка сценариев используйте `bun run test:e2e --list`.
