import { expect } from "@playwright/test";
import {
	loadMockRoutes,
	loadWorkspaceSamples,
} from "../../../bruno/mock-fixture";
import type { UiScenario } from "../uiBrowserFixture";

const fixture = { routes: await loadMockRoutes() };
function example(name: string) {
	const data = fixture.routes.find((route) => route.name === name)?.response
		.body?.data;
	if (!data) throw new Error(`Missing Bruno response: ${name}`);
	return JSON.parse(data);
}

export async function shipmentsScenario({ page, base, signIn }: UiScenario) {
	const guest = example("Снимок отгрузки");
	const working = example("Рабочий снимок отгрузки");
	let status = 200;
	const errors = { error: { code: "TEST", message: "Тестовая ошибка" } };
	await page.route("**/api/v1/public/shipments", async (route) => {
		expect(route.request().headers().authorization).toBe(
			"Bearer bruno-shipment-guest-token",
		);
		expect(route.request().headers().cookie).toBeUndefined();
		await route.fulfill({ status, json: status === 200 ? guest : errors });
	});
	await page.route("**/api/v1/public/shipments/documents/**", async (route) => {
		expect(route.request().headers().authorization).toBe(
			"Bearer bruno-shipment-guest-token",
		);
		await route.fulfill({
			body: "sample",
			headers: {
				"Content-Type": "text/plain",
				"Content-Disposition": "attachment; filename=sample.txt",
			},
		});
	});
	await page.setViewportSize({ width: 390, height: 820 });
	await page.goto(`${base}/shipments#token=bruno-shipment-guest-token`);
	await expect(
		page.getByRole("heading", { name: "Заказ ЗК-2087" }),
	).toBeVisible();
	await expect(page.locator('[aria-current="step"]')).toContainText(
		"Передан перевозчику",
	);
	expect(
		await page.evaluate(() => document.documentElement.scrollWidth),
	).toBeLessThanOrEqual(390);
	await page.getByRole("combobox", { name: "Группировка" }).click();
	await page.getByRole("option", { name: "По неделям" }).click();
	await page
		.getByRole("button", { name: "Факт за 2026-11-09, шт." })
		.press("Enter");
	await expect(page.getByRole("dialog")).toContainText("52743106");
	await expect(page.getByRole("dialog")).toContainText("А123ВС 77");
	await page
		.getByRole("dialog")
		.getByRole("button", { name: "Закрыть", exact: true })
		.click();
	await expect(page.getByRole("dialog")).toHaveCount(0);
	const [csv] = await Promise.all([
		page.waitForEvent("download"),
		page.getByRole("button", { name: "Скачать CSV" }).click(),
	]);
	expect(csv.suggestedFilename()).toBe("gridly-shipments.csv");
	const [file] = await Promise.all([
		page.waitForEvent("download"),
		page.getByRole("button", { name: "Скачать Накладная" }).click(),
	]);
	expect(file.suggestedFilename()).toBe("sample.txt");
	status = 503;
	await page.getByRole("button", { name: "Обновить" }).click();
	await expect(page.getByText("Данные могли устареть")).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Заказ ЗК-2087" }),
	).toBeVisible();
	status = 404;
	await page.getByRole("button", { name: "Повторить" }).click();
	await expect(page.getByText("Заказ недоступен")).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Заказ ЗК-2087" }),
	).toHaveCount(0);

	await page.setViewportSize({ width: 1440, height: 1000 });
	await signIn();
	const orderPath = "/warehouses/warehouse-demo/orders/order-out-2087/shipment";
	let issued = false;
	await page.route(`**/api/v1${orderPath}`, async (route) => {
		expect(route.request().headers().authorization).toMatch(/^Bearer /);
		if (route.request().method() === "PUT") {
			const body = route.request().postDataJSON();
			expect(body.revision).toBe(working.revision);
			expect(body.priority).toBe("normal");
			working.revision++;
			working.warehouse.priority = body.priority;
		}
		await route.fulfill({ json: working });
	});
	const trackingUrl = `${base}/warehouses/warehouse-demo/deliveries?order=order-out-2087`;
	await page.getByRole("link", { name: "Доставки", exact: true }).click();
	await expect(
		page.getByRole("heading", { name: "Доставки", exact: true }),
	).toBeVisible();
	const delivery = page.getByRole("region", { name: "Этапы доставки" });
	await page.goto(trackingUrl);
	await expect(delivery.locator('[aria-current="step"]')).toContainText(
		"Передан перевозчику",
	);
	await expect(delivery.locator('[data-state="pending"]').last()).toContainText(
		"Доставлен или получен",
	);
	const routeDetails = page.getByRole("region", { name: "Маршрут" });
	await expect(routeDetails.getByText("Адрес погрузки")).toBeVisible();
	await expect(routeDetails.getByText("Адрес выгрузки")).toBeVisible();
	await expect(routeDetails.locator("dd").nth(0)).toHaveText(
		"Центральный склад, Москва, ул. Складочная, 1",
	);
	await expect(routeDetails.locator("dd").nth(1)).toHaveText(
		"Казань, ул. Техническая, 17",
	);
	await expect(routeDetails.locator("dl > div").first()).toHaveCSS(
		"border-top-width",
		"0px",
	);
	const orderSelect = page.getByRole("combobox", { name: "Заказ на доставку" });
	await expect(orderSelect).toHaveText("ЗК-2087 · Интернет-заказ #2087");
	const orderSelectSize = async () => {
		const box = await orderSelect.boundingBox();
		return { width: box?.width, height: box?.height };
	};
	const originalSize = await orderSelectSize();
	await page.route(
		"**/api/v1/warehouses/warehouse-demo/orders/*/shipment",
		(route) =>
			route.request().url().endsWith(orderPath)
				? route.fallback()
				: route.fulfill({ status: 404 }),
	);
	await orderSelect.click();
	await page.getByRole("option", { name: "ЗК-2079 · ИП Волкова" }).click();
	await expect(orderSelect).toHaveText("ЗК-2079 · ИП Волкова");
	expect(await orderSelectSize()).toEqual(originalSize);
	await orderSelect.click();
	await page
		.getByRole("option", { name: "ЗК-2087 · Интернет-заказ #2087" })
		.click();
	const inboundPath =
		"/warehouses/warehouse-demo/orders/order-in-1042/shipment";
	const { store } = await loadWorkspaceSamples();
	await page.route(`**/api/v1${inboundPath}`, (route) =>
		route.fulfill({ json: store.get(`/api/v1${inboundPath}`) }),
	);
	await orderSelect.click();
	await page.getByRole("option", { name: /ПР-1042/ }).click();
	await expect(routeDetails.locator("dd").nth(0)).toHaveText(
		"Тверь, Промышленный проезд, 8",
	);
	await expect(routeDetails.locator("dd").nth(1)).toHaveText(
		"Центральный склад, Москва, ул. Складочная, 1",
	);
	await expect(delivery.getByText("Подготовка у поставщика")).toBeVisible();
	await orderSelect.click();
	await page.getByRole("option", { name: /ЗК-2087/ }).click();
	const orderDetails = page.getByRole("region", { name: /^Стоимость:/ });
	await expect(orderDetails.getByRole("heading")).toHaveText(
		/^Стоимость: 4\s270,00\s₽$/,
	);
	await expect(orderDetails).not.toContainText("Интернет-заказ #2087");
	const items = orderDetails.getByRole("table", { name: "Состав заказа" });
	await expect(items.getByRole("row", { name: /Кофе в зёрнах/ })).toContainText(
		"2 шт.",
	);
	await expect(
		items.getByRole("row", { name: /Лампа настольная/ }),
	).toContainText("1 шт.");
	await page.setViewportSize({ width: 390, height: 820 });
	await expect(orderSelect).toBeVisible();
	expect(
		await orderSelect
			.locator('[data-slot="select-value"]')
			.evaluate((value) => value.scrollWidth <= value.clientWidth),
	).toBe(true);
	await page.setViewportSize({ width: 1440, height: 1000 });

	const previousState = working.order.state;
	const previousRoute = working.route;
	working.route = null;
	working.order.state = "delivered";
	await page.reload();
	await expect(delivery.locator('[data-state="completed"]')).toHaveCount(7);
	await expect(delivery.locator('[aria-current="step"]')).toHaveCount(0);
	await expect(
		routeDetails.getByText("Не указан", { exact: true }),
	).toBeVisible();
	working.order.state = previousState;
	working.route = previousRoute;

	await page.route(`**/api/v1${orderPath}/share-link`, async (route) => {
		if (route.request().method() === "DELETE") {
			working.share_link = null;
			await route.fulfill({ status: 204 });
			return;
		}
		expect(route.request().headers()["idempotency-key"]).toBeTruthy();
		const expires_at = route.request().postDataJSON().expires_at;
		working.share_link = { expires_at };
		issued = true;
		await route.fulfill({
			status: 201,
			json: { expires_at, url: `${base}/shipments#token=issued-token` },
		});
	});
	await page.route(`**/api/v1${orderPath}/documents`, async (route) => {
		expect(route.request().headers()["content-type"]).toContain(
			"multipart/form-data; boundary=",
		);
		expect(route.request().postData()).toContain("sample.txt");
		const document = {
			...working.documents[0],
			id: "new-document",
			name: "Тестовый файл",
			published: false,
		};
		working.documents.push(document);
		await route.fulfill({ status: 201, json: document });
	});
	await page.route(
		`**/api/v1${orderPath}/documents/new-document`,
		async (route) => {
			const document = working.documents.find(
				(row: { id: string }) => row.id === "new-document",
			);
			document.published = route.request().postDataJSON().published;
			await route.fulfill({ json: document });
		},
	);
	await page.goto(
		`${base}/warehouses/warehouse-demo/outbound/order-out-2087/shipment`,
	);
	await expect(
		page.getByRole("heading", { name: "Отгрузка · ЗК-2087" }),
	).toBeVisible();
	await page.getByRole("combobox", { name: "Складской приоритет" }).click();
	await page.getByRole("option", { name: "Обычный", exact: true }).click();
	await page.getByRole("button", { name: "Сохранить отгрузку" }).click();
	await expect(page.getByText("Изменения сохранены.")).toBeVisible();
	await page.getByRole("button", { name: "Перевыпустить ссылку" }).click();
	await page.getByRole("button", { name: "Подтвердить" }).click();
	await expect(page.getByLabel("Ссылка для клиента")).toHaveValue(
		`${base}/shipments#token=issued-token`,
	);
	expect(issued).toBe(true);
	await page.getByRole("button", { name: "Отозвать ссылку" }).click();
	await page.getByRole("button", { name: "Подтвердить" }).click();
	await expect(page.getByText("Действующей ссылки нет.")).toBeVisible();
	await page.getByLabel("Название", { exact: true }).fill("Тестовый файл");
	await page.getByLabel("Файл", { exact: true }).setInputFiles({
		name: "sample.txt",
		mimeType: "text/plain",
		buffer: Buffer.from("sample"),
	});
	await page.getByRole("button", { name: "Загрузить документ" }).click();
	const row = page.getByRole("row").filter({ hasText: "Тестовый файл" });
	await row.getByRole("button", { name: "Опубликовать", exact: true }).click();
	await expect(
		row.getByRole("button", { name: "Снять с публикации" }),
	).toBeVisible();

	let allowed = true;
	await page.route("**/api/v1/admin/shipment-audit?*", async (route) => {
		await route.fulfill({
			status: allowed ? 200 : 403,
			json: allowed ? example("Журнал аудита") : errors,
		});
	});
	await page.route("**/api/v1/admin/shipment-audit/export?*", async (route) => {
		await route.fulfill({
			body: "id,result\nshipment-audit-1,success",
			headers: { "Content-Type": "text/csv" },
		});
	});
	await page.route("**/api/v1/admin/shipment-system?*", async (route) => {
		await route.fulfill({
			json: example("Диагностика заказа"),
		});
	});
	await page.getByRole("button", { name: "Меню профиля" }).click();
	await page
		.getByRole("menuitem", { name: "Администрирование", exact: true })
		.click();
	await expect(
		page.getByText("Документ опубликован", { exact: true }),
	).toBeVisible();
	const [audit] = await Promise.all([
		page.waitForEvent("download"),
		page.getByRole("button", { name: "Скачать аудит в CSV" }).click(),
	]);
	expect(audit.suggestedFilename()).toBe("gridly-shipment-audit.csv");
	await page
		.getByRole("row")
		.filter({ hasText: "Документ опубликован" })
		.getByRole("link", { name: "Диагностика заказа ЗК-2087", exact: true })
		.click();
	await expect(
		page.getByRole("heading", { name: "Заказ ЗК-2087" }),
	).toBeVisible();
	await page.getByRole("link", { name: "Журнал аудита", exact: true }).click();
	const search = page.getByRole("textbox", { name: "Поиск по аудиту" });
	await search.fill("  документ   опубилкован   смирнова  ");
	await expect(page.getByText("Найдено событий: 1")).toBeVisible();
	await expect(
		page.getByText("Отгрузка просмотрена", { exact: true }),
	).toHaveCount(0);
	const auditTable = page.getByRole("table", { name: "События аудита" });
	await expect(auditTable).not.toContainText(/warehouse-demo|T12:16:00Z/);
	await auditTable.getByRole("link", { name: "Анна Смирнова" }).click();
	await expect(page.getByText("Найдено пользователей: 1")).toBeVisible();
	await page.getByRole("link", { name: "Показать всех пользователей" }).click();
	const users = page.getByRole("table", { name: "Доступ пользователей" });
	await expect(users.getByRole("link", { name: "Иван Петров" })).toBeVisible();
	const anna = users.getByRole("row").filter({ hasText: "Анна Смирнова" });
	await expect(
		anna.getByRole("link", { name: "Центральный склад" }),
	).toBeVisible();
	await expect(
		anna.getByRole("link", { name: "Северный склад" }),
	).toBeVisible();
	await expect(anna.getByText("Разрешений: 1", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Фильтры", exact: true }).click();
	await page.getByRole("combobox", { name: "Тип доступа" }).click();
	await page
		.getByRole("option", { name: "Гость по ссылке", exact: true })
		.click();
	await expect(page.getByText("Найдено пользователей: 1")).toBeVisible();
	await expect(users.getByText("Действует", { exact: true })).toBeVisible();
	await users
		.getByRole("button", { name: "Пользователь", exact: true })
		.click();
	await expect(
		users.getByRole("columnheader", { name: "Пользователь" }),
	).toHaveAttribute("aria-sort", "descending");
	await page.setViewportSize({ width: 375, height: 900 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
		375,
	);
	allowed = false;
	await page.goto(`${base}/admin/shipments`);
	await expect(
		page.getByText("У аккаунта нет доступа к журналу аудита."),
	).toBeVisible();
}
