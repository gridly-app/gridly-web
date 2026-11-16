import { expect } from "@playwright/test";
import { loadWorkspaceSamples } from "../../../bruno/mock-fixture";
import type { UiScenario } from "../uiBrowserFixture";

export async function warehouseReportScenario({
	page,
	ready,
	signIn,
}: UiScenario) {
	const now = new Date("2026-11-14T12:00:00Z");
	const { store } = await loadWorkspaceSamples(now.getTime());
	const ordersPath = "/api/v1/warehouses/warehouse-demo/orders";
	await page.clock.setFixedTime(now);
	await page.route(`**${ordersPath}?*`, (route) =>
		route.fulfill({ json: store.get(ordersPath) }),
	);

	await signIn();
	await ready("information");
	await expect(
		page.getByRole("region", { name: "Динамика поставок и отгрузок" }),
	).toBeVisible();
	await expect(
		page.getByRole("region", { name: "Распределение статусов заказов" }),
	).toBeVisible();
	await expect(
		page.getByRole("region", {
			name: "Доступные и зарезервированные остатки",
		}),
	).toBeVisible();
	await expect(
		page.getByRole("region", { name: "Остатки по категориям" }),
	).toBeVisible();
	const operations = page.getByRole("region", {
		name: "Операции за выбранный период",
	});
	await page.setViewportSize({ width: 1100, height: 900 });
	const badge = operations
		.locator('[data-slot="status-badge"]')
		.filter({
			hasText: "Ждёт подтверждения",
		})
		.first();
	await expect(badge).toBeVisible();
	const overflow = await badge.evaluate((element) => {
		const bounds = element.getBoundingClientRect();
		const range = document.createRange();
		range.selectNodeContents(element);
		return Array.from(range.getClientRects())
			.filter(
				(rect) =>
					rect.left < bounds.left ||
					rect.right > bounds.right ||
					rect.top < bounds.top ||
					rect.bottom > bounds.bottom,
			)
			.map((rect) => ({ text: rect.toJSON(), badge: bounds.toJSON() }));
	});
	expect(overflow).toEqual([]);

	const download = page.waitForEvent("download");
	await page.getByRole("button", { name: "Выгрузить CSV" }).click();
	expect((await download).suggestedFilename()).toContain(
		"gridly-warehouse-demo-",
	);
	await page
		.locator("summary")
		.filter({ hasText: "Период и дополнительные фильтры" })
		.click();
	await page.getByLabel("С", { exact: true }).fill("2025-01-01");
	await page.getByLabel("По", { exact: true }).fill("2025-01-02");

	await expect(
		page.getByText("Нет операций за выбранный период.", { exact: true }),
	).toBeVisible();
}
