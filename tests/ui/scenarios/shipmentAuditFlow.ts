import { expect } from "@playwright/test";

import type { UiScenario } from "../uiBrowserFixture";
import { shipmentExample } from "./shipmentExamples";

export async function checkShipmentAudit({
	page,
	base,
}: Pick<UiScenario, "page" | "base">) {
	let allowed = true;
	await page.route("**/api/v1/admin/shipment-audit?*", async (route) => {
		if (allowed) return route.fallback();

		await route.fulfill({
			status: 403,
			json: { error: { code: "TEST", message: "Тестовая ошибка" } },
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
			json: shipmentExample("Диагностика заказа"),
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
	await expect
		.poll(() => page.evaluate(() => document.documentElement.scrollWidth))
		.toBe(375);
	allowed = false;
	await page.goto(`${base}/admin/shipments`);
	await expect(
		page.getByText("У аккаунта нет доступа к журналу аудита."),
	).toBeVisible();
}
