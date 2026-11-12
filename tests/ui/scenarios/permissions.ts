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
	console.log("PASS permissions and API retry");
}
