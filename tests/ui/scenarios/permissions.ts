import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function permissionsScenario({
	api,
	page,
	ready,
	signIn,
}: UiScenario) {
	await signIn();
	api.readOnly = true;
	await ready("catalog");
	await expect(
		page.getByRole("button", { name: "Товар", exact: true }),
	).toBeDisabled();
	await page.getByRole("button", { name: "Товар", exact: true }).hover();
	const tooltip = page
		.locator("[data-warm-tooltip]")
		.filter({ hasText: "Создание недоступно" });
	await expect(tooltip).toBeVisible();
	await tooltip.hover();
	await expect(tooltip).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(tooltip).toHaveCount(0);
	await ready("catalog");
	await page.keyboard.press("Tab");
	await page.getByRole("button", { name: "Товар", exact: true }).focus();
	await expect(tooltip).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(tooltip).toHaveCount(0);
	api.readOnly = false;
	api.offlineData = true;
	await page.reload();
	await expect(page.getByRole("alert")).toContainText(
		"Сервис временно недоступен",
	);
	api.offlineData = false;
	await page.getByRole("button", { name: "Повторить", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "Товар", exact: true }),
	).toBeEnabled();

	await ready("map");
	const warehouse = /\/api\/v1\/warehouses\/warehouse-demo(?:\?.*)?$/;
	await page.route(warehouse, (route) =>
		route.fulfill({
			status: 403,
			json: { error: { message: "Доступ к складу отозван" } },
		}),
	);
	await expect(page.getByText("Склад недоступен", { exact: true })).toBeVisible(
		{
			timeout: 10000,
		},
	);
	await expect(page.locator("[data-map-workspace]")).toHaveCount(0);

	await page.unroute(warehouse);
	await page.getByRole("button", { name: "Повторить", exact: true }).click();
	await expect(page.locator("[data-map-workspace]")).toBeVisible();
	await page.route("**/warehouses/warehouse-demo/categories?*", (route) =>
		route.fulfill({
			status: 403,
			json: { error: { message: "Доступ к каталогу отозван" } },
		}),
	);
	await expect(
		page.getByText("Доступ к разделу закрыт", { exact: true }),
	).toBeVisible({ timeout: 10000 });
	await expect(page.locator("[data-map-workspace]")).toHaveCount(0);
}
