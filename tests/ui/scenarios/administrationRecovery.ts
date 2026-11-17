import { expect } from "@playwright/test";

import { usersSchema } from "../../../src/app/modules/users/api/users.dto";
import { createAdminMock } from "../../../bruno/admin-mock";
import type { UiScenario } from "../uiBrowserFixture";

export async function administrationRecoveryScenario(scenario: UiScenario) {
	await scenario.signIn();
	await checkUserConflict(scenario);
	await checkLostLinkResponse(scenario);
}

async function checkUserConflict({ page, base, api }: UiScenario) {
	const path = "/api/v1/admin/shipment-users";
	const users = usersSchema.parse(api.accountStore.get(path));
	let saves = 0;

	await page.route("**/api/v1/admin/shipment-users/*", (route) => {
		if (route.request().method() !== "PATCH") return route.fallback();

		saves++;

		if (saves > 1) return route.fallback();

		const items = users.items.map((user) => {
			if (user.kind !== "account" || user.name !== "Иван Петров") return user;

			return { ...user, name: "Имя с сервера", revision: 10 };
		});
		api.accountStore.set(path, { ...users, items });

		return route.fulfill({
			status: 409,
			json: { code: "STALE_REVISION", message: "Запись изменилась" },
		});
	});
	await page.goto(`${base}/admin/shipments?tab=users`);

	const row = page.getByRole("row").filter({ hasText: "Иван Петров" });
	await row.getByRole("button", { name: "Изменить доступ" }).click();

	const form = page.getByRole("dialog", { name: "Доступ · Иван Петров" });
	const name = form.getByLabel("Имя");
	const save = form.getByRole("button", { name: "Сохранить пользователя" });

	await name.fill("Локальный черновик");
	await save.click();
	await expect(
		form.getByText("Запись изменилась.", { exact: false }),
	).toBeVisible();
	await expect(save).toBeDisabled();
	await form.getByRole("button", { name: "Повторить" }).click();
	await expect(form.getByText("Имя с сервера", { exact: false })).toBeVisible();
	await expect(name).toHaveValue("Локальный черновик");
	await expect(save).toBeDisabled();
	await form
		.getByRole("button", { name: "Заменить черновик актуальными данными" })
		.click();

	const refreshed = page.getByRole("dialog", {
		name: "Доступ · Имя с сервера",
	});
	await expect(refreshed.getByLabel("Имя")).toHaveValue("Имя с сервера");
	await refreshed.getByLabel("Имя").fill("Согласованное имя");
	await refreshed
		.getByRole("button", { name: "Сохранить пользователя" })
		.click();
	await expect(
		page.getByRole("link", { name: "Согласованное имя" }),
	).toBeVisible();
	expect(saves).toBe(2);
}

async function checkLostLinkResponse({ page, base, api }: UiScenario) {
	const mock = createAdminMock();
	const name = "Ссылка с потерянным ответом";
	let issues = 0;

	await page.route(
		"**/api/v1/admin/warehouses/*/shipment-links",
		async (route) => {
			const request = route.request();
			const method = request.method();
			const response = await mock.handle(
				new Request(request.url(), {
					method,
					headers: request.headers(),
					body: request.postData(),
				}),
				api.accountStore,
			);

			if (!response) return route.fallback();

			if (method === "POST") {
				expect(response.status).toBe(201);
				issues++;

				return route.abort("connectionreset");
			}

			return route.fulfill({
				status: response.status,
				headers: Object.fromEntries(response.headers),
				body: await response.text(),
			});
		},
	);
	await page.goto(
		`${base}/admin/shipments?tab=links&warehouse_id=warehouse-demo`,
	);

	const create = page.getByRole("button", { name: "Создать гостевую ссылку" });
	const editor = page.getByRole("dialog", { name: "Новая гостевая ссылка" });

	await create.click();
	await editor.getByLabel("Название").fill(name);
	await editor.getByRole("checkbox", { name: /ЗК-2087/ }).check();
	await editor.getByRole("button", { name: "Выпустить ссылку" }).click();
	await expect(editor.getByRole("alert").last()).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(editor).toHaveCount(0);
	await page.getByRole("link", { name: "Заказы", exact: true }).click();
	await page
		.getByRole("link", { name: "Гостевые ссылки", exact: true })
		.click();

	const notice = page
		.getByRole("alert")
		.filter({ hasText: "Сервер мог выпустить ссылку" });
	await expect(notice).toBeVisible();
	await expect(create).toBeDisabled();
	await notice.getByRole("button", { name: "Повторить" }).click();
	await expect(page.getByRole("cell", { name, exact: true })).toHaveCount(1);
	await expect(create).toBeDisabled();
	expect(issues).toBe(1);
}
