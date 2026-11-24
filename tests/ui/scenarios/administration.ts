import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function administrationScenario({
	page,
	base,
	signIn,
}: UiScenario) {
	await signIn();
	await page.goto(`${base}/admin/shipments?tab=warehouses`);
	const north = page.getByRole("row").filter({ hasText: "Северный склад" });
	await north.getByRole("button", { name: "Настройки для склада" }).click();
	const settings = page.getByRole("dialog", {
		name: "Настройки склада: Северный склад",
	});
	const draft = settings.getByRole("textbox", {
		name: "Название склада",
		exact: true,
	});
	await expect(draft).toHaveValue("Северный склад");
	await draft.fill("Несохранённый черновик");
	await page.keyboard.press("Escape");
	await expect(settings).toHaveCount(0);
	await north
		.getByRole("link", { name: "Северный склад", exact: true })
		.click();
	await page.getByRole("link", { name: "Настройки", exact: true }).click();
	await expect(page).toHaveURL(/\/warehouses\/warehouse-north\/settings$/);
	await expect(
		page.getByRole("heading", { name: "Настройки склада", exact: true }),
	).toBeVisible();
	await expect(settings).toHaveCount(0);
	await expect(
		page.getByRole("textbox", { name: "Название склада", exact: true }),
	).toHaveValue("Северный склад");
	await page.goto(`${base}/admin/shipments?tab=warehouses`);

	await north.getByRole("link", { name: "Заказы" }).click();
	await page.getByRole("textbox", { name: "Поиск по заказам" }).fill("3101");
	await expect(
		page.getByRole("table", { name: "Заказы склада" }).getByRole("row"),
	).toHaveCount(2);
	await page.getByRole("link", { name: "ЗК-3101" }).click();
	await expect(page.getByRole("dialog")).toContainText("Балтийская доставка");
	await expect(page).toHaveURL(
		/\/admin\/shipments\?tab=orders&warehouse_id=warehouse-north/,
	);
	await page.keyboard.press("Escape");
	await expect(
		page.getByRole("textbox", { name: "Поиск по заказам" }),
	).toHaveValue("3101");

	await page.goto(`${base}/admin/shipments?tab=users`);
	const operator = page.getByRole("row").filter({ hasText: "Иван Петров" });
	await operator.getByRole("button", { name: "Изменить доступ" }).click();
	const userForm = page.getByRole("dialog", { name: "Доступ · Иван Петров" });
	await userForm.getByLabel("Имя").fill("Иван Соколов");
	await userForm
		.getByRole("combobox", { name: "Склад для настройки доступа" })
		.click();
	await page.getByRole("option", { name: /Северный склад/ }).click();
	await userForm
		.getByRole("group", { name: "Северный склад" })
		.getByRole("checkbox", { name: "Просмотр склада" })
		.check();
	await userForm
		.getByRole("button", { name: "Сохранить пользователя" })
		.click();
	await expect(page.getByRole("link", { name: "Иван Соколов" })).toBeVisible();

	await page
		.getByRole("link", { name: "Гостевые ссылки", exact: true })
		.click();
	await page.getByRole("button", { name: "Создать гостевую ссылку" }).click();
	const issue = page.getByRole("dialog", { name: "Новая гостевая ссылка" });
	await issue.getByLabel("Название").fill("Доступ для клиента");
	await issue.getByRole("button", { name: "Выпустить ссылку" }).click();
	await expect(issue.getByRole("alert")).toContainText("хотя бы один заказ");
	await issue.getByRole("checkbox", { name: /ЗК-2087/ }).check();
	await issue.getByRole("checkbox", { name: /ЗК-2079/ }).check();
	await issue.getByRole("checkbox", { name: "Этапы заказа" }).check();
	const expiration = await issue.getByLabel("Действует до (UTC)").inputValue();
	const preciseExpiration = `${expiration}:59.999Z`;
	const guestLinksApi = "**/api/v1/admin/warehouses/*/shipment-links";
	await page.route(guestLinksApi, (route) => {
		const request = route.request();

		if (request.method() !== "POST") return route.fallback();

		return route.fallback({
			postData: JSON.stringify({
				...request.postDataJSON(),
				expires_at: preciseExpiration,
			}),
		});
	});
	const preview = issue.getByRole("region", { name: "Предпросмотр доступа" });
	await expect(preview).toContainText("Этапы заказа");
	await expect(preview).not.toContainText("Документы");
	await issue.getByRole("button", { name: "Выпустить ссылку" }).click();
	const urlField = page.getByRole("textbox", { name: "Гостевая ссылка" });
	await expect(urlField).toHaveValue(/\/shipments#token=/);
	const guestUrl = await urlField.inputValue();
	await page.unroute(guestLinksApi);
	const guest = await page.context().newPage();
	try {
		await guest.goto(guestUrl);
		await expect(
			guest.getByRole("heading", { name: "Заказ ЗК-2087" }),
		).toBeVisible();
		await expect(
			guest.getByRole("heading", { name: "Этапы заказа" }),
		).toBeVisible();
		await expect(guest.getByRole("heading", { name: "Документы" })).toHaveCount(
			0,
		);
		await guest.getByRole("combobox", { name: "Заказ", exact: true }).click();
		await guest.getByRole("option", { name: "ЗК-2079", exact: true }).click();
		await expect(
			guest.getByRole("heading", { name: "Заказ ЗК-2079" }),
		).toBeVisible();

		await page
			.getByRole("button", { name: /^Изменить гостевую ссылку:/ })
			.click();
		const edit = page.getByRole("dialog", { name: "Изменить гостевую ссылку" });
		await expect(edit.getByLabel("Название")).toHaveValue("Доступ для клиента");
		await edit.getByRole("checkbox", { name: /ЗК-2079/ }).uncheck();
		await edit.getByRole("checkbox", { name: "Документы" }).check();
		await expect(
			edit.getByRole("region", { name: "Предпросмотр доступа" }),
		).toContainText("Документы");
		const [update] = await Promise.all([
			page.waitForRequest(
				(request) =>
					request.method() === "PATCH" &&
					request.url().includes("/shipment-links/"),
			),
			edit.getByRole("button", { name: "Сохранить доступ" }).click(),
		]);
		expect(update.postDataJSON()).toMatchObject({
			expires_at: preciseExpiration,
		});
		await expect(edit).toHaveCount(0);
		await guest.getByRole("button", { name: "Обновить" }).click();
		await expect(
			guest.getByRole("heading", { name: "Заказ ЗК-2087" }),
		).toBeVisible();
		await expect(
			guest.getByRole("heading", { name: "Документы" }),
		).toBeVisible();

		await page
			.getByRole("button", { name: /^Удалить гостевую ссылку:/ })
			.click();
		await page
			.getByRole("button", { name: "Удалить ссылку", exact: true })
			.click();
		await expect(
			page.getByRole("cell", { name: "Отозвана", exact: true }),
		).toBeVisible();
		await guest.getByRole("button", { name: "Обновить" }).click();
		await expect(guest.getByText("Заказ недоступен")).toBeVisible();

		await page.getByRole("button", { name: "Создать гостевую ссылку" }).click();
		await issue.getByLabel("Название").fill("Короткий доступ");
		const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
		await issue
			.getByLabel("Действует до (UTC)")
			.fill(tomorrow.toISOString().slice(0, 16));
		await issue.getByRole("checkbox", { name: /ЗК-2079/ }).check();
		await issue.getByRole("button", { name: "Выпустить ссылку" }).click();
		await expect(issue).toHaveCount(0);
		const links = page.getByRole("table", { name: "Ссылки склада" });
		await expect(
			links.getByRole("link", { name: "ЗК-2079", exact: true }),
		).toBeVisible();
		await links.getByRole("button", { name: "Период действия" }).click();
		const orderNumbers = links.getByRole("link", { name: /^ЗК-20(79|87)$/ });
		await expect(orderNumbers).toHaveText(["ЗК-2079", "ЗК-2087"]);
	} finally {
		await guest.close();
	}

	await page.goto(`${base}/admin/shipments?tab=users`);
	const updatedOperator = page
		.getByRole("row")
		.filter({ hasText: "Иван Соколов" });
	let deleteAttempts = 0;
	await page.route("**/api/v1/admin/shipment-users/*", (route) => {
		if (route.request().method() !== "DELETE") return route.fallback();

		deleteAttempts += 1;

		if (deleteAttempts > 1) return route.fallback();

		return route.fulfill({
			status: 409,
			json: {
				code: "STALE_REVISION",
				message: "Данные пользователя изменились",
			},
		});
	});
	await updatedOperator
		.getByRole("button", { name: /^Деактивировать аккаунт:/ })
		.click();
	const removal = page.getByRole("dialog", { name: "Деактивировать аккаунт?" });
	const confirm = removal.getByRole("button", {
		name: "Деактивировать аккаунт",
	});
	await confirm.click();
	await expect(confirm).toHaveCount(0);
	await removal
		.getByRole("button", { name: "Обновить данные пользователя" })
		.click();
	await expect(confirm).toBeEnabled();
	expect(deleteAttempts).toBe(1);
	await confirm.click();
	await expect(removal).toHaveCount(0);
	await expect(updatedOperator).toHaveCount(0);
	expect(deleteAttempts).toBe(2);
}
